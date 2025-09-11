# Technical Design: Mind-Vault Platform

## System Architecture

### Core Technology Stack

**Application Framework:**
- **Next.js 15** - App Router with React 19, TypeScript
- **Tailwind CSS v4** - Utility-first styling with shadcn/ui components

**Data & Authentication:**
- **PostgreSQL on Neon** - Serverless database with Drizzle ORM
- **BetterAuth** - Session-based authentication with social login support

**AI & Media Processing:**
- **Vercel AI SDK** - LLM integration for content summarization
- **Inngest** - Background job processing and workflow orchestration
- **YouTube API** - Video metadata and transcript extraction
- **yt-dlp + FFmpeg** - Video processing and keyframe extraction

**Storage & Assets:**
- **Vercel Blob Storage** - Media files and extracted assets
- **PostgreSQL** - Structured data and relationships

## Architectural Patterns

### Server Actions + DAO Pattern
- **Server Actions** replace API routes for type safety and performance
- **DAO (Data Access Object)** pattern abstracts database operations
- **Service Layer** contains business logic and external API integrations
- **Module Organization** features grouped by domain in `src/modules/`

### Authentication & Security
- Session-based authentication with BetterAuth
- User-scoped data access with proper authorization
- Input validation with Zod schemas
- CSRF protection via Server Actions

### Real-time Updates
- Server-Sent Events (SSE) for live status updates
- Optimistic UI updates with React transitions
- Graceful error handling and retry mechanisms

## Feature Implementation Guides

### Core Infrastructure
- **[Database Setup](./database-setup.md)** - Drizzle ORM with PostgreSQL, schema management, DAO patterns
- **[Authentication Setup](./authentication-setup.md)** - BetterAuth integration, session management, security patterns

### Video Processing Pipeline  
- **[YouTube Video Processing](./youtube-video-feature-implementation.md)** - URL input, metadata extraction, status tracking, library management

### Upcoming Features
- **Background Jobs** - Inngest setup for video processing workflows
- **AI Integration** - Vercel AI SDK for content summarization
- **Storage Management** - Blob storage for media assets