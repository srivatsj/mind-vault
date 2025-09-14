#!/bin/bash

set -e

echo "🧹 Starting Mind-Vault cleanup process..."

# Load environment variables
if [ -f .env ]; then
    source .env
else
    echo "❌ Error: .env file not found. Please make sure you're running this from the project root."
    exit 1
fi

# Check required environment variables
check_env_vars() {
    local missing_vars=()

    if [ -z "$DATABASE_URL" ]; then
        missing_vars+=("DATABASE_URL")
    fi

    if [ -z "$BLOB_READ_WRITE_TOKEN" ]; then
        missing_vars+=("BLOB_READ_WRITE_TOKEN")
    fi

    if [ ${#missing_vars[@]} -ne 0 ]; then
        echo "❌ Error: Missing required environment variables:"
        printf '   - %s\n' "${missing_vars[@]}"
        exit 1
    fi
}

# Function to prompt for confirmation
confirm_action() {
    local message="$1"
    echo "⚠️  $message"
    read -p "Are you sure you want to continue? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "❌ Operation cancelled."
        exit 1
    fi
}

# Neon Database Cleanup
cleanup_neon_db() {
    echo "🗄️  Starting Neon database cleanup..."

    # Confirm database cleanup
    confirm_action "This will TRUNCATE ALL DATA from your database tables. This action is IRREVERSIBLE!"

    echo "📊 Discovering database schema..."

    # Get all user tables with their foreign key dependencies
    local temp_sql=$(mktemp)

    # Create a comprehensive cleanup script that discovers tables dynamically
    cat > "$temp_sql" << 'EOF'
-- Get all user tables with their dependency order
WITH RECURSIVE table_deps AS (
  -- Start with tables that have no incoming foreign keys (leaf tables)
  SELECT
    schemaname,
    tablename,
    0 as level
  FROM pg_tables
  WHERE schemaname = 'public'
    AND NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints tc
      JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
      WHERE tc.constraint_type = 'FOREIGN KEY'
        AND kcu.table_schema = 'public'
        AND kcu.table_name = pg_tables.tablename
    )

  UNION ALL

  -- Recursively find tables that depend on already processed tables
  SELECT
    pt.schemaname,
    pt.tablename,
    td.level + 1
  FROM pg_tables pt
  JOIN information_schema.table_constraints tc ON tc.table_name = pt.tablename
  JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
  JOIN information_schema.constraint_column_usage ccu ON tc.constraint_name = ccu.constraint_name
  JOIN table_deps td ON td.tablename = ccu.table_name
  WHERE pt.schemaname = 'public'
    AND tc.constraint_type = 'FOREIGN KEY'
    AND tc.table_schema = 'public'
    AND td.level < 10 -- Prevent infinite recursion
),
ordered_tables AS (
  SELECT DISTINCT
    tablename,
    MAX(level) as max_level
  FROM table_deps
  GROUP BY tablename
  ORDER BY max_level DESC, tablename
)

-- Generate truncate commands
SELECT 'TRUNCATE TABLE "' || tablename || '" CASCADE;' as truncate_cmd
FROM ordered_tables
WHERE tablename NOT IN ('spatial_ref_sys', 'geography_columns', 'geometry_columns') -- Exclude system tables
ORDER BY max_level DESC;
EOF

    echo "Generating dynamic truncate commands..."

    # Execute the discovery query and generate truncate commands
    local truncate_commands=$(psql "$DATABASE_URL" -t -f "$temp_sql" 2>/dev/null | grep -v '^$' | sed 's/^[ \t]*//')

    if [ -z "$truncate_commands" ]; then
        echo "⚠️  No tables found or unable to generate truncate commands. Falling back to manual approach..."

        # Fallback: Use information_schema to get all tables
        truncate_commands=$(psql "$DATABASE_URL" -t -c "
          SELECT 'TRUNCATE TABLE \"' || table_name || '\" CASCADE;'
          FROM information_schema.tables
          WHERE table_schema = 'public'
            AND table_type = 'BASE TABLE'
            AND table_name NOT IN ('spatial_ref_sys', 'geography_columns', 'geometry_columns')
          ORDER BY table_name;
        " 2>/dev/null | grep -v '^$' | sed 's/^[ \t]*//')
    fi

    if [ -n "$truncate_commands" ]; then
        echo "📋 Found tables to truncate:"
        echo "$truncate_commands" | sed 's/TRUNCATE TABLE "/  - /' | sed 's/" CASCADE;//'
        echo ""

        # Create final cleanup script
        local final_sql=$(mktemp)
        cat > "$final_sql" << EOF
-- Truncate all discovered tables (CASCADE handles foreign key constraints)
$truncate_commands

-- Show table counts after cleanup
SELECT
  t.table_name,
  COALESCE(s.n_tup_ins, 0) as "Total Rows"
FROM information_schema.tables t
LEFT JOIN pg_stat_user_tables s ON t.table_name = s.relname
WHERE t.table_schema = 'public'
  AND t.table_type = 'BASE TABLE'
  AND t.table_name NOT IN ('spatial_ref_sys', 'geography_columns', 'geometry_columns')
ORDER BY t.table_name;
EOF

        echo "🧹 Executing cleanup..."
        psql "$DATABASE_URL" -f "$final_sql"
        local exit_code=$?

        # Cleanup temp files
        rm -f "$temp_sql" "$final_sql"

        if [ $exit_code -eq 0 ]; then
            echo "✅ Database cleanup completed successfully!"
        else
            echo "❌ Database cleanup failed!"
            exit 1
        fi
    else
        echo "❌ Could not discover database tables. Please check your database connection."
        rm -f "$temp_sql"
        exit 1
    fi
}

# Vercel Blob Storage Cleanup
cleanup_vercel_blobs() {
    echo "📦 Starting Vercel Blob storage cleanup..."

    # Confirm blob cleanup
    confirm_action "This will DELETE ALL BLOBS from your Vercel Blob storage. This action is IRREVERSIBLE!"

    # Check if Node.js is available
    if ! command -v node >/dev/null 2>&1; then
        echo "❌ Error: Node.js is not installed. Please install Node.js to use blob cleanup."
        echo "   Download from: https://nodejs.org/"
        return 1
    fi

    # Check if the blob cleanup helper script exists
    local blob_cleanup_script="scripts/blob-cleanup.mjs"
    if [ ! -f "$blob_cleanup_script" ]; then
        echo "❌ Error: Blob cleanup helper script not found at $blob_cleanup_script"
        return 1
    fi

    # Make sure @vercel/blob is installed
    if [ ! -d "node_modules/@vercel/blob" ]; then
        echo "📦 Installing @vercel/blob dependency..."
        npm install @vercel/blob
        if [ $? -ne 0 ]; then
            echo "❌ Failed to install @vercel/blob package!"
            return 1
        fi
    fi

    # Run the Node.js blob cleanup script
    echo "🚀 Running blob cleanup..."
    BLOB_READ_WRITE_TOKEN="$BLOB_READ_WRITE_TOKEN" node "$blob_cleanup_script"

    if [ $? -eq 0 ]; then
        echo "✅ Blob cleanup completed successfully!"
    else
        echo "❌ Blob cleanup failed!"
        return 1
    fi
}

# Main execution
main() {
    # Check if we're in the right directory
    if [ ! -f "package.json" ]; then
        echo "❌ Error: Please run this script from the project root directory."
        exit 1
    fi

    # Check dependencies
    check_env_vars

    # Check if psql is available
    if ! command -v psql >/dev/null 2>&1; then
        echo "❌ Error: psql is not installed. Please install PostgreSQL client tools."
        echo "   Ubuntu/Debian: sudo apt-get install postgresql-client"
        echo "   macOS: brew install postgresql"
        exit 1
    fi

    echo "🔍 Environment check passed!"
    echo "📍 Database: $(echo $DATABASE_URL | sed 's/:[^@]*@/@[HIDDEN]@/')"
    echo "📍 Blob Token: ${BLOB_READ_WRITE_TOKEN:0:10}..."
    echo ""

    # Ask what to cleanup
    echo "What would you like to clean up?"
    echo "1) Database only"
    echo "2) Blob storage only"
    echo "3) Both database and blob storage"
    echo "4) Exit"
    echo ""

    read -p "Choose an option (1-4): " -n 1 -r choice
    echo ""

    case $choice in
        1)
            cleanup_neon_db
            ;;
        2)
            cleanup_vercel_blobs
            ;;
        3)
            cleanup_neon_db
            echo ""
            cleanup_vercel_blobs
            ;;
        4)
            echo "👋 Cleanup cancelled."
            exit 0
            ;;
        *)
            echo "❌ Invalid option selected."
            exit 1
            ;;
    esac

    echo ""
    echo "🎉 Cleanup process completed successfully!"
    echo "ℹ️  You may want to restart your development server if it's running."
}

# Run main function
main "$@"
