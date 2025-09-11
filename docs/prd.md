# PRD: AI-Powered Learning & Second Brain Platform

## 1. Overview

This product is an AI-powered knowledge capture and learning platform that helps users build their own "second brain." Users can input a YouTube URL, receive AI-generated summaries (including text, diagrams, and extracted video keyframes), edit/refine them, categorize/tag notes, and later search or interact with their knowledge base via natural language chat.

## 2. Objectives

* Enable frictionless knowledge capture from YouTube videos.
* Provide structured, editable AI-generated summaries with **visual aids (AI diagrams + video keyframes)**.
* Help users organize content through titles, tags, and AI categorization.
* Support long-term knowledge retrieval via search and conversational Q\&A.

## 3. Target Users

* Students and lifelong learners.
* Knowledge workers who consume educational videos.
* Content creators or researchers building personal knowledge bases.

## 4. Key Features

### 4.1 Content Ingestion & Summarization

* **Input:** User provides a YouTube URL.
* **Processing:**

  * Extract transcript (via YouTube API or speech-to-text fallback).
  * Generate **AI summary** (concise overview + structured sections).
  * Generate **visual key concepts** through two approaches:

    1. **AI-powered diagrams/concepts** (flowcharts, illustrations, mind maps).
    2. **Keyframe extraction:**

       * Download video via `yt-dlp`.
       * Extract representative frames using `ffmpeg` (scene detection, timestamp alignment, or periodic snapshots).
       * Map frames to transcript segments where possible.
* **Output:**

  * Summary displayed in a **rich text editor**.
  * Both AI-generated diagrams and selected keyframes embedded alongside key points.
  * User can edit/refine the summary manually.

### 4.2 Organization & Categorization

* User can add:

  * **Title** (editable).
  * **Tags/Categories** (manual or AI-suggested).
* **AI Categorization:** Suggests tags based on content domain (e.g., "Machine Learning," "History," "Biology").
* Saved content stored in user’s personal library.

### 4.3 Knowledge Library

* **List View:** All saved summaries.
* **Search/Filter:**

  * By title.
  * By category/tag.
  * By full-text search.
* **Sort:** By created date, last edited date, or relevance.

### 4.4 Conversational Knowledge Retrieval

* **Chat with Your Notes:**

  * Users can ask questions in natural language.
  * AI retrieves relevant summaries/snippets and answers.
  * Source references displayed alongside responses.
* **Contextual Memory:** AI learns user preferences and history over time.

## 5. User Flows

### 5.1 Add New Summary

1. User pastes YouTube URL.
2. System extracts transcript → generates summary, diagrams, and keyframes.
3. User edits summary in rich text editor.
4. User sets title/tags (or accepts AI suggestions).
5. Content saved to library.

### 5.2 Search & View Past Notes

1. User opens Library.
2. User searches by category, title, or keyword.
3. Results displayed in list view.
4. Clicking entry opens summary in editor view.

### 5.3 Chat with Knowledge

1. User opens Chat mode.
2. User asks a question.
3. AI retrieves relevant notes and generates answer.
4. Sources (summary snippets, titles, and frames) linked inline.

## 6. Functional Requirements

* **AI Services:**

  * Summarization (LLM).
  * **Image generation (AI-powered diagrams, concept visuals).**
  * **Video frame processing (yt-dlp + ffmpeg for keyframe extraction).**
  * Categorization (LLM-based tag suggestions).
  * Semantic search & RAG (retrieval-augmented generation).

* **Rich Text Editor:**

  * Bold/italic/underline, headings, bullets, links.
  * Inline images (both AI diagrams & extracted keyframes).
  * Editable summaries.

* **Storage:**

  * User-authenticated personal library.
  * Summaries, metadata (title, tags, timestamps).
  * Images (both diagrams + frames) linked to summaries.

* **Search & Indexing:**

  * Full-text search across summaries.
  * Tag/category-based filtering.

## 7. Future Enhancements (Phase 2+)

* Multi-source ingestion (PDFs, articles, podcasts).
* Collaborative sharing & team spaces.
* Flashcards & spaced repetition from summaries.
* Advanced visualization (mind maps, knowledge graphs).
* Browser extension for instant capture.