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

### Video Processing Pipeline

The complete video processing pipeline implements the AI & Processing stack with the following components:

#### 1. Video Metadata Extraction
- **YouTube Data API v3**: Extracts title, description, channel, duration, thumbnails
- **URL Validation**: Multi-format YouTube URL support with video ID extraction
- **Duplicate Detection**: Prevents re-processing videos already in user's library

#### 2. Transcript Extraction (Multi-Strategy)
- **Primary Strategy**: `youtube-transcript` library for accessible captions
- **Secondary Strategy**: `ytdl-core` for alternative caption formats
- **Fallback Behavior**: Video analysis mode when no transcript available
- **Error Handling**: Graceful degradation with meaningful status updates

#### 3. AI Content Analysis
- **Gemini 2.5 Pro Integration**: Via Vercel AI SDK for content understanding
- **Transcript-Based Analysis**: When transcripts available (faster, more accurate)
- **Direct Video Analysis**: Fallback mode for videos without accessible transcripts
- **Content Generation**: Summaries, key points, topics, difficulty assessment, tags

#### 4. Keyframe Extraction
- **AI-Guided Intervals**: Gemini analyzes content to suggest optimal keyframe timestamps
- **FFmpeg Processing**: Extracts high-quality frames at specified intervals
- **Validation**: Ensures extracted frames exist and meet quality standards
- **Batch Processing**: Efficient extraction of multiple frames per video

#### 5. Asset Storage & Management
- **Vercel Blob Storage**: Scalable storage for keyframe images with CDN delivery
- **Image Optimization**: Multiple formats and sizes for different use cases
- **Cleanup Jobs**: Automatic removal of temporary processing files
- **URL Management**: Secure access URLs with proper permissions

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

**Background Processing**:
- **Inngest job queue** with multi-step processing pipeline
- **Transcript extraction** with youtube-transcript library and fallback strategies  
- **Keyframe extraction** using ffmpeg with AI-suggested intervals
- **AI summarization** with Vercel AI SDK (Gemini 2.5 Pro)
- **Asset storage** with Vercel Blob Storage for keyframes
- **Error handling** with retry mechanisms and graceful degradation

**Processing Pipeline Status Flow**:
`pending` → `extracting_transcript` → `extracting_keyframes` → `uploading_assets` → `generating_summary` → `completed`

**Testing Coverage**:
- Comprehensive unit tests for all core services
- Integration tests for video processing workflows  
- Error scenario testing with real YouTube API calls
- Transcript extraction fallback behavior verification

### ⏳ Next Implementation Phase
- Rich text editor for summary editing
- Advanced search and filtering in library
- Video sharing and collaboration features
- Export functionality (PDF, markdown, etc.)
- Mobile responsive improvements