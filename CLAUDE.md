# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Mind-vault is an AI-powered learning and second brain platform built with Next.js 15.5.3. The application allows users to process YouTube videos for AI-powered summarization and knowledge management.

**Core Technology Stack**: Next.js App Router, TypeScript, Tailwind CSS v4, PostgreSQL with Drizzle ORM, BetterAuth 

## Development Commands

```bash
# Development
npm run dev          # Start development server (Turbopack)
npm run build        # Production build
npm start           # Start production server

# Code Quality
npm run lint        # Run ESLint
npm run lint:fix    # Auto-fix ESLint issues
npm test           # Run tests
npx tsc --noEmit   # TypeScript type checking

# Database
npm run db:push     # Push schema changes
npm run db:studio   # Open database browser
```

## Architecture Overview

- **Framework**: Next.js 15 App Router with TypeScript
- **Database**: PostgreSQL with Drizzle ORM
- **Authentication**: BetterAuth with session management
- **UI**: Tailwind CSS v4 + shadcn/ui components
- **Patterns**: Server Actions + DAO pattern, modular feature organization

## Key Files

- `tsconfig.json`: Path mapping (`@/*` → `./src/*`)
- `drizzle.config.ts`: Database configuration
- `src/db/schema.ts`: Database schema definitions
- `src/modules/`: Feature-specific code organization

## Project Structure

```
src/
├── app/                     # Next.js App Router
│   ├── (dashboard)/         # Authenticated pages
│   └── layout.tsx          # Root layout
├── db/                     # Database configuration
└── modules/                # Feature modules
    └── video/              # YouTube video processing
        ├── actions/        # Server Actions
        ├── data/          # DAO layer
        ├── services/      # Business logic
        └── ui/            # Components

docs/                       # Documentation
```

## Documentation

- **PRD**: `docs/prd.md` - Product requirements
- **Design**: `docs/design.md` - System architecture  
- **Features**: `docs/[feature-name].md` - Implementation details

## Development Workflow

1. Implement feature/change
2. Update feature-specific and deign documentation in `docs/`
3. Update implementation status below

**Documentation Hierarchy**: CLAUDE.md (high-level) → design.md (architecture) → feature-specific.md (implementation details)

## Implementation Status

### ✅ Completed Features
- Database schema (video summaries, tags, categories, keyframes)
- YouTube API integration for metadata extraction
- URL input page with real-time validation (`/add`)
- Video processing status page with SSE updates (`/videos/[id]`)
- Library page for browsing saved videos (`/library`)
- Persistent dashboard layout with sidebar
- Server Actions + DAO pattern implementation

### ⏳ Pending Features  
- Background processing pipeline (Inngest + yt-dlp + ffmpeg)
- AI summarization with Vercel AI SDK
- Keyframe extraction and storage
- Rich text editor for summary editing
- Vercel Blob Storage integration

## Development Notes
- User manages development server, database pushes, linting and runnign any commands
- ESLint + TypeScript strict mode enabled
- Server Actions preferred over API routes
- Features organized in `src/modules/` with DAO pattern