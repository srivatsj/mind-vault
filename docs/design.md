# Technical Design: AI-Powered Learning & Second Brain Platform

## 1. System Architecture Overview

### 1.1 Technology Stack

**Frontend & Framework:**
- **Next.js 15** - App Router with React 19
- **TypeScript** - Type safety across the application
- **Tailwind CSS** - Utility-first styling
- **shadcn/ui** - Consistent, accessible UI components

**Backend & Database:**
- **Drizzle ORM** - Type-safe database operations ([Setup Guide](./drizzle-setup.md))
- **PostgreSQL on Neon** - Serverless PostgreSQL database
- **Zod** - Runtime type validation and schema definition

**Authentication & Security:**
- **BetterAuth** - Modern authentication with session management
  - Social login (GitHub, Google)
  - Email/password authentication
  - Drizzle adapter integration with PostgreSQL
  - Session-based authentication with secure token management

**AI & Processing:**
- **Vercel AI SDK** - LLM integration and streaming responses
- **Inngest** - Background job processing for AI workflows
- **YouTube API** - Video metadata and transcript extraction ([Implementation Details](./youtube-video-feature-implementation.md))
- **yt-dlp** - Video downloading and processing
- **FFmpeg** - Video frame extraction and processing

**Storage:**
- **Vercel Blob Storage** - Images, diagrams, and video frames
- **PostgreSQL** - Structured data and metadata

## Implementation Documentation

This design document serves as the authoritative reference for all implementation decisions. Detailed implementation guides for specific features:

### Video Processing Pipeline
- **[YouTube Video Feature Implementation](./youtube-video-feature-implementation.md)** - Complete implementation guide for YouTube URL processing, metadata extraction, and video preparation for AI analysis

### Upcoming Implementation Guides
- **Database Setup & Migrations** - Drizzle ORM configuration and schema management
- **Authentication System** - BetterAuth setup and security implementation  
- **AI Integration** - Vercel AI SDK setup and prompt engineering
- **Background Processing** - Inngest job configuration and error handling
- **Storage Management** - Vercel Blob configuration and file handling