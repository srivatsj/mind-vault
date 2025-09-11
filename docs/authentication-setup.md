# Authentication System - BetterAuth Implementation

## Overview

Mind-vault uses BetterAuth for modern, secure authentication with session management. BetterAuth provides a comprehensive auth solution with social login support, email/password authentication, and seamless Drizzle ORM integration.

> **Architecture Reference**: Part of the authentication & security patterns defined in [Technical Design](./design.md)

## BetterAuth Configuration

### Core Setup

**File**: `src/lib/auth/index.ts`
- Session-based authentication with secure token management
- Drizzle adapter for PostgreSQL integration
- Social login providers (GitHub, Google)
- Email/password authentication
- Automatic user session management

### Database Integration

BetterAuth integrates directly with our PostgreSQL database via Drizzle ORM:

```typescript
// User table managed by BetterAuth
export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("emailVerified").notNull().default(false),
  image: text("image"),
  createdAt: timestamp("createdAt").notNull(),
  updatedAt: timestamp("updatedAt").notNull()
});

// Session management
export const session = pgTable("session", {
  id: text("id").primaryKey(),
  expiresAt: timestamp("expiresAt").notNull(),
  token: text("token").notNull().unique(),
  createdAt: timestamp("createdAt").notNull(),
  updatedAt: timestamp("updatedAt").notNull(),
  ipAddress: text("ipAddress"),
  userAgent: text("userAgent"),
  userId: text("userId").notNull().references(() => user.id, { onDelete: "cascade" })
});
```

## Authentication Flow

### 1. User Registration/Login
- Social login via GitHub/Google OAuth
- Email/password with secure validation
- Automatic user profile creation
- Session establishment with secure tokens

### 2. Session Management
- Server-side session validation
- Automatic session refresh
- Secure cookie handling
- Session expiration management

### 3. Protected Routes
- Server Actions automatically check authentication
- Route-level protection for dashboard pages
- User-scoped data access patterns

## Implementation Patterns

### Server Actions Authentication

```typescript
export async function processYouTubeVideo(youtubeUrl: string) {
  const session = await auth.api.getSession({ 
    headers: await headers() 
  });
  
  if (!session?.user) {
    redirect("/sign-in");
  }
  
  // Proceed with authenticated user
  const userId = session.user.id;
  // ...
}
```

### User-Scoped Data Access

All database operations are scoped to the authenticated user:

```typescript
// DAO pattern with user scoping
export class VideoSummaryDao {
  static async findById(id: string, userId: string) {
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
}
```

## Security Features

### Session Security
- Secure HTTP-only cookies
- CSRF protection via Server Actions
- Session token rotation
- IP address and user agent tracking

### Data Protection
- User data isolation (can only access own records)
- SQL injection prevention via Drizzle ORM
- Input validation with Zod schemas
- Secure password hashing

### Route Protection
- Dashboard routes require authentication
- API endpoints validate sessions
- Automatic redirects for unauthenticated users

## Environment Configuration

### Required Environment Variables
```bash
# BetterAuth Configuration
BETTER_AUTH_SECRET=your_secret_key_here
BETTER_AUTH_URL=http://localhost:3000

# OAuth Providers (optional)
GITHUB_CLIENT_ID=your_github_client_id
GITHUB_CLIENT_SECRET=your_github_client_secret
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
```

## User Interface Components

### Authentication Pages
- **Sign In** (`/sign-in`): Email/password and social login options
- **Sign Up** (`/sign-up`): User registration with validation
- **Dashboard Layout**: Persistent authentication state

### Session Management
- Automatic session refresh
- Loading states during authentication
- Error handling for auth failures
- Logout functionality with session cleanup

## Development Notes

### Testing Authentication
- Use test accounts for development
- Mock authentication in unit tests
- Validate session handling in integration tests

### Security Best Practices
- Regular session cleanup
- Monitor authentication logs
- Implement rate limiting for auth endpoints
- Use environment-specific secrets

## Next Steps

- Multi-factor authentication (MFA) support
- Role-based access control (RBAC)
- Advanced session management features
- Integration with external identity providers