import { put, del, list, head } from '@vercel/blob';
import { promises as fs } from 'fs';
import path from 'path';
import { getStorageConfig } from '@/lib/config';

export interface UploadResult {
  url: string;
  filename: string;
  size: number;
  contentType?: string;
}

export interface StorageOptions {
  folder?: string;
  contentType?: string;
  cacheControlMaxAge?: number;
}

export interface KeyframeUpload {
  keyframes: UploadResult[];
  thumbnails?: UploadResult[];
  totalSize: number;
  uploadCount: number;
}

export class StorageService {
  private static readonly DEFAULT_CACHE_MAX_AGE = 31536000; // 1 year
  
  /**
   * Upload multiple keyframes to blob storage
   */
  static async uploadKeyframes(
    videoId: string, 
    keyframePaths: string[], 
    options: StorageOptions = {}
  ): Promise<KeyframeUpload> {
    const config = getStorageConfig();
    
    if (!config.vercelBlobToken) {
      throw new Error('Vercel Blob token not configured');
    }

    const keyframes: UploadResult[] = [];
    const thumbnails: UploadResult[] = [];
    let totalSize = 0;

    const folder = options.folder || `keyframes/${videoId}`;

    // Upload keyframes sequentially to avoid overwhelming the API
    for (const keyframePath of keyframePaths) {
      try {
        // Upload main keyframe
        const keyframeResult = await this.uploadFile(keyframePath, {
          ...options,
          folder: `${folder}/keyframes`,
          contentType: 'image/jpeg'
        });
        keyframes.push(keyframeResult);
        totalSize += keyframeResult.size;

        // Generate and upload thumbnail if enabled
        if (options.folder !== 'no-thumbnails') {
          const thumbnailPath = await this.generateThumbnailPath(keyframePath);
          if (await this.fileExists(thumbnailPath)) {
            const thumbnailResult = await this.uploadFile(thumbnailPath, {
              ...options,
              folder: `${folder}/thumbnails`,
              contentType: 'image/jpeg'
            });
            thumbnails.push(thumbnailResult);
            totalSize += thumbnailResult.size;
          }
        }

      } catch (error) {
        console.warn(`Failed to upload keyframe ${keyframePath}:`, error);
        // Continue with other keyframes
      }
    }

    return {
      keyframes,
      thumbnails: thumbnails.length > 0 ? thumbnails : undefined,
      totalSize,
      uploadCount: keyframes.length + (thumbnails?.length || 0)
    };
  }

  /**
   * Upload transcript data as JSON file
   */
  static async uploadTranscript(
    videoId: string,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    transcript: any,
    options: StorageOptions = {}
  ): Promise<UploadResult> {
    const config = getStorageConfig();
    
    if (!config.vercelBlobToken) {
      throw new Error('Vercel Blob token not configured');
    }

    const folder = options.folder || `transcripts`;
    const filename = `${videoId}-transcript.json`;
    const transcriptData = JSON.stringify(transcript, null, 2);

    const blob = await put(`${folder}/${filename}`, transcriptData, {
      access: 'public',
      contentType: 'application/json',
      cacheControlMaxAge: options.cacheControlMaxAge || this.DEFAULT_CACHE_MAX_AGE,
      allowOverwrite: true,
    });

    return {
      url: blob.url,
      filename,
      size: Buffer.byteLength(transcriptData, 'utf8'),
      contentType: 'application/json'
    };
  }

  /**
   * Upload AI analysis results
   */
  static async uploadAnalysisResults(
    videoId: string,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    analysisData: any,
    options: StorageOptions = {}
  ): Promise<UploadResult> {
    const config = getStorageConfig();
    
    if (!config.vercelBlobToken) {
      throw new Error('Vercel Blob token not configured');
    }

    const folder = options.folder || `analysis`;
    const filename = `${videoId}-analysis.json`;
    const data = JSON.stringify(analysisData, null, 2);

    const blob = await put(`${folder}/${filename}`, data, {
      access: 'public',
      contentType: 'application/json',
      cacheControlMaxAge: options.cacheControlMaxAge || this.DEFAULT_CACHE_MAX_AGE,
      allowOverwrite: true,
    });

    return {
      url: blob.url,
      filename,
      size: Buffer.byteLength(data, 'utf8'),
      contentType: 'application/json'
    };
  }

  /**
   * Upload a single file to blob storage
   */
  static async uploadFile(
    filePath: string, 
    options: StorageOptions = {}
  ): Promise<UploadResult> {
    const config = getStorageConfig();
    
    if (!config.vercelBlobToken) {
      throw new Error('Vercel Blob token not configured');
    }

    const fileBuffer = await fs.readFile(filePath);
    const filename = path.basename(filePath);
    const folder = options.folder || 'uploads';
    const blobPath = `${folder}/${filename}`;

    const blob = await put(blobPath, fileBuffer, {
      access: 'public',
      contentType: options.contentType || this.getContentType(filePath),
      cacheControlMaxAge: options.cacheControlMaxAge || this.DEFAULT_CACHE_MAX_AGE,
      allowOverwrite: true,
    });

    return {
      url: blob.url,
      filename,
      size: fileBuffer.length,
      contentType: options.contentType
    };
  }

  /**
   * Upload buffer data directly
   */
  static async uploadBuffer(
    buffer: Buffer,
    filename: string,
    options: StorageOptions = {}
  ): Promise<UploadResult> {
    const config = getStorageConfig();
    
    if (!config.vercelBlobToken) {
      throw new Error('Vercel Blob token not configured');
    }

    const folder = options.folder || 'uploads';
    const blobPath = `${folder}/${filename}`;

    const blob = await put(blobPath, buffer, {
      access: 'public',
      contentType: options.contentType || this.getContentType(filename),
      cacheControlMaxAge: options.cacheControlMaxAge || this.DEFAULT_CACHE_MAX_AGE,
      allowOverwrite: true,
    });

    return {
      url: blob.url,
      filename,
      size: buffer.length,
      contentType: options.contentType
    };
  }

  /**
   * Delete file from blob storage
   */
  static async deleteFile(url: string): Promise<boolean> {
    try {
      await del(url);
      return true;
    } catch (error) {
      console.error(`Failed to delete blob ${url}:`, error);
      return false;
    }
  }

  /**
   * Delete all files for a video
   */
  static async deleteVideoAssets(videoId: string): Promise<{deleted: number, failed: number}> {
    let deleted = 0;
    let failed = 0;

    try {
      // List all blobs for the video
      const blobs = await list({
        prefix: `keyframes/${videoId}/`
      });

      // Delete keyframes and thumbnails
      for (const blob of blobs.blobs) {
        const success = await this.deleteFile(blob.url);
        if (success) {
          deleted++;
        } else {
          failed++;
        }
      }

      // Delete transcript
      const transcriptBlobs = await list({
        prefix: `transcripts/${videoId}-transcript.json`
      });
      
      for (const blob of transcriptBlobs.blobs) {
        const success = await this.deleteFile(blob.url);
        if (success) {
          deleted++;
        } else {
          failed++;
        }
      }

      // Delete analysis results
      const analysisBlobs = await list({
        prefix: `analysis/${videoId}-analysis.json`
      });
      
      for (const blob of analysisBlobs.blobs) {
        const success = await this.deleteFile(blob.url);
        if (success) {
          deleted++;
        } else {
          failed++;
        }
      }

    } catch (error) {
      console.error(`Failed to delete video assets for ${videoId}:`, error);
    }

    return { deleted, failed };
  }

  /**
   * Get file information without downloading
   */
  static async getFileInfo(url: string): Promise<{size: number, contentType: string} | null> {
    try {
      const info = await head(url);
      return {
        size: info.size,
        contentType: info.contentType
      };
    } catch (error) {
      console.error(`Failed to get file info for ${url}:`, error);
      return null;
    }
  }

  /**
   * List all blobs with optional prefix filter
   */
  static async listFiles(prefix?: string, limit?: number): Promise<{url: string, size: number, uploadedAt: Date}[]> {
    try {
      const result = await list({
        prefix,
        limit: limit || 100
      });

      return result.blobs.map(blob => ({
        url: blob.url,
        size: blob.size,
        uploadedAt: blob.uploadedAt
      }));
    } catch (error) {
      console.error('Failed to list files:', error);
      return [];
    }
  }

  /**
   * Get storage usage statistics
   */
  static async getStorageStats(): Promise<{
    totalFiles: number;
    totalSize: number;
    keyframes: number;
    transcripts: number;
    analysis: number;
  }> {
    try {
      const allFiles = await this.listFiles(undefined, 1000);
      const stats = {
        totalFiles: allFiles.length,
        totalSize: allFiles.reduce((sum, file) => sum + file.size, 0),
        keyframes: 0,
        transcripts: 0,
        analysis: 0
      };

      // Count by type
      for (const file of allFiles) {
        if (file.url.includes('/keyframes/')) {
          stats.keyframes++;
        } else if (file.url.includes('/transcripts/')) {
          stats.transcripts++;
        } else if (file.url.includes('/analysis/')) {
          stats.analysis++;
        }
      }

      return stats;
    } catch (error) {
      console.error('Failed to get storage stats:', error);
      return {
        totalFiles: 0,
        totalSize: 0,
        keyframes: 0,
        transcripts: 0,
        analysis: 0
      };
    }
  }

  /**
   * Helper: Get content type from file extension
   */
  private static getContentType(filename: string): string {
    const ext = path.extname(filename).toLowerCase();
    const contentTypes: Record<string, string> = {
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.webp': 'image/webp',
      '.json': 'application/json',
      '.txt': 'text/plain',
      '.mp4': 'video/mp4',
      '.webm': 'video/webm'
    };
    return contentTypes[ext] || 'application/octet-stream';
  }

  /**
   * Helper: Check if file exists
   */
  private static async fileExists(filePath: string): Promise<boolean> {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Helper: Generate thumbnail path from keyframe path
   */
  private static async generateThumbnailPath(keyframePath: string): Promise<string> {
    const dir = path.dirname(keyframePath);
    const name = path.basename(keyframePath, path.extname(keyframePath));
    return path.join(dir, `${name}_thumb.jpg`);
  }

  /**
   * Cleanup old temporary files based on configuration
   */
  static async cleanupTempFiles(): Promise<{cleaned: number, errors: number}> {
    const config = getStorageConfig();
    
    if (!config.cleanupTempFiles) {
      return { cleaned: 0, errors: 0 };
    }

    // This would typically clean up local temp files
    // Implementation depends on your temp file storage strategy
    console.log('Cleanup temp files functionality needs implementation based on temp file strategy');
    return { cleaned: 0, errors: 0 };
  }
}