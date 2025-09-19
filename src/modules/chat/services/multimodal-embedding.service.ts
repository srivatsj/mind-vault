import { google } from '@ai-sdk/google';
import { generateObject } from 'ai';
import { z } from 'zod';

/**
 * Service for generating multimodal embeddings using various approaches
 */
export class MultimodalEmbeddingService {

  /**
   * Option 1: Use Gemini Vision to generate detailed image descriptions, then embed the combined text
   */
  static async embedImageWithGeminiVision(
    imageUrl: string,
    existingText: string = ''
  ): Promise<number[]> {
    try {
      // Step 1: Use Gemini Vision to analyze the image and generate a detailed description
      const imageAnalysis = await this.analyzeImageWithGemini(imageUrl);

      // Step 2: Combine the visual analysis with existing text
      const combinedText = [
        existingText,
        `Visual content: ${imageAnalysis.description}`,
        `Visual elements: ${imageAnalysis.elements.join(', ')}`,
        `Scene type: ${imageAnalysis.sceneType}`,
        `Text in image: ${imageAnalysis.textContent || 'None'}`
      ].filter(Boolean).join(' | ');

      // Step 3: Generate embedding for the combined text
      return await this.generateTextEmbedding(combinedText);

    } catch (error) {
      console.error('Failed to generate multimodal embedding:', error);
      // Fallback to text-only embedding
      return await this.generateTextEmbedding(existingText);
    }
  }

  /**
   * Use Gemini Vision to analyze an image and extract detailed descriptions
   */
  static async analyzeImageWithGemini(imageUrl: string): Promise<{
    description: string;
    elements: string[];
    sceneType: string;
    textContent?: string;
  }> {
    const analysisSchema = z.object({
      description: z.string().min(10).describe('Detailed description of what is shown in the image'),
      elements: z.array(z.string()).max(20).describe('List of key visual elements, objects, or UI components'),
      sceneType: z.enum(['code', 'diagram', 'presentation', 'interface', 'chart', 'screenshot', 'other']).describe('Type of content shown'),
      textContent: z.string().optional().describe('Any text visible in the image')
    });

    try {
      const result = await generateObject({
        model: google('gemini-2.0-flash-exp'),
        schema: analysisSchema,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: `Analyze this image from a video keyframe. Provide a detailed description focusing on:
                - What is being shown or demonstrated
                - Any code, diagrams, or technical content
                - UI elements or interface components
                - Text visible in the image
                - Overall context and purpose`
              },
              {
                type: 'image',
                image: imageUrl
              }
            ]
          }
        ],
        temperature: 0.3,
      });

      return result.object;
    } catch (error) {
      console.error('Failed to analyze image with Gemini:', error);
      // Return fallback analysis
      return {
        description: 'Image content from video keyframe',
        elements: ['visual-content'],
        sceneType: 'other',
        textContent: undefined
      };
    }
  }

  /**
   * Generate text embedding using Gemini
   */
  static async generateTextEmbedding(text: string): Promise<number[]> {
    try {
      const { GoogleGenerativeAI } = await import('@google/generative-ai');

      if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
        throw new Error('GOOGLE_GENERATIVE_AI_API_KEY is not set');
      }

      const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GENERATIVE_AI_API_KEY);
      const model = genAI.getGenerativeModel({ model: "text-embedding-004" });

      console.log(`Generating Gemini embedding for multimodal text: ${text.substring(0, 100)}...`);

      const result = await model.embedContent(text.substring(0, 8192)); // Limit to model's context

      if (!result.embedding?.values) {
        throw new Error('No embedding values returned from Gemini');
      }

      console.log(`✅ Generated multimodal embedding with ${result.embedding.values.length} dimensions`);
      return result.embedding.values;
    } catch (error) {
      console.error('Failed to generate Gemini embedding:', error);

      // Fallback to mock embedding for development
      console.warn('Using fallback mock embedding due to API error');
      return new Array(768).fill(0).map(() => Math.random() - 0.5); // Use Gemini's actual dimension
    }
  }

  /**
   * Option 2: Use CLIP-like embedding (when available)
   * This would encode both image and text into the same embedding space
   */
  static async embedImageWithCLIP(
    imageUrl: string,
    textContent: string
  ): Promise<{
    imageEmbedding: number[];
    textEmbedding: number[];
    combinedEmbedding: number[];
  }> {
    // TODO: Implement CLIP-style multimodal embedding
    // This would require a service like OpenAI's CLIP or Hugging Face models

    console.log(`CLIP embedding not yet implemented for image: ${imageUrl.substring(0, 50)} and text: ${textContent.substring(0, 50)}`);
    const mockEmbedding = new Array(768).fill(0).map(() => Math.random() - 0.5);

    return {
      imageEmbedding: mockEmbedding,
      textEmbedding: mockEmbedding,
      combinedEmbedding: mockEmbedding
    };
  }

  /**
   * Option 3: Hybrid approach - separate image and text embeddings with weighted combination
   */
  static async embedImageTextHybrid(
    imageUrl: string,
    textContent: string,
    imageWeight: number = 0.6, // Adjust based on importance of visual vs text
    textWeight: number = 0.4
  ): Promise<number[]> {
    try {
      // Get detailed image analysis
      const imageAnalysis = await this.analyzeImageWithGemini(imageUrl);

      // Create image-focused embedding
      const imageText = `${imageAnalysis.description} ${imageAnalysis.elements.join(' ')}`;
      const imageEmbedding = await this.generateTextEmbedding(imageText);

      // Create text-focused embedding
      const textEmbedding = await this.generateTextEmbedding(textContent);

      // Combine with weights
      const combinedEmbedding = imageEmbedding.map((val, i) => {
        return (val * imageWeight) + (textEmbedding[i] * textWeight);
      });

      return combinedEmbedding;
    } catch (error) {
      console.error('Failed to generate hybrid embedding:', error);
      return await this.generateTextEmbedding(textContent);
    }
  }

  /**
   * Helper function for consistent hashing
   */
  private static hashString(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return hash * 0.000001;
  }

  /**
   * Choose the best embedding approach based on content type and availability
   */
  static async embedKeyframeContent(
    imageUrl: string,
    textContent: string,
    options: {
      approach?: 'vision-description' | 'clip' | 'hybrid';
      imageWeight?: number;
      textWeight?: number;
    } = {}
  ): Promise<number[]> {
    const {
      approach = 'vision-description',
      imageWeight = 0.6,
      textWeight = 0.4
    } = options;

    switch (approach) {
      case 'vision-description':
        return await this.embedImageWithGeminiVision(imageUrl, textContent);

      case 'hybrid':
        return await this.embedImageTextHybrid(imageUrl, textContent, imageWeight, textWeight);

      case 'clip':
        const clipResult = await this.embedImageWithCLIP(imageUrl, textContent);
        return clipResult.combinedEmbedding;

      default:
        return await this.embedImageWithGeminiVision(imageUrl, textContent);
    }
  }
}