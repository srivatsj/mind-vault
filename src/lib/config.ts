/**
 * Application configuration from environment variables
 */
export const config = {
  // AI Configuration
  ai: {
    // Mode: 'transcript' | 'video' 
    // transcript: Use transcript and metadata for analysis (faster, cheaper)
    // video: Use direct video analysis with Gemini Vision (slower, more accurate)
    analysisMode: (process.env.AI_VIDEO_ANALYSIS_MODE as 'transcript' | 'video') || 'transcript',
    
    // Gemini API configuration
    geminiApiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY,
  },

  // Video Processing Configuration  
  video: {
    // Maximum video duration to process (in seconds)
    maxDuration: parseInt(process.env.MAX_VIDEO_DURATION || '3600'), // 1 hour default
    
    // Keyframe extraction settings
    keyframe: {
      quality: parseInt(process.env.KEYFRAME_QUALITY || '2'), // 1-31, lower is better
      maxWidth: parseInt(process.env.KEYFRAME_MAX_WIDTH || '1280'),
      maxHeight: parseInt(process.env.KEYFRAME_MAX_HEIGHT || '720'),
      maxCount: parseInt(process.env.KEYFRAME_MAX_COUNT || '15'),
    },
    
    // FFmpeg settings
    ffmpeg: {
      timeout: parseInt(process.env.FFMPEG_TIMEOUT || '300000'), // 5 minutes
    }
  },

  // Storage Configuration
  storage: {
    // Vercel Blob Storage
    vercelBlobToken: process.env.BLOB_READ_WRITE_TOKEN,
    
    // Temporary file cleanup
    cleanupTempFiles: process.env.CLEANUP_TEMP_FILES !== 'false',
    tempFileLifetime: parseInt(process.env.TEMP_FILE_LIFETIME || '3600'), // 1 hour
  },

  // Inngest Configuration
  inngest: {
    eventKey: process.env.INNGEST_EVENT_KEY,
    signingKey: process.env.INNGEST_SIGNING_KEY,
    
    // Job settings
    maxRetries: parseInt(process.env.INNGEST_MAX_RETRIES || '3'),
    timeout: parseInt(process.env.INNGEST_TIMEOUT || '600000'), // 10 minutes
  },

  // Development settings
  development: {
    logLevel: process.env.LOG_LEVEL || 'info',
    debugMode: process.env.NODE_ENV === 'development',
  }
};

/**
 * Validate required environment variables
 */
export function validateConfig() {
  const required = [];

  if (!config.ai.geminiApiKey) {
    required.push('GOOGLE_GENERATIVE_AI_API_KEY');
  }

  if (!config.storage.vercelBlobToken) {
    required.push('BLOB_READ_WRITE_TOKEN');
  }

  if (required.length > 0) {
    throw new Error(`Missing required environment variables: ${required.join(', ')}`);
  }
}

/**
 * Get configuration for specific feature
 */
export const getAIConfig = () => config.ai;
export const getVideoConfig = () => config.video;
export const getStorageConfig = () => config.storage;
export const getInngestConfig = () => config.inngest;