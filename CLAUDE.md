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
npm start            # Start production server

# Code Quality
npm run lint                # Run ESLint
npm run lint:fix            # Auto-fix ESLint issues
npm run test:unit           # Run unit tests
npm run test:integration    # Run integration tests
npx tsc --noEmit            # TypeScript type checking

# Database
npm run db:push         # Push schema changes
npm run db:push:test    # Push schema changesto test env
npm run db:studio       # Open database browser

# Inngest
npx inngest-cli@latest dev
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
├── app/                    # Next.js App Router
│   ├── (dashboard)/        # Authenticated pages
│   └── layout.tsx          # Root layout
├── db/                     # Database configuration
└── modules/                # Feature modules
    └── video/              # YouTube video processing
        ├── actions/        # Server Actions
        ├── data/           # DAO layer
        ├── services/       # Business logic
        └── ui/             # Components

docs/                       # Documentation
unit_test                   
integration_test
```

## Documentation

- **PRD**: `docs/prd.md` - Product requirements
- **Design**: `docs/design.md` - System architecture  
- **Features**: `docs/[feature-name].md` - Implementation details

## Development Workflow

1. Implement feature/change 
2. Always write code which passes linter and tsc checks
3. Write unit and interation tests to verify feature works properly
4. Update feature-specific and deign documentation in `docs/`
5. Update implementation status below

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
- **Background processing pipeline (Inngest + yt-dlp + ffmpeg)**
- **AI summarization with Vercel AI SDK (Gemini 2.5 Pro)**
- **Keyframe extraction and storage with Vercel Blob**
- **Transcript extraction with fallback to video analysis**
- **Complete video processing workflow with status tracking**
- **Error handling and retry mechanisms**
- **Comprehensive unit tests for core services**

### ⏳ Pending Features  
- Rich text editor for summary editing
- Advanced search and filtering in library
- Video sharing and collaboration features
- Export functionality (PDF, markdown, etc.)
- Mobile responsive improvements

## Development Notes
- User manages development server, database pushes, linting and runnign any commands
- ESLint + TypeScript strict mode enabled
- Server Actions preferred over API routes
- Features organized in `src/modules/` with DAO pattern