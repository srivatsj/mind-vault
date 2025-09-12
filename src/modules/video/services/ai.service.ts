import { google } from '@ai-sdk/google';
import { generateObject } from 'ai';
import { z } from 'zod';
import { getAIConfig } from '@/lib/config';
import type { TranscriptSegment } from './transcript.service';

export interface VideoAnalysisInput {
  title: string;
  description?: string;
  duration: number; // in seconds
  transcript?: TranscriptSegment[];
  channelName?: string;
  youtubeUrl?: string; // For direct video analysis
  videoPath?: string;  // For local video file analysis
}

export interface KeyframeInterval {
  timestamp: number;  // in seconds
  reason: string;     // Why this moment is important
  confidence: number; // 0-1 confidence score
  category: 'intro' | 'main_point' | 'demo' | 'conclusion' | 'transition' | 'highlight';
}

export interface VideoSummary {
  summary: string;
  keyPoints: string[];
  topics: string[];
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  estimatedReadTime: number; // in minutes
}

export interface AIAnalysisResult {
  success: boolean;
  keyframeIntervals?: KeyframeInterval[];
  summary?: VideoSummary;
  tags?: string[];
  categories?: string[];
  error?: string;
}

const KeyframeIntervalSchema = z.object({
  timestamp: z.number().min(0),
  reason: z.string().min(1),
  confidence: z.number().min(0).max(1),
  category: z.enum(['intro', 'main_point', 'demo', 'conclusion', 'transition', 'highlight'])
});

const VideoAnalysisSchema = z.object({
  keyframeIntervals: z.array(KeyframeIntervalSchema).max(15), // Limit to 15 keyframes
  summary: z.object({
    summary: z.string().min(50),
    keyPoints: z.array(z.string()).max(10),
    topics: z.array(z.string()).max(15), // Increased from 8 to 15
    difficulty: z.enum(['beginner', 'intermediate', 'advanced']),
    estimatedReadTime: z.number().min(1)
  }),
  tags: z.array(z.string()).max(15), // Increased from 12 to 15
  categories: z.array(z.string()).max(8) // Increased from 5 to 8
});

export class AIService {
  private static model = google('gemini-2.5-flash');
  private static visionModel = google('gemini-2.5-pro');

  /**
   * Analyze video and generate keyframe intervals, summary, and tags
   * Uses video analysis if URL/path provided, otherwise falls back to transcript
   */
  static async analyzeVideo(input: VideoAnalysisInput): Promise<AIAnalysisResult> {
    const aiConfig = getAIConfig();
    const hasTranscript = input.transcript && input.transcript.length > 0;
    
    // Use video analysis if:
    // 1. Explicitly configured for video mode, OR
    // 2. No transcript is available and we have a video URL/path
    const useVideoAnalysis = (aiConfig.analysisMode === 'video' || !hasTranscript) && 
                            (input.youtubeUrl || input.videoPath);
    
    if (useVideoAnalysis) {
      console.log(`Using video analysis mode for: ${input.title} (transcript available: ${hasTranscript})`);
      return this.analyzeVideoDirectly(input);
    } else {
      console.log(`Using transcript analysis mode for: ${input.title}`);
      return this.analyzeVideoFromTranscript(input);
    }
  }

  /**
   * Analyze video using direct video content (Gemini Vision)
   */
  private static async analyzeVideoDirectly(input: VideoAnalysisInput): Promise<AIAnalysisResult> {
    try {
      if (!input.youtubeUrl && !input.videoPath) {
        throw new Error('No video URL or path provided for direct video analysis');
      }

      // For now, use enhanced transcript-based analysis with video-specific prompts
      // When Gemini video API is fully available, we can replace this with actual video processing
      const prompt = this.buildVideoAnalysisPrompt(input);
      
      const result = await generateObject({
        model: this.visionModel,
        schema: VideoAnalysisSchema,
        prompt,
        temperature: 0.3,
      });

      return {
        success: true,
        keyframeIntervals: result.object.keyframeIntervals,
        summary: result.object.summary,
        tags: result.object.tags,
        categories: result.object.categories
      };
    } catch (error) {
      console.error('Direct video analysis failed, falling back to transcript:', error);
      // Fallback to transcript-based analysis
      return this.analyzeVideoFromTranscript(input);
    }
  }

  /**
   * Analyze video using transcript and metadata (traditional approach)
   */
  private static async analyzeVideoFromTranscript(input: VideoAnalysisInput): Promise<AIAnalysisResult> {
    try {
      const prompt = this.buildTranscriptAnalysisPrompt(input);
      
      const result = await generateObject({
        model: this.model,
        schema: VideoAnalysisSchema,
        prompt,
        temperature: 0.3,
      });

      return {
        success: true,
        keyframeIntervals: result.object.keyframeIntervals,
        summary: result.object.summary,
        tags: result.object.tags,
        categories: result.object.categories
      };
    } catch (error) {
      console.error('Transcript-based AI Analysis failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'AI analysis failed'
      };
    }
  }

  /**
   * Generate keyframe intervals only (faster, focused analysis)
   */
  static async generateKeyframeIntervals(input: VideoAnalysisInput): Promise<KeyframeInterval[]> {
    try {
      const prompt = this.buildKeyframePrompt(input);
      
      const result = await generateObject({
        model: this.model,
        schema: z.object({
          keyframes: z.array(KeyframeIntervalSchema).max(15)
        }),
        prompt,
        temperature: 0.2,
      });

      return result.object.keyframes;
    } catch (error) {
      console.error('Keyframe interval generation failed:', error);
      // Fallback to evenly spaced intervals
      return this.generateFallbackIntervals(input.duration);
    }
  }

  /**
   * Generate video summary only
   */
  static async generateSummary(input: VideoAnalysisInput): Promise<VideoSummary | null> {
    try {
      const prompt = this.buildSummaryPrompt(input);
      
      const result = await generateObject({
        model: this.model,
        schema: z.object({
          summary: z.string().min(50),
          keyPoints: z.array(z.string()).max(10),
          topics: z.array(z.string()).max(15),
          difficulty: z.enum(['beginner', 'intermediate', 'advanced']),
          estimatedReadTime: z.number().min(1)
        }),
        prompt,
        temperature: 0.4,
      });

      return result.object;
    } catch (error) {
      console.error('Summary generation failed:', error);
      return null;
    }
  }

  /**
   * Generate tags and categories for video
   */
  static async generateTags(input: VideoAnalysisInput): Promise<{tags: string[], categories: string[]}> {
    try {
      const prompt = this.buildTagsPrompt(input);
      
      const result = await generateObject({
        model: this.model,
        schema: z.object({
          tags: z.array(z.string()).max(15),
          categories: z.array(z.string()).max(8)
        }),
        prompt,
        temperature: 0.3,
      });

      return result.object;
    } catch (error) {
      console.error('Tag generation failed:', error);
      return { tags: [], categories: [] };
    }
  }

  /**
   * Build video analysis prompt for direct video content analysis
   */
  private static buildVideoAnalysisPrompt(input: VideoAnalysisInput): string {
    const hasTranscript = input.transcript && input.transcript.length > 0;
    
    return `${hasTranscript ? 'Analyze this video with transcript data' : 'SIMULATE WATCHING THIS VIDEO'} and provide intelligent keyframe intervals, summary, and categorization.

VIDEO DETAILS:
Title: ${input.title}
Duration: ${input.duration} seconds (${Math.floor(input.duration / 60)}:${String(input.duration % 60).padStart(2, '0')})
Channel: ${input.channelName || 'Unknown'}
Description: ${input.description || 'No description'}
${input.youtubeUrl ? `YouTube URL: ${input.youtubeUrl}` : ''}

${hasTranscript ? `TRANSCRIPT AVAILABLE:
${input.transcript?.map(s => s.text).join(' ').substring(0, 4000) || ''}${(input.transcript?.map(s => s.text).join(' ').length || 0) > 4000 ? '...' : ''}` : `NO TRANSCRIPT - INTELLIGENT VIDEO ANALYSIS MODE:

Based on the title "${input.title}" and description, this appears to be a ${this.inferVideoType(input)} video.

ADVANCED ANALYSIS INSTRUCTIONS:
As an AI that can "watch" videos, analyze the visual and audio content to understand:
- What the speaker is explaining (from audio)
- Visual elements shown (code, diagrams, examples)
- Screen content changes and transitions
- Overall narrative flow and structure`}

KEYFRAME EXTRACTION STRATEGY:
1. **CRITICAL**: All keyframe timestamps MUST be between 0 and ${input.duration} seconds
2. Generate ${hasTranscript ? '10-15' : '8-12'} strategically placed keyframes:
   - Opening (0-60s): Hook, introduction, overview
   - Early content (~15% of duration): First major concept
   - Mid-sections (30%, 50%, 70%): Core content, examples, demonstrations
   - Conclusion (~90%): Summary, call-to-action, final thoughts
3. Focus on moments with: visual changes, new concepts, code/diagrams, transitions
4. Minimum 30 seconds between keyframes for variety
5. Provide confidence scores based on ${hasTranscript ? 'content analysis' : 'inferred importance'}

SUMMARY GENERATION:
Create a comprehensive summary that captures:
- Main topic and learning objectives
- Key concepts and takeaways (5-8 points)
- Technical topics covered
- Estimated difficulty level
- Target audience (beginner/intermediate/advanced)

CATEGORIZATION:
Generate relevant tags and categories based on the content type and subject matter.`;
  }

  /**
   * Infer video type from title and description for better analysis
   */
  private static inferVideoType(input: VideoAnalysisInput): string {
    const title = input.title.toLowerCase();
    const description = (input.description || '').toLowerCase();
    const content = `${title} ${description}`;
    
    if (content.includes('tutorial') || content.includes('how to') || content.includes('guide')) {
      return 'tutorial/educational';
    } else if (content.includes('review') || content.includes('comparison')) {
      return 'review/comparison';
    } else if (content.includes('demo') || content.includes('showcase')) {
      return 'demonstration/showcase';
    } else if (content.includes('conference') || content.includes('presentation') || content.includes('talk')) {
      return 'conference/presentation';
    } else if (content.includes('course') || content.includes('lesson')) {
      return 'educational course';
    } else if (content.includes('interview') || content.includes('discussion')) {
      return 'interview/discussion';
    } else if (content.includes('code') || content.includes('programming') || content.includes('development')) {
      return 'programming/coding';
    }
    
    return 'general educational';
  }

  /**
   * Build transcript-based analysis prompt (fallback method)
   */
  private static buildTranscriptAnalysisPrompt(input: VideoAnalysisInput): string {
    const transcriptText = input.transcript?.map(s => s.text).join(' ') || '';
    const hasTranscript = transcriptText.length > 0;
    
    return `Analyze this video and provide intelligent keyframe intervals, summary, and categorization.

VIDEO DETAILS:
Title: ${input.title}
Duration: ${input.duration} seconds (${Math.floor(input.duration / 60)}:${String(input.duration % 60).padStart(2, '0')})
Channel: ${input.channelName || 'Unknown'}
Description: ${input.description || 'No description'}

${hasTranscript ? 'TRANSCRIPT:' : 'CONTENT ANALYSIS:'}
${hasTranscript 
  ? (transcriptText.substring(0, 4000) + (transcriptText.length > 4000 ? '...' : ''))
  : `No transcript available. Base analysis on title, description, and duration (${Math.floor(input.duration / 60)}:${String(input.duration % 60).padStart(2, '0')}) to provide general keyframe suggestions.

SUGGESTED KEYFRAME STRATEGY (without transcript):
- Start: 0-30 seconds (intro/hook)
- Early content: ~10% of duration (initial concepts)
- Mid points: 25%, 50%, 75% of duration (main content sections)  
- Conclusion: ~90% of duration (wrap-up/summary)
- Ensure even distribution across the full video length`
}

INSTRUCTIONS:
${hasTranscript 
  ? '1. Identify 8-15 optimal keyframe moments that capture the video\'s key content based on transcript'
  : '1. Generate 6-10 evenly distributed keyframe intervals based on typical video structure'
}
2. **CRITICAL**: All keyframe timestamps MUST be between 0 and ${input.duration} seconds (video duration)
3. Focus on: intro/hook, main concepts, demonstrations, conclusions, transitions
4. Avoid redundant or similar moments (minimum 30 seconds between keyframes)
5. Provide confidence scores (${hasTranscript ? 'based on transcript content' : 'lower confidence due to no transcript'})
6. Generate a comprehensive summary with key points
7. Suggest relevant tags and categories based on available information
8. Assess content difficulty level

${hasTranscript 
  ? 'Consider the video\'s educational value, visual content changes, and narrative structure.'
  : 'Generate reasonable estimates based on title, description, and channel context.'
}`;
  }

  /**
   * Build keyframe-focused prompt
   */
  private static buildKeyframePrompt(input: VideoAnalysisInput): string {
    const transcriptText = input.transcript?.map(s => s.text).join(' ') || '';
    
    return `Identify optimal keyframe extraction points for this video.

VIDEO: "${input.title}"
DURATION: ${input.duration} seconds
TRANSCRIPT: ${transcriptText.substring(0, 3000)}

Find 8-12 moments that best represent the video content:
- Opening/introduction
- Key concept explanations  
- Visual demonstrations or examples
- Important transitions
- Conclusions or summaries

Provide timestamps in seconds with reasoning for each selection.
Focus on moments with visual content changes or important narrative beats.`;
  }

  /**
   * Build summary-focused prompt
   */
  private static buildSummaryPrompt(input: VideoAnalysisInput): string {
    const transcriptText = input.transcript?.map(s => s.text).join(' ') || '';
    
    return `Create a comprehensive summary of this video.

TITLE: ${input.title}
DURATION: ${Math.floor(input.duration / 60)} minutes
CONTENT: ${transcriptText.substring(0, 5000)}

Generate:
- A clear, engaging summary (100-300 words)
- 5-8 key points or takeaways
- Main topics covered
- Difficulty level assessment
- Estimated reading time for the summary`;
  }

  /**
   * Build tags-focused prompt
   */
  private static buildTagsPrompt(input: VideoAnalysisInput): string {
    const transcriptText = input.transcript?.map(s => s.text).join(' ') || '';
    
    return `Generate relevant tags and categories for this video.

TITLE: ${input.title}
CONTENT: ${transcriptText.substring(0, 2000)}
CHANNEL: ${input.channelName || 'Unknown'}

Create:
- 6-10 specific, searchable tags
- 2-4 broad categories
- Focus on technical concepts, tools, frameworks, and topics mentioned
- Use commonly searched terms`;
  }

  /**
   * Fallback to evenly spaced intervals when AI fails
   */
  private static generateFallbackIntervals(duration: number): KeyframeInterval[] {
    const count = Math.min(10, Math.max(5, Math.floor(duration / 60))); // 5-10 intervals based on duration
    const intervals: KeyframeInterval[] = [];
    const step = duration / (count + 1);
    
    for (let i = 1; i <= count; i++) {
      intervals.push({
        timestamp: Math.floor(step * i),
        reason: `Evenly spaced interval ${i}`,
        confidence: 0.5,
        category: i === 1 ? 'intro' : i === count ? 'conclusion' : 'main_point'
      });
    }
    
    return intervals;
  }

  /**
   * Validate and filter keyframe intervals
   */
  static validateKeyframeIntervals(
    intervals: KeyframeInterval[], 
    duration: number,
    minGap: number = 30 // Minimum 30 seconds between keyframes
  ): KeyframeInterval[] {
    return intervals
      .filter(interval => interval.timestamp >= 0 && interval.timestamp < duration)
      .sort((a, b) => a.timestamp - b.timestamp)
      .filter((interval, index, array) => {
        if (index === 0) return true;
        return interval.timestamp - array[index - 1].timestamp >= minGap;
      });
  }
}