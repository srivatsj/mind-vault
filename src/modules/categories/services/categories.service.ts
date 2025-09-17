import { CategoriesDAO, Category, CreateCategoryData, UpdateCategoryData } from '../data/categories.dao';

export interface CategoriesServiceResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export class CategoriesService {
  /**
   * Create a new category
   */
  static async createCategory(
    data: CreateCategoryData
  ): Promise<CategoriesServiceResponse<Category>> {
    try {
      // Validate input
      if (!data.name || data.name.trim().length === 0) {
        return {
          success: false,
          error: 'Category name is required'
        };
      }

      if (data.name.length > 100) {
        return {
          success: false,
          error: 'Category name must be less than 100 characters'
        };
      }

      if (data.description && data.description.length > 500) {
        return {
          success: false,
          error: 'Category description must be less than 500 characters'
        };
      }

      // Check if category with same name already exists
      const existingCategories = await CategoriesDAO.searchCategories(data.name.trim());
      const exactMatch = existingCategories.find(
        cat => cat.name.toLowerCase() === data.name.trim().toLowerCase()
      );

      if (exactMatch) {
        return {
          success: false,
          error: 'A category with this name already exists'
        };
      }

      const category = await CategoriesDAO.createCategory({
        name: data.name.trim(),
        description: data.description?.trim(),
        color: data.color || '#10B981'
      });

      return {
        success: true,
        data: category
      };
    } catch (error) {
      console.error('Failed to create category:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create category'
      };
    }
  }

  /**
   * Get all categories with stats
   */
  static async getAllCategories(): Promise<CategoriesServiceResponse<Category[]>> {
    try {
      const categories = await CategoriesDAO.getAllCategories();
      return {
        success: true,
        data: categories
      };
    } catch (error) {
      console.error('Failed to get categories:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get categories'
      };
    }
  }

  /**
   * Get category by ID with optional video details
   */
  static async getCategoryById(
    id: string,
    includeVideos = false
  ): Promise<CategoriesServiceResponse<Category>> {
    try {
      const category = await CategoriesDAO.getCategoryById(id, includeVideos);

      if (!category) {
        return {
          success: false,
          error: 'Category not found'
        };
      }

      return {
        success: true,
        data: category
      };
    } catch (error) {
      console.error('Failed to get category:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get category'
      };
    }
  }

  /**
   * Update category
   */
  static async updateCategory(
    id: string,
    data: UpdateCategoryData
  ): Promise<CategoriesServiceResponse<void>> {
    try {
      // Validate input
      if (data.name !== undefined) {
        if (!data.name || data.name.trim().length === 0) {
          return {
            success: false,
            error: 'Category name cannot be empty'
          };
        }

        if (data.name.length > 100) {
          return {
            success: false,
            error: 'Category name must be less than 100 characters'
          };
        }

        // Check if another category with same name exists
        const existingCategories = await CategoriesDAO.searchCategories(data.name.trim());
        const exactMatch = existingCategories.find(
          cat => cat.name.toLowerCase() === data.name!.trim().toLowerCase() && cat.id !== id
        );

        if (exactMatch) {
          return {
            success: false,
            error: 'A category with this name already exists'
          };
        }
      }

      if (data.description !== undefined && data.description && data.description.length > 500) {
        return {
          success: false,
          error: 'Category description must be less than 500 characters'
        };
      }

      // Check if category exists
      const existing = await CategoriesDAO.getCategoryById(id);
      if (!existing) {
        return {
          success: false,
          error: 'Category not found'
        };
      }

      await CategoriesDAO.updateCategory(id, {
        ...(data.name !== undefined && { name: data.name.trim() }),
        ...(data.description !== undefined && { description: data.description?.trim() || undefined }),
        ...(data.color && { color: data.color })
      });

      return {
        success: true
      };
    } catch (error) {
      console.error('Failed to update category:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update category'
      };
    }
  }

  /**
   * Delete category
   */
  static async deleteCategory(id: string): Promise<CategoriesServiceResponse<void>> {
    try {
      // Check if category exists
      const existing = await CategoriesDAO.getCategoryById(id);
      if (!existing) {
        return {
          success: false,
          error: 'Category not found'
        };
      }

      await CategoriesDAO.deleteCategory(id);

      return {
        success: true
      };
    } catch (error) {
      console.error('Failed to delete category:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to delete category'
      };
    }
  }

  /**
   * Get videos for a category
   */
  static async getCategoryVideos(
    categoryId: string,
    page = 1,
    pageSize = 20
  ): Promise<CategoriesServiceResponse<{ videos: unknown[]; total: number; hasMore: boolean }>> {
    try {
      const offset = (page - 1) * pageSize;
      const videos = await CategoriesDAO.getCategoryVideos(categoryId, pageSize + 1, offset);

      const hasMore = videos.length > pageSize;
      const videosList = hasMore ? videos.slice(0, -1) : videos;

      return {
        success: true,
        data: {
          videos: videosList,
          total: videosList.length,
          hasMore
        }
      };
    } catch (error) {
      console.error('Failed to get category videos:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get category videos'
      };
    }
  }

  /**
   * Add video to category
   */
  static async addVideoToCategory(
    videoId: string,
    categoryId: string
  ): Promise<CategoriesServiceResponse<void>> {
    try {
      await CategoriesDAO.addVideoToCategory(videoId, categoryId);
      return {
        success: true
      };
    } catch (error) {
      console.error('Failed to add video to category:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to add video to category'
      };
    }
  }

  /**
   * Remove video from category
   */
  static async removeVideoFromCategory(
    videoId: string,
    categoryId: string
  ): Promise<CategoriesServiceResponse<void>> {
    try {
      await CategoriesDAO.removeVideoFromCategory(videoId, categoryId);
      return {
        success: true
      };
    } catch (error) {
      console.error('Failed to remove video from category:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to remove video from category'
      };
    }
  }

  /**
   * Search categories
   */
  static async searchCategories(
    query: string
  ): Promise<CategoriesServiceResponse<Category[]>> {
    try {
      if (!query || query.trim().length === 0) {
        return {
          success: true,
          data: []
        };
      }

      const categories = await CategoriesDAO.searchCategories(query.trim());
      return {
        success: true,
        data: categories
      };
    } catch (error) {
      console.error('Failed to search categories:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to search categories'
      };
    }
  }

  /**
   * Get category statistics
   */
  static async getCategoryStats(): Promise<CategoriesServiceResponse<{
    totalCategories: number;
    categoriesWithVideos: number;
    totalUniqueVideos: number;
    totalVideoAssignments: number;
    averageVideosPerCategory: number;
    topCategories: Array<{
      id: string;
      name: string;
      color: string;
      videoCount: number;
    }>;
  }>> {
    try {
      const stats = await CategoriesDAO.getCategoryStats();
      return {
        success: true,
        data: stats
      };
    } catch (error) {
      console.error('Failed to get category stats:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get category stats'
      };
    }
  }

  /**
   * Get video categories
   */
  static async getVideoCategories(
    videoId: string
  ): Promise<CategoriesServiceResponse<Category[]>> {
    try {
      const categories = await CategoriesDAO.getVideoCategories(videoId);
      return {
        success: true,
        data: categories
      };
    } catch (error) {
      console.error('Failed to get video categories:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get video categories'
      };
    }
  }
}