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

**AI & Processing:**
- **Vercel AI SDK** - LLM integration and streaming responses
- **Inngest** - Background job processing for AI workflows
- **YouTube API** - Video metadata and transcript extraction
- **yt-dlp** - Video downloading and processing
- **FFmpeg** - Video frame extraction and processing

**Storage:**
- **Vercel Blob Storage** - Images, diagrams, and video frames
- **PostgreSQL** - Structured data and metadata