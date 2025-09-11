# YouTube Video Processing Feature - Implementation Documentation

## Overview

This document provides detailed implementation documentation for the YouTube video processing feature of MindVault. This feature allows users to input YouTube URLs, extract metadata, and prepare videos for AI-powered summarization.

> **Note**: This document implements the specifications defined in the [Technical Design Document](./design.md). Refer to the design document for architectural decisions and technology stack rationale.

## Architecture

### Server Actions + DAO Pattern
- **Server Actions**: Used instead of API routes for better type safety and performance
- **DAO Pattern**: Database operations abstracted through Data Access Objects
- **Service Layer**: Business logic separated into reusable services
- **Module Structure**: Features organized by domain in `src/modules/`
- **Route Groups**: Dashboard pages organized under `(dashboard)` route group for clean structure

### YouTube Integration Components
The YouTube processing pipeline implements the AI & Processing stack defined in the technical design:
- **YouTube Data API v3**: For metadata and basic video information extraction
- **yt-dlp**: For video downloading and transcript extraction (pending implementation)
- **FFmpeg**: For keyframe extraction and video processing (pending implementation)

### Database Schema

#### Core Tables
- `video_summary`: Main video records with metadata and processing status
- `tag`: Granular content labels (e.g., "neural networks", "tensorflow")
- `category`: High-level content groupings (e.g., "Machine Learning", "Programming")  
- `keyframe`: Extracted video frames with timestamps
- `video_summary_tag`: Many-to-many relationship between videos and tags
- `video_summary_category`: Many-to-many relationship between videos and categories

#### Key Fields
```sql
video_summary:
- id (text, primary key)
- user_id (text, foreign key to user.id)
- youtube_url (text)
- youtube_id (text, extracted video ID)
- title, description, channel_name (from YouTube API)
- duration (integer, seconds)
- thumbnail_url (text, high-quality thumbnail)
- processing_status (enum: pending, processing, completed, failed)
- ai_generated_content (json, for summaries and key points)
```

## Implementation Details

### File Structure
```
src/app/
├── (auth)/                           # Authentication pages
├── (dashboard)/                      # All authenticated pages
│   ├── layout.tsx                    # Persistent sidebar layout
│   ├── page.tsx                      # Dashboard home
│   ├── add/page.tsx                  # Video URL input
│   └── videos/[id]/page.tsx          # Video processing status
└── layout.tsx                        # Root application layout

src/modules/video/
├── actions/video.actions.ts          # Server Actions
├── data/video-summary.dao.ts         # Database Access Object
├── services/youtube.service.ts       # YouTube API integration
└── ui/views/
    ├── AddVideoView.tsx              # URL input form
    └── VideoProcessingView.tsx       # Processing status page
```

### Key Components

#### 1. YouTube Service (`youtube.service.ts`)
- **URL Validation**: Supports multiple YouTube URL formats
- **Video ID Extraction**: Extracts 11-character video IDs
- **Metadata Fetching**: Uses YouTube Data API v3 for video information
- **Duration Parsing**: Converts ISO 8601 duration to seconds

#### 2. Video Summary DAO (`video-summary.dao.ts`)
- **CRUD Operations**: Create, read, update, delete video summaries
- **User Scoping**: All operations scoped to authenticated user
- **Duplicate Prevention**: Checks for existing videos by user and YouTube ID
- **Relationship Management**: Methods for adding tags, categories, keyframes

#### 3. Server Actions (`video.actions.ts`)
- **processYouTubeVideo**: Validates URL, fetches metadata, creates database record
- **getVideoSummary**: Retrieves video summary with user authentication
- **getAllVideoSummaries**: Lists all videos for authenticated user

#### 4. UI Components

**AddVideoView**:
- Real-time URL validation with visual feedback
- Instant thumbnail preview using YouTube's thumbnail API
- Form submission with loading states using `useTransition`
- Error handling with user-friendly messages

**VideoProcessingView**:
- Displays video metadata (title, thumbnail, channel, duration)
- Real-time processing status with progress indicators
- Polling mechanism for status updates
- Link to original YouTube video

## User Flow

1. **URL Input** (`/add`):
   - User pastes YouTube URL
   - Real-time validation provides immediate feedback
   - Thumbnail preview appears for valid URLs
   - Form submission triggers Server Action

2. **Processing** (`/videos/{id}`):
   - Server Action validates URL and extracts video ID
   - YouTube API fetches video metadata
   - Database record created with "pending" status
   - User redirected to processing page
   - Real-time status updates via polling

3. **Status Display**:
   - Video information displayed with thumbnail
   - Processing steps shown with progress indicators
   - Error handling for failed operations
   - Link to continue to summary editing (future)

## Environment Setup

### Required Environment Variables
```bash
YOUTUBE_API_KEY=your_youtube_data_api_v3_key
```

### Database Commands
```bash
npm run db:push      # Apply schema changes
npm run db:studio    # Open database browser
```

## Features Implemented

✅ **Core Functionality**:
- YouTube URL validation and video ID extraction
- YouTube API integration for metadata fetching
- Database schema with comprehensive relationships
- Server Actions with type safety
- Persistent sidebar layout with full-width content
- Real-time thumbnail preview
- Processing status tracking

✅ **User Experience**:
- Instant URL validation feedback
- Thumbnail preview before processing
- Loading states and error handling
- Responsive design with consistent branding
- Duplicate detection (won't process same video twice)

✅ **Code Quality**:
- TypeScript throughout with strict typing
- ESLint compliance
- Modular architecture with separation of concerns
- Proper error handling and validation

## Next Steps

⏳ **Pending Implementation**:
- Background job processing with Inngest
- Video transcript extraction using yt-dlp
- Keyframe extraction with FFmpeg
- AI summarization with Vercel AI SDK
- Rich text editor for summary editing
- Library page for browsing saved summaries
- Vercel Blob Storage for keyframes and diagrams

## Technical Decisions

### Why Server Actions over API Routes?
- **Type Safety**: Direct TypeScript integration without boilerplate
- **Performance**: No extra HTTP round trip, faster execution  
- **Developer Experience**: Less code, better error handling
- **Security**: Automatic CSRF protection

### Why DAO Pattern?
- **Separation of Concerns**: Database logic isolated from business logic
- **Testability**: Easy to mock for unit tests
- **Maintainability**: Changes to database operations centralized
- **Type Safety**: Consistent interfaces across data operations

### Why Module Structure?
- **Scalability**: Each feature self-contained and independent
- **Team Development**: Different developers can work on different modules
- **Code Organization**: Clear boundaries between features
- **Reusability**: Services and DAOs can be shared across features

## Performance Considerations

- **YouTube Thumbnails**: Uses direct YouTube thumbnail URLs (no API quota)
- **Database Queries**: Optimized with proper indexing on user_id and youtube_id
- **Real-time Updates**: Polling interval optimized for UX vs. server load
- **Error Handling**: Graceful fallbacks for API failures

## Security Measures

- **User Authentication**: All operations require valid session
- **Data Scoping**: Users can only access their own video summaries
- **Input Validation**: Server-side validation of all inputs
- **SQL Injection Prevention**: Drizzle ORM provides safe parameterized queries