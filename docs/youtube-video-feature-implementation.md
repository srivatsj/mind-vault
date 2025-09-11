# YouTube Video Processing Feature - Implementation Documentation

## Overview

Complete implementation guide for the YouTube video processing feature - from URL input to AI-ready video preparation. This feature implements the core video processing pipeline with metadata extraction, status tracking, and library management.

> **Architecture Reference**: Implementation follows patterns defined in [Technical Design](./design.md)

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

## User Workflow

### 1. Video Addition (`/add`)
- User inputs YouTube URL with real-time validation
- Instant thumbnail preview for valid URLs
- Form submission triggers `processYouTubeVideo` Server Action
- Duplicate detection prevents re-processing same video

### 2. Processing Status (`/videos/[id]`)
- Displays video metadata (title, thumbnail, channel, duration)
- Real-time status updates via Server-Sent Events (SSE)
- Progress indicators show processing steps
- Error handling with retry options

### 3. Library Management (`/library`)
- Grid view of all processed/queued videos
- Search across titles, channels, descriptions
- Filter by processing status (pending, processing, completed, failed)
- Direct navigation to processing pages or YouTube links

### 4. Real-time Updates
- SSE connection provides live status updates
- Processing status changes reflected immediately
- Graceful handling of connection issues

## Setup & Configuration

### Environment Variables
```bash
YOUTUBE_API_KEY=your_youtube_data_api_v3_key
```

### Database Schema
The implementation includes comprehensive tables:
- `video_summary`: Core video records with processing status
- `tag` & `category`: Content organization with many-to-many relationships
- `keyframe`: Video frame extraction for AI analysis

## Implementation Status

### ✅ Completed Features

**Core Pipeline**:
- YouTube URL validation and video ID extraction
- YouTube API integration for metadata fetching  
- Database schema with comprehensive relationships
- Server Actions with DAO pattern and type safety

**User Interface**:
- URL input page (`/add`) with real-time validation
- Processing status page (`/videos/[id]`) with SSE updates
- Library page (`/library`) with search and filtering
- Persistent dashboard layout with sidebar navigation
- Thumbnail previews and responsive design

**Technical Excellence**:
- TypeScript strict mode throughout
- ESLint compliance and Next.js Image optimization
- Proper error handling and user authentication
- Duplicate detection and processing status management

### ⏳ Next Implementation Phase
- Background job processing with Inngest
- Video transcript extraction using yt-dlp
- Keyframe extraction with FFmpeg
- AI summarization with Vercel AI SDK
- Rich text editor for summary editing
- Vercel Blob Storage integration