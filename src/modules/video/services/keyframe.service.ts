import ffmpeg from 'fluent-ffmpeg';
import { promises as fs, createWriteStream } from 'fs';
import path from 'path';
import ytdl from '@distube/ytdl-core';
import { tmpdir } from 'os';

export interface KeyframeOptions {
  intervals?: number[];  // Specific timestamps in seconds
  count?: number;        // Number of evenly spaced keyframes
  quality?: number;      // JPEG quality (1-31, lower is better)
  width?: number;        // Output width (maintains aspect ratio)
  height?: number;       // Output height (maintains aspect ratio)
}

export interface KeyframeResult {
  timestamp: number;
  filename: string;
  path: string;
  size?: number;
}

export interface KeyframeExtractionResult {
  success: boolean;
  keyframes: KeyframeResult[];
  tempDir: string;
  videoPath?: string;
  duration?: number;
  error?: string;
}

export class KeyframeService {
  private static readonly DEFAULT_OPTIONS: Required<KeyframeOptions> = {
    intervals: [],
    count: 10,
    quality: 2,  // High quality JPEG
    width: 1280,
    height: 720
  };

  /**
   * Extract keyframes from a YouTube video
   */
  static async extractKeyframes(
    videoId: string, 
    options: KeyframeOptions = {}
  ): Promise<KeyframeExtractionResult> {
    const config = { ...this.DEFAULT_OPTIONS, ...options };
    const tempDir = await this.createTempDirectory(videoId);
    
    try {
      // Step 1: Download video
      const videoPath = await this.downloadVideo(videoId, tempDir);
      
      // Step 2: Get video duration
      const duration = await this.getVideoDuration(videoPath);
      
      // Step 3: Calculate keyframe timestamps
      const timestamps = config.intervals.length > 0 
        ? config.intervals
        : this.calculateEvenIntervals(duration, config.count);
      
      // Step 4: Extract keyframes
      const keyframes = await this.extractKeyframesFromVideo(
        videoPath, 
        timestamps, 
        tempDir,
        config
      );
      
      return {
        success: true,
        keyframes,
        tempDir,
        videoPath,
        duration
      };
      
    } catch (error) {
      // Cleanup on error
      await this.cleanup(tempDir);
      
      return {
        success: false,
        keyframes: [],
        tempDir,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  /**
   * Extract keyframes from local video file
   */
  static async extractKeyframesFromFile(
    videoPath: string,
    options: KeyframeOptions = {}
  ): Promise<KeyframeExtractionResult> {
    const config = { ...this.DEFAULT_OPTIONS, ...options };
    const videoId = path.basename(videoPath, path.extname(videoPath));
    const tempDir = await this.createTempDirectory(videoId);
    
    try {
      // Get video duration
      const duration = await this.getVideoDuration(videoPath);
      
      // Calculate keyframe timestamps
      const timestamps = config.intervals.length > 0 
        ? config.intervals
        : this.calculateEvenIntervals(duration, config.count);
      
      // Extract keyframes
      const keyframes = await this.extractKeyframesFromVideo(
        videoPath, 
        timestamps, 
        tempDir,
        config
      );
      
      return {
        success: true,
        keyframes,
        tempDir,
        videoPath,
        duration
      };
      
    } catch (error) {
      await this.cleanup(tempDir);
      
      return {
        success: false,
        keyframes: [],
        tempDir,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  /**
   * Download video using ytdl-core
   */
  private static async downloadVideo(videoId: string, tempDir: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;
      const videoPath = path.join(tempDir, `${videoId}.mp4`);
      const writeStream = createWriteStream(videoPath);
      
      const stream = ytdl(videoUrl, {
        quality: 'highestvideo',
        filter: format => format.container === 'mp4' && format.hasVideo
      });
      
      stream.pipe(writeStream);
      
      stream.on('error', (error: Error) => {
        reject(new Error(`Failed to download video: ${error.message}`));
      });
      
      writeStream.on('error', (error: Error) => {
        reject(new Error(`Failed to write video file: ${error.message}`));
      });
      
      writeStream.on('finish', () => {
        resolve(videoPath);
      });
    });
  }

  /**
   * Get video duration using ffmpeg
   */
  private static async getVideoDuration(videoPath: string): Promise<number> {
    return new Promise((resolve, reject) => {
      ffmpeg.ffprobe(videoPath, (err, metadata) => {
        if (err) {
          reject(new Error(`Failed to get video duration: ${err.message}`));
          return;
        }
        
        const duration = metadata.format.duration;
        if (!duration) {
          reject(new Error('Could not determine video duration'));
          return;
        }
        
        resolve(duration);
      });
    });
  }

  /**
   * Calculate evenly spaced intervals
   */
  private static calculateEvenIntervals(duration: number, count: number): number[] {
    const intervals: number[] = [];
    const step = duration / (count + 1);
    
    for (let i = 1; i <= count; i++) {
      intervals.push(Math.floor(step * i));
    }
    
    return intervals;
  }

  /**
   * Extract keyframes from video at specified timestamps
   */
  private static async extractKeyframesFromVideo(
    videoPath: string,
    timestamps: number[],
    tempDir: string,
    options: Required<KeyframeOptions>
  ): Promise<KeyframeResult[]> {
    const keyframes: KeyframeResult[] = [];
    
    // Process keyframes sequentially to avoid overwhelming the system
    for (const timestamp of timestamps) {
      try {
        const keyframe = await this.extractSingleKeyframe(
          videoPath, 
          timestamp, 
          tempDir, 
          options
        );
        if (keyframe) {
          keyframes.push(keyframe);
        }
      } catch (error) {
        console.warn(`Failed to extract keyframe at ${timestamp}s:`, error);
        // Continue with other keyframes even if one fails
      }
    }
    
    return keyframes;
  }

  /**
   * Extract a single keyframe
   */
  private static async extractSingleKeyframe(
    videoPath: string,
    timestamp: number,
    tempDir: string,
    options: Required<KeyframeOptions>
  ): Promise<KeyframeResult | null> {
    return new Promise((resolve, reject) => {
      const filename = `keyframe_${timestamp.toString().padStart(6, '0')}.jpg`;
      const outputPath = path.join(tempDir, filename);
      
      ffmpeg(videoPath)
        .seekInput(timestamp)
        .frames(1)
        .size(`${options.width}x${options.height}`)
        .outputOptions([
          '-vf', 'scale=-1:720:force_original_aspect_ratio=decrease',
          '-q:v', options.quality.toString()
        ])
        .output(outputPath)
        .on('error', (err) => {
          reject(new Error(`Failed to extract keyframe at ${timestamp}s: ${err.message}`));
        })
        .on('end', async () => {
          try {
            const stats = await fs.stat(outputPath);
            resolve({
              timestamp,
              filename,
              path: outputPath,
              size: stats.size
            });
          } catch {
            // File doesn't exist - likely timestamp beyond video duration
            console.warn(`Keyframe at ${timestamp}s not created (possibly beyond video duration)`);
            resolve(null); // Return null instead of rejecting
          }
        })
        .run();
    });
  }

  /**
   * Create temporary directory for processing
   */
  private static async createTempDirectory(videoId: string): Promise<string> {
    const tempDir = path.join(tmpdir(), 'mind-vault-keyframes', videoId);
    await fs.mkdir(tempDir, { recursive: true });
    return tempDir;
  }

  /**
   * Clean up temporary files and directories
   */
  static async cleanup(tempDir: string): Promise<void> {
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch (error) {
      console.warn(`Failed to cleanup temp directory ${tempDir}:`, error);
    }
  }

  /**
   * Get keyframe file size and validate
   */
  static async validateKeyframe(keyframePath: string): Promise<boolean> {
    try {
      const stats = await fs.stat(keyframePath);
      return stats.size > 0;
    } catch {
      return false;
    }
  }

  /**
   * Generate thumbnail from keyframe (smaller version)
   */
  static async generateThumbnail(
    keyframePath: string, 
    width: number = 320, 
    height: number = 180
  ): Promise<string> {
    return new Promise((resolve, reject) => {
      const thumbnailPath = keyframePath.replace('.jpg', '_thumb.jpg');
      
      ffmpeg(keyframePath)
        .size(`${width}x${height}`)
        .outputOptions(['-q:v', '3'])
        .output(thumbnailPath)
        .on('error', reject)
        .on('end', () => resolve(thumbnailPath))
        .run();
    });
  }
}