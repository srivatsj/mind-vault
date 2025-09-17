'use server';

import { auth } from '@/lib/auth';
import { headers } from 'next/headers';
import { CategoriesService } from '../services/categories.service';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';

// Server Action wrapper to ensure authentication
async function requireAuth() {
  const session = await auth.api.getSession({
    headers: await headers()
  });
  if (!session?.user?.id) {
    redirect('/sign-in');
  }
  return session.user.id;
}

/**
 * Create a new category
 */
export async function createCategory(data: {
  name: string;
  description?: string;
  color?: string;
}) {
  try {
    await requireAuth(); // Ensure user is authenticated

    const result = await CategoriesService.createCategory(data);

    if (result.success) {
      revalidatePath('/categories');
      revalidatePath('/library');
    }

    return result;
  } catch (error) {
    console.error('Failed to create category:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create category'
    };
  }
}

/**
 * Get all categories
 */
export async function getCategories() {
  try {
    await requireAuth(); // Ensure user is authenticated
    return await CategoriesService.getAllCategories();
  } catch (error) {
    console.error('Failed to get categories:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get categories'
    };
  }
}

/**
 * Get category by ID
 */
export async function getCategoryById(id: string, includeVideos = false) {
  try {
    await requireAuth(); // Ensure user is authenticated
    return await CategoriesService.getCategoryById(id, includeVideos);
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
export async function updateCategory(
  id: string,
  data: {
    name?: string;
    description?: string;
    color?: string;
  }
) {
  try {
    await requireAuth(); // Ensure user is authenticated

    const result = await CategoriesService.updateCategory(id, data);

    if (result.success) {
      revalidatePath('/categories');
      revalidatePath(`/categories/${id}`);
      revalidatePath('/library');
    }

    return result;
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
export async function deleteCategory(id: string) {
  try {
    await requireAuth(); // Ensure user is authenticated

    const result = await CategoriesService.deleteCategory(id);

    if (result.success) {
      revalidatePath('/categories');
      revalidatePath('/library');
    }

    return result;
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
export async function getCategoryVideos(
  categoryId: string,
  page = 1,
  pageSize = 20
) {
  try {
    await requireAuth(); // Ensure user is authenticated
    return await CategoriesService.getCategoryVideos(categoryId, page, pageSize);
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
export async function addVideoToCategory(videoId: string, categoryId: string) {
  try {
    await requireAuth(); // Ensure user is authenticated

    const result = await CategoriesService.addVideoToCategory(videoId, categoryId);

    if (result.success) {
      revalidatePath('/categories');
      revalidatePath(`/categories/${categoryId}`);
      revalidatePath('/library');
      revalidatePath(`/videos/${videoId}`);
    }

    return result;
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
export async function removeVideoFromCategory(videoId: string, categoryId: string) {
  try {
    await requireAuth(); // Ensure user is authenticated

    const result = await CategoriesService.removeVideoFromCategory(videoId, categoryId);

    if (result.success) {
      revalidatePath('/categories');
      revalidatePath(`/categories/${categoryId}`);
      revalidatePath('/library');
      revalidatePath(`/videos/${videoId}`);
    }

    return result;
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
export async function searchCategories(query: string) {
  try {
    await requireAuth(); // Ensure user is authenticated
    return await CategoriesService.searchCategories(query);
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
export async function getCategoryStats() {
  try {
    await requireAuth(); // Ensure user is authenticated
    return await CategoriesService.getCategoryStats();
  } catch (error) {
    console.error('Failed to get category stats:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get category stats'
    };
  }
}

/**
 * Get categories for a video
 */
export async function getVideoCategories(videoId: string) {
  try {
    await requireAuth(); // Ensure user is authenticated
    return await CategoriesService.getVideoCategories(videoId);
  } catch (error) {
    console.error('Failed to get video categories:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get video categories'
    };
  }
}