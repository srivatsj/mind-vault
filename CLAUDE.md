# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Next.js 15.5.3 application called "mind-vault" bootstrapped with create-next-app. It uses the App Router architecture with TypeScript, Tailwind CSS v4, and Turbopack for enhanced development performance. 

## Development Command

```bash
# Start development server with Turbopack
npm run dev

# Build for production with Turbopack  
npm run build

# Start production server
npm start

# Run ESLint
npm run lint

# Run tests
npm test

# Run tests in watch mode
npm run test:watch

# Run TypeScript type checking
npx tsc --noEmit
```

The development server runs on http://localhost:3000.

## Architecture

- **App Router**: Uses Next.js App Router with the `app/` directory structure
- **TypeScript**: Full TypeScript support with strict mode enabled
- **Styling**: Tailwind CSS v4 with PostCSS configuration
- **Fonts**: Uses Geist font family (both sans and mono variants) optimized with next/font
- **Static Assets**: Public assets served from `public/` directory
- **Testing**: Jest with TypeScript support for unit and integration testing
- **Linting**: ESLint with Next.js and TypeScript rules

## Key Configuration Files

- `next.config.ts`: Next.js configuration (currently minimal)
- `tsconfig.json`: TypeScript configuration with path mapping (`@/*` → `./src/*`)
- `eslint.config.mjs`: ESLint configuration extending Next.js rules
- `postcss.config.mjs`: PostCSS configuration for Tailwind CSS
- `jest.config.mjs`: Jest testing framework configuration
- `drizzle.config.ts`: Drizzle ORM configuration

## File Structure

```
src/
├── app/
│   ├── layout.tsx      # Root layout with fonts and global styles
│   ├── page.tsx        # Homepage component
│   ├── globals.css     # Global CSS with Tailwind imports
│   └── favicon.ico     # App favicon
└── db/
    ├── schema.ts       # Database schema definitions
    └── index.ts        # Database connection and configuration

test/                   # Test files mirroring src structure
├── db/
│   ├── connection.test.ts   # Database connection tests
│   └── drizzle.test.ts      # Drizzle ORM tests

docs/                   # Project documentation
public/                 # Static assets (SVG icons)
jest.config.mjs         # Jest configuration
drizzle.config.ts       # Drizzle ORM configuration
```

## Project Documentation

- **PRD**: See `docs/prd.md` for the full product requirements document
- **Technical Design**: See `docs/design.md` for system architecture and technology stack details

## Development Workflow

When implementing features or making changes:
1. Implement the feature/change
2. Test the implementation thoroughly
3. **Update documentation in `docs/` folder** with implementation details
4. Run lint, typecheck, and test commands (`npm run lint`, `npx tsc --noEmit`, `npm test`)
5. Commit and push to git

## Database

- **ORM**: Drizzle ORM with PostgreSQL (Neon)
- **Schema**: Located in `src/db/schema.ts`
- **Connection**: Configured in `src/db/index.ts`
- **Configuration**: `drizzle.config.ts`

### Database Commands
```bash
# Push schema changes to database
npm run db:push

# Generate migrations (for production)
npm run db:generate
npm run db:migrate

# Open Drizzle Studio
npm run db:studio
```

## Development Notes

- The project uses Turbopack for both development and build processes for faster compilation
- ESLint is configured with Next.js core-web-vitals and TypeScript rules
- Path aliases are configured with `@/*` mapping to the src directory (`@/*` → `./src/*`)
- All TypeScript files use strict mode and noEmit is enabled (Next.js handles compilation)
- **Documentation must be updated in `docs/` folder after implementing features and before git commits**
- **DO NOT start development servers** - User manages their own server instances

## YouTube Video Processing Feature

### Architecture Overview
- **Server Actions**: Uses Next.js Server Actions instead of API routes for better type safety and performance
- **DAO Pattern**: Database operations abstracted through Data Access Objects in `src/modules/video/data/`
- **Service Layer**: Business logic separated into services in `src/modules/video/services/`
- **Module Structure**: Features organized by domain in `src/modules/` with clear separation of concerns

### Current Implementation Status
- ✅ Database schema with video summaries, tags, categories, and keyframes tables
- ✅ YouTube API integration for metadata extraction (requires `YOUTUBE_API_KEY` in `.env.local`)
- ✅ URL input page with validation at `/add`
- ✅ Video processing status page at `/videos/[id]`
- ✅ Persistent sidebar layout with centered content using `AppLayout` component
- ✅ Server Actions for video processing with proper error handling
- ⏳ Background processing pipeline (Inngest + yt-dlp + ffmpeg) - pending
- ⏳ AI summarization and keyframe extraction - pending

### Key Files
```
src/app/
├── (auth)/                           # Authentication pages
├── (dashboard)/                      # All authenticated pages with shared layout
│   ├── layout.tsx                    # Persistent sidebar + authentication
│   ├── page.tsx                      # Dashboard home
│   ├── add/page.tsx                  # Video URL input
│   └── videos/[id]/page.tsx          # Video processing status
└── layout.tsx                        # Root application layout

src/modules/video/
├── actions/video.actions.ts          # Server Actions for video processing
├── data/video-summary.dao.ts         # Database access layer
├── services/youtube.service.ts       # YouTube API integration
└── ui/views/
    ├── AddVideoView.tsx              # Video URL input form
    └── VideoProcessingView.tsx       # Processing status display
```

### Environment Variables Required
```bash
YOUTUBE_API_KEY=your_youtube_data_api_v3_key
```