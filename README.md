# Mind-Vault

An AI-powered learning and second brain platform that transforms YouTube videos into structured, searchable knowledge with automated summarization, keyframe extraction, and intelligent categorization.

## Overview

Mind-Vault helps users build their personal knowledge base by processing YouTube videos through an AI-powered pipeline. The platform extracts transcripts, generates comprehensive summaries with visual aids, organizes content with intelligent tagging, and enables natural language search across your knowledge library.

## Product Features

### ✅ Core Capabilities

**Video Processing Pipeline**
- YouTube URL input with real-time validation and instant thumbnail preview
- Automated metadata extraction (title, description, channel, duration)
- Multi-strategy transcript extraction with automatic fallbacks
- AI-powered content summarization using Gemini 2.5 Pro
- Intelligent keyframe extraction at optimal timestamps
- Background job processing with status tracking

**Knowledge Organization**
- Personal video library with search and filtering
- AI-suggested categories and tags for content organization
- Processing status tracking with real-time updates
- Duplicate detection to prevent reprocessing

**Dashboard Experience**
- Persistent sidebar navigation
- Real-time processing updates via Server-Sent Events
- Responsive design with Tailwind CSS v4 + shadcn/ui components
- Category-based knowledge browsing

**Chat Interface**
- Natural language conversation with your knowledge base
- AI-powered retrieval-augmented generation (RAG)
- Multimodal embeddings for text and images
- Contextual responses with source references

### ⏳ Coming Soon
- Rich text editor for summary editing
- Advanced search with semantic similarity
- Video sharing and collaboration
- Export functionality (PDF, Markdown)
- Browser extension for instant capture

## Architecture

### Technology Stack

**Frontend & Application**
- Next.js 15.5.3 with App Router and React 19
- TypeScript with strict mode
- Tailwind CSS v4 with shadcn/ui components
- Server Actions for type-safe data mutations

**Backend & Data**
- PostgreSQL (Neon serverless) with Drizzle ORM
- BetterAuth for session-based authentication
- Server Actions + DAO pattern for data access
- Zod for input validation

**AI & Processing**
- Vercel AI SDK with Google Gemini 2.5 Pro
- Inngest for background job orchestration
- yt-dlp + FFmpeg for video processing
- YouTube Data API v3 for metadata extraction

**Storage & Assets**
- Vercel Blob Storage for keyframes and media
- PostgreSQL for structured data and relationships
- Vector embeddings (pgvector) for semantic search

### System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      User Interface                          │
│            Next.js App Router + React Components             │
└──────────────────┬──────────────────────────────────────────┘
                   │
┌──────────────────▼──────────────────────────────────────────┐
│                    Server Actions Layer                      │
│          Type-safe API with authentication checks            │
└──────────────────┬──────────────────────────────────────────┘
                   │
┌──────────────────▼──────────────────────────────────────────┐
│                    Service Layer                             │
│  ├─ YouTube Service    ├─ AI Service    ├─ Chat Service     │
│  ├─ Transcript Service ├─ Keyframe Svc  ├─ Category Service │
│  └─ Storage Service    └─ Embedding Svc └─ RAG Service      │
└──────────────────┬──────────────────────────────────────────┘
                   │
┌──────────────────▼──────────────────────────────────────────┐
│                    DAO Layer (Data Access)                   │
│  Type-safe database operations with user-scoped queries     │
└──────────────────┬──────────────────────────────────────────┘
                   │
┌──────────────────▼──────────────────────────────────────────┐
│               PostgreSQL Database (Neon)                     │
│  ├─ Users & Sessions    ├─ Video Summaries                  │
│  ├─ Categories & Tags   ├─ Keyframes                        │
│  └─ Chat Conversations  └─ Vector Embeddings                │
└─────────────────────────────────────────────────────────────┘

                    Background Jobs (Inngest)
┌─────────────────────────────────────────────────────────────┐
│  Transcript Extract → Keyframe Extract → Asset Upload →     │
│  AI Summarization → Status Updates                          │
└─────────────────────────────────────────────────────────────┘
```

### Key Design Patterns

**Server Actions + DAO Pattern**
- Server Actions replace API routes for better type safety and performance
- DAO (Data Access Object) pattern abstracts database operations
- Service layer contains business logic and external integrations
- Clear separation of concerns with modular organization

**Authentication & Security**
- Session-based auth with BetterAuth
- User-scoped data access in all queries
- CSRF protection via Server Actions
- Input validation with Zod schemas

**Real-time Updates**
- Server-Sent Events for live status tracking
- Optimistic UI updates with React transitions
- Graceful error handling and retry mechanisms

## Project Structure

```
mind-vault/
├── src/
│   ├── app/                      # Next.js App Router
│   │   ├── (auth)/               # Authentication pages
│   │   ├── (dashboard)/          # Protected dashboard routes
│   │   │   ├── layout.tsx        # Persistent sidebar layout
│   │   │   ├── page.tsx          # Dashboard home
│   │   │   ├── add/              # Video URL input
│   │   │   ├── library/          # Video library
│   │   │   ├── categories/       # Category management
│   │   │   ├── chat/             # Chat interface
│   │   │   └── videos/[id]/      # Video status page
│   │   └── api/                  # API routes (minimal)
│   │
│   ├── modules/                  # Feature modules
│   │   ├── video/                # Video processing
│   │   │   ├── actions/          # Server Actions
│   │   │   ├── data/             # DAO layer
│   │   │   ├── services/         # Business logic
│   │   │   ├── jobs/             # Background jobs
│   │   │   └── ui/               # Components & views
│   │   ├── chat/                 # Chat & RAG
│   │   ├── categories/           # Content organization
│   │   ├── home/                 # Dashboard
│   │   └── auth/                 # Authentication
│   │
│   ├── db/                       # Database configuration
│   │   ├── schema.ts             # Drizzle schema
│   │   └── index.ts              # DB connection
│   │
│   ├── lib/                      # Shared utilities
│   │   └── auth/                 # BetterAuth setup
│   │
│   └── components/               # Shared UI components
│
├── docs/                         # Documentation
│   ├── prd.md                    # Product requirements
│   ├── design.md                 # System architecture
│   ├── database-setup.md         # Database guide
│   ├── authentication-setup.md   # Auth implementation
│   └── youtube-video-feature-implementation.md
│
├── unit_tests/                   # Unit tests
├── integration_tests/            # Integration tests
└── CLAUDE.md                     # AI assistant context
```

## Getting Started

### Prerequisites
- Node.js 20+ and npm
- PostgreSQL database (Neon recommended)
- YouTube Data API v3 key
- Google AI API key (for Gemini)

### Environment Setup

```bash
# Database
DATABASE_URL=postgresql://user:pass@host:port/database

# Authentication
BETTER_AUTH_SECRET=your_secret_key
BETTER_AUTH_URL=http://localhost:3000

# API Keys
YOUTUBE_API_KEY=your_youtube_api_key
GOOGLE_GENERATIVE_AI_API_KEY=your_gemini_api_key

# Storage
BLOB_READ_WRITE_TOKEN=your_vercel_blob_token

# Inngest
INNGEST_EVENT_KEY=your_inngest_key
INNGEST_SIGNING_KEY=your_signing_key
```

### Installation

```bash
# Install dependencies
npm install

# Push database schema
npm run db:push

# Run development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the application.

### Development Commands

```bash
# Development
npm run dev                # Start dev server (Turbopack)
npm run build             # Production build
npm start                 # Start production server

# Code Quality
npm run lint              # Run ESLint
npm run lint:fix          # Auto-fix ESLint issues
npx tsc --noEmit          # TypeScript type checking

# Testing
npm run test:unit         # Run unit tests
npm run test:integration  # Run integration tests

# Database
npm run db:push           # Push schema changes
npm run db:studio         # Open database browser

# Background Jobs
npx inngest-cli@latest dev  # Start Inngest dev server
```

## Documentation

For detailed implementation guides, see the [docs/](./docs) directory:

- **[PRD](./docs/prd.md)** - Product requirements and vision
- **[Design](./docs/design.md)** - System architecture overview
- **[Database Setup](./docs/database-setup.md)** - Drizzle ORM and schema
- **[Authentication](./docs/authentication-setup.md)** - BetterAuth implementation
- **[Video Processing](./docs/youtube-video-feature-implementation.md)** - Feature guide

## Testing

```bash
# Run all unit tests
npm run test:unit

# Run with watch mode
npm run test:watch

# Run integration tests
npm run test:integration
```

## Contributing

1. Follow the existing code patterns (Server Actions + DAO)
2. Write unit tests for new features
3. Update documentation in `docs/` directory
4. Ensure ESLint and TypeScript checks pass

## License

Private project - All rights reserved
