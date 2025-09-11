# Database Setup - Drizzle ORM with PostgreSQL

## Overview

Mind-vault uses Drizzle ORM with PostgreSQL (Neon) for type-safe database operations. Drizzle provides excellent TypeScript integration, performance, and developer experience while maintaining full SQL control.

> **Architecture Reference**: Part of the data layer defined in [Technical Design](./design.md)

## Technology Stack

### Database Platform
- **PostgreSQL on Neon**: Serverless PostgreSQL with automatic scaling
- **Drizzle ORM**: Type-safe database toolkit for TypeScript
- **Drizzle Kit**: Schema management and migration tools

### Configuration Files
- `drizzle.config.ts`: Drizzle configuration and connection settings
- `src/db/schema.ts`: Database schema definitions
- `src/db/index.ts`: Database connection and client setup

## Database Schema

### Core Tables

**User Management** (managed by BetterAuth):
```typescript
export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("emailVerified").notNull().default(false),
  image: text("image"),
  createdAt: timestamp("createdAt").notNull(),
  updatedAt: timestamp("updatedAt").notNull()
});
```

**Video Processing**:
```typescript
export const videoSummary = pgTable("video_summary", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  youtubeUrl: text("youtube_url").notNull(),
  youtubeId: text("youtube_id").notNull(),
  title: text("title").notNull(),
  description: text("description"),
  channelName: text("channel_name"),
  duration: integer("duration"),
  thumbnailUrl: text("thumbnail_url"),
  processingStatus: text("processing_status", { 
    enum: ["pending", "processing", "completed", "failed"] 
  }).default("pending").notNull(),
  processingError: text("processing_error"),
  aiGeneratedContent: json("ai_generated_content"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull()
});
```

**Content Organization**:
```typescript
export const tag = pgTable("tag", {
  id: text("id").primaryKey(),
  name: text("name").notNull().unique(),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow().notNull()
});

export const category = pgTable("category", {
  id: text("id").primaryKey(),
  name: text("name").notNull().unique(),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow().notNull()
});
```

**Video Analysis**:
```typescript
export const keyframe = pgTable("keyframe", {
  id: text("id").primaryKey(),
  videoSummaryId: text("video_summary_id").notNull().references(() => videoSummary.id, { onDelete: "cascade" }),
  timestamp: integer("timestamp").notNull(),
  imageUrl: text("image_url").notNull(),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow().notNull()
});
```

### Relationships

**Many-to-Many Relationships**:
```typescript
export const videoSummaryTag = pgTable("video_summary_tag", {
  videoSummaryId: text("video_summary_id").notNull().references(() => videoSummary.id, { onDelete: "cascade" }),
  tagId: text("tag_id").notNull().references(() => tag.id, { onDelete: "cascade" })
}, (table) => ({
  pk: primaryKey({ columns: [table.videoSummaryId, table.tagId] })
}));

export const videoSummaryCategory = pgTable("video_summary_category", {
  videoSummaryId: text("video_summary_id").notNull().references(() => videoSummary.id, { onDelete: "cascade" }),
  categoryId: text("category_id").notNull().references(() => category.id, { onDelete: "cascade" })
}, (table) => ({
  pk: primaryKey({ columns: [table.videoSummaryId, table.categoryId] })
}));
```

## DAO Pattern Implementation

### Data Access Object Structure

```typescript
export class VideoSummaryDao {
  // Create operations
  static async create(input: CreateVideoSummaryInput): Promise<string> {
    const summaryId = nanoid();
    await db.insert(videoSummary).values({
      id: summaryId,
      ...input,
      processingStatus: "pending",
    });
    return summaryId;
  }

  // Read operations with user scoping
  static async findById(id: string, userId: string): Promise<VideoSummary | null> {
    const results = await db
      .select()
      .from(videoSummary)
      .where(
        and(
          eq(videoSummary.id, id),
          eq(videoSummary.userId, userId)
        )
      );
    return results[0] || null;
  }

  // Update operations
  static async updateProcessingStatus(
    id: string, 
    status: ProcessingStatus, 
    error?: string
  ): Promise<void> {
    await db
      .update(videoSummary)
      .set({
        processingStatus: status,
        processingError: error,
        updatedAt: new Date()
      })
      .where(eq(videoSummary.id, id));
  }
}
```

## Database Configuration

### Connection Setup

**File**: `src/db/index.ts`
```typescript
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

const connectionString = process.env.DATABASE_URL!;
const client = postgres(connectionString);
export const db = drizzle(client, { schema });
```

**File**: `drizzle.config.ts`
```typescript
import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
});
```

## Development Workflow

### Schema Management Commands

```bash
# Push schema changes to database (development)
npm run db:push

# Generate migration files (production)
npm run db:generate

# Apply migrations (production)
npm run db:migrate

# Open Drizzle Studio (database browser)
npm run db:studio
```

### Environment Variables

```bash
# Database connection
DATABASE_URL=postgresql://username:password@host:port/database

# For Neon (recommended)
DATABASE_URL=postgresql://user:pass@ep-xxx.us-east-1.aws.neon.tech/neondb?sslmode=require
```

## Type Safety Features

### Generated Types
Drizzle automatically generates TypeScript types from schema:

```typescript
// Inferred types from schema
type VideoSummary = typeof videoSummary.$inferSelect;
type CreateVideoSummary = typeof videoSummary.$inferInsert;

// Use in DAO methods
static async create(input: CreateVideoSummary): Promise<string> {
  // Type-safe operations
}
```

### Query Builder
Type-safe query building with IntelliSense:

```typescript
// Fully typed queries
const videos = await db
  .select({
    id: videoSummary.id,
    title: videoSummary.title,
    status: videoSummary.processingStatus,
    tagCount: count(videoSummaryTag.tagId)
  })
  .from(videoSummary)
  .leftJoin(videoSummaryTag, eq(videoSummary.id, videoSummaryTag.videoSummaryId))
  .where(eq(videoSummary.userId, userId))
  .groupBy(videoSummary.id);
```

## Performance Considerations

### Indexing Strategy
- Primary keys automatically indexed
- Foreign key columns indexed for join performance
- User ID fields indexed for data scoping
- YouTube ID indexed for duplicate detection

### Query Optimization
- Use Drizzle's query builder for optimal SQL generation
- Implement proper pagination for large datasets
- Use selective field querying to reduce data transfer
- Leverage PostgreSQL's JSON operations for complex data

## Security Features

### SQL Injection Prevention
- Parameterized queries via Drizzle ORM
- No raw SQL string concatenation
- Automatic input sanitization

### Data Scoping
- All queries scoped to authenticated user
- Foreign key constraints ensure data integrity
- Cascade deletes for user data cleanup

## Migration Strategy

### Development
- Use `npm run db:push` for rapid iteration
- Schema changes applied directly to database
- No migration files generated

### Production
- Use `npm run db:generate` to create migration files
- Review migrations before applying
- Use `npm run db:migrate` for production deployments
- Version control migration files

## Monitoring & Maintenance

### Database Health
- Monitor connection pool usage
- Track query performance
- Set up automated backups (Neon handles this)
- Monitor storage usage and scaling

### Development Tools
- Drizzle Studio for database exploration
- PostgreSQL logs for query analysis
- Connection monitoring and alerting

## Next Steps

- Implement database connection pooling optimization
- Add comprehensive indexing strategy
- Set up query performance monitoring
- Implement database seeding for development
- Add database backup and recovery procedures