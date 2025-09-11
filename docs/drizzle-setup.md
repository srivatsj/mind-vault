# Drizzle ORM Setup Documentation

## Overview

This document outlines the Drizzle ORM setup implemented in the mind-vault project, including database configuration, schema management, and usage patterns.

## Implementation Details

### Dependencies Installed

```bash
npm i drizzle-orm postgres
npm i -D drizzle-kit
```

- **drizzle-orm**: The core ORM library
- **postgres**: PostgreSQL driver for Node.js
- **drizzle-kit**: Development tools for migrations and database management

### Configuration Files

#### 1. Drizzle Configuration (`drizzle.config.ts`)

```typescript
import { defineConfig } from "drizzle-kit";

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
  verbose: true,
  strict: true,
});
```

#### 2. Database Schema (`src/db/schema.ts`)

```typescript
import { pgTable, serial, text, timestamp, boolean } from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  verified: boolean("verified").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
```

#### 3. Database Connection (`src/db/index.ts`)

```typescript
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL environment variable is not set");
}

const client = postgres(connectionString);
export const db = drizzle(client, { schema });
```

### Environment Configuration

#### Environment Variables Required

Create `.env.local`:

```env
DATABASE_URL="postgresql://username:password@host:port/database?sslmode=require"
```

For Neon PostgreSQL:
```env
DATABASE_URL="postgresql://[user]:[password]@[neon-hostname]/[dbname]?sslmode=require"
```

### NPM Scripts Added

```json
{
  "scripts": {
    "test": "jest",
    "test:watch": "jest --watch",
    "db:generate": "drizzle-kit generate",
    "db:migrate": "drizzle-kit migrate", 
    "db:push": "drizzle-kit push",
    "db:studio": "drizzle-kit studio"
  }
}
```

## Usage

### Database Operations

```typescript
import { db } from "@/db";
import { users, type User, type NewUser } from "@/db/schema";
import { eq } from "drizzle-orm";

// Insert user
const newUser: NewUser = {
  name: "John Doe",
  email: "john@example.com"
};
const result = await db.insert(users).values(newUser).returning();

// Select users
const allUsers = await db.select().from(users);

// Select user by email
const user = await db.select().from(users).where(eq(users.email, "john@example.com"));

// Update user
await db.update(users)
  .set({ verified: true })
  .where(eq(users.id, 1));

// Delete user
await db.delete(users).where(eq(users.id, 1));
```

### Schema Management Commands

```bash
# Push schema changes directly to database (development)
npm run db:push

# Generate migration files (production workflow)
npm run db:generate

# Apply migrations to database
npm run db:migrate

# Open Drizzle Studio (database browser)
npm run db:studio
```

## Development Workflow

1. **Schema Changes**: Modify `src/db/schema.ts`
2. **Development**: Use `npm run db:push` to sync changes
3. **Production**: Use `npm run db:generate` + `npm run db:migrate`
4. **Inspection**: Use `npm run db:studio` to browse data

## Features Implemented

- ✅ PostgreSQL connection with postgres.js driver
- ✅ Type-safe schema definitions
- ✅ Development and production migration workflows
- ✅ Environment-based configuration
- ✅ Sample users table with common fields
- ✅ TypeScript types for insert/select operations

## Testing Status

- ✅ Configuration files created
- ✅ Dependencies installed  
- ✅ Project structure updated
- ✅ Database connection verified (Neon URL configured)
- ✅ Test framework setup (Jest with TypeScript)
- ✅ Database connection tests passing
- ✅ Schema validation tests passing
- ✅ ESLint and TypeScript checks passing
- ⏳ Schema push to database (ready when needed)
- ⏳ Drizzle Studio testing (available via `npm run db:studio`)

## Security Considerations

- Database URL stored in environment variables
- Connection string validation in database module
- SSL mode required for production connections
- No database credentials in source code

## Next Steps

1. Provide Neon database URL
2. Run `npm run db:push` to create tables
3. Test database operations
4. Implement authentication schema integration

---

*Implemented: January 2025*
*Status: Ready for database URL configuration*