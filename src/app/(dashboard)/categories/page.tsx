'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  Tag,
  Plus,
  Search,
  Edit,
  Trash2,
  Video,
  Loader2,
  BarChart3,
  BookOpen
} from 'lucide-react';
import {
  getCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  getCategoryStats
} from '@/modules/categories/actions/categories.actions';

interface Category {
  id: string;
  name: string;
  description: string | null;
  color: string;
  createdAt: Date;
  videoCount?: number;
  recentVideos?: Array<{
    id: string;
    title: string;
    thumbnailUrl: string | null;
    createdAt: Date;
  }>;
}

interface CategoryStats {
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
}

interface CreateCategoryForm {
  name: string;
  description: string;
  color: string;
}

interface EditCategoryForm extends CreateCategoryForm {
  id: string;
}

const DEFAULT_COLORS = [
  '#10B981', // emerald
  '#3B82F6', // blue
  '#8B5CF6', // violet
  '#F59E0B', // amber
  '#EF4444', // red
  '#F97316', // orange
  '#EC4899', // pink
  '#06B6D4', // cyan
];

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [stats, setStats] = useState<CategoryStats | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);

  const [createForm, setCreateForm] = useState<CreateCategoryForm>({
    name: '',
    description: '',
    color: DEFAULT_COLORS[0]
  });

  const [editForm, setEditForm] = useState<EditCategoryForm>({
    id: '',
    name: '',
    description: '',
    color: DEFAULT_COLORS[0]
  });

  useEffect(() => {
    const init = async () => {
      setIsLoading(true);
      try {
        await Promise.all([
          loadCategories(),
          loadStats()
        ]);
      } finally {
        setIsLoading(false);
      }
    };
    init();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      await Promise.all([
        loadCategories(),
        loadStats()
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const loadCategories = async () => {
    try {
      const result = await getCategories();
      if (result.success && result.data) {
        setCategories(result.data);
      }
    } catch (error) {
      console.error('Failed to load categories:', error);
    }
  };

  const loadStats = async () => {
    try {
      const result = await getCategoryStats();
      if (result.success && result.data) {
        setStats(result.data);
      }
    } catch (error) {
      console.error('Failed to load stats:', error);
    }
  };

  const handleCreateCategory = async () => {
    if (!createForm.name.trim()) return;

    setIsCreating(true);
    try {
      const result = await createCategory({
        name: createForm.name.trim(),
        description: createForm.description.trim() || undefined,
        color: createForm.color
      });

      if (result.success) {
        setShowCreateDialog(false);
        setCreateForm({
          name: '',
          description: '',
          color: DEFAULT_COLORS[0]
        });
        await loadData();
      } else {
        // Handle error - you might want to show a toast here
        console.error('Failed to create category:', result.error);
      }
    } catch (error) {
      console.error('Failed to create category:', error);
    } finally {
      setIsCreating(false);
    }
  };

  const handleEditCategory = async () => {
    if (!editForm.name.trim() || !editForm.id) return;

    setIsEditing(true);
    try {
      const result = await updateCategory(editForm.id, {
        name: editForm.name.trim(),
        description: editForm.description.trim() || undefined,
        color: editForm.color
      });

      if (result.success) {
        setShowEditDialog(false);
        await loadData();
      } else {
        console.error('Failed to update category:', result.error);
      }
    } catch (error) {
      console.error('Failed to update category:', error);
    } finally {
      setIsEditing(false);
    }
  };

  const handleDeleteCategory = async (categoryId: string) => {
    setIsDeleting(true);
    try {
      const result = await deleteCategory(categoryId);
      if (result.success) {
        await loadData();
      } else {
        console.error('Failed to delete category:', result.error);
      }
    } catch (error) {
      console.error('Failed to delete category:', error);
    } finally {
      setIsDeleting(false);
    }
  };

  const openEditDialog = (category: Category) => {
    setEditForm({
      id: category.id,
      name: category.name,
      description: category.description || '',
      color: category.color
    });
    setShowEditDialog(true);
  };

  const filteredCategories = categories.filter(category =>
    category.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (category.description && category.description.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="flex flex-col h-full max-w-full">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b-0 bg-transparent">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-gradient-to-r from-emerald-500 to-teal-500 text-white">
            <Tag className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Categories</h1>
            <p className="text-xs text-gray-600">
              Organize your video content by topics
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
            <DialogTrigger asChild>
              <Button className="flex items-center gap-2 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600">
                <Plus className="h-4 w-4" />
                Create Category
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Category</DialogTitle>
                <DialogDescription>
                  Add a new category to organize your video content.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium">Name</label>
                  <Input
                    placeholder="Category name"
                    value={createForm.name}
                    onChange={(e) => setCreateForm(prev => ({ ...prev, name: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Description (optional)</label>
                  <Textarea
                    placeholder="Brief description of this category"
                    value={createForm.description}
                    onChange={(e) => setCreateForm(prev => ({ ...prev, description: e.target.value }))}
                    rows={3}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Color</label>
                  <div className="flex gap-2 mt-2">
                    {DEFAULT_COLORS.map((color) => (
                      <button
                        key={color}
                        onClick={() => setCreateForm(prev => ({ ...prev, color }))}
                        className={`w-8 h-8 rounded-full border-2 ${
                          createForm.color === color ? 'border-gray-900' : 'border-gray-300'
                        }`}
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setShowCreateDialog(false)}
                  disabled={isCreating}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleCreateCategory}
                  disabled={isCreating || !createForm.name.trim()}
                >
                  {isCreating ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Create'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Stats */}
      {stats && (
        <div className="p-4 pt-0">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Categories</CardTitle>
                <Tag className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.totalCategories}</div>
                <p className="text-xs text-muted-foreground">
                  {stats.categoriesWithVideos} with videos
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Unique Videos</CardTitle>
                <Video className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.totalUniqueVideos}</div>
                <p className="text-xs text-muted-foreground">
                  {stats.totalVideoAssignments} total assignments
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Avg per Category</CardTitle>
                <BarChart3 className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.averageVideosPerCategory}</div>
                <p className="text-xs text-muted-foreground">
                  assignments per category
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Top Category</CardTitle>
                <BookOpen className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-lg font-bold truncate">
                  {stats.topCategories[0]?.name || 'None'}
                </div>
                {stats.topCategories[0] && (
                  <p className="text-xs text-muted-foreground">
                    {stats.topCategories[0].videoCount} assignments
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* Search */}
      <div className="px-4 pb-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <Input
            placeholder="Search categories..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {/* Categories Grid */}
      <div className="flex-1 px-4 pb-4">
        <ScrollArea className="h-full">
          {isLoading ? (
            <div className="flex items-center justify-center h-32">
              <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
            </div>
          ) : filteredCategories.length === 0 ? (
            <div className="text-center py-8">
              <Tag className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                {searchQuery ? 'No categories found' : 'No categories yet'}
              </h3>
              <p className="text-gray-600 mb-4">
                {searchQuery
                  ? 'Try adjusting your search terms'
                  : 'Create your first category to organize your video content'
                }
              </p>
              {!searchQuery && (
                <Button
                  onClick={() => setShowCreateDialog(true)}
                  className="bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Create Category
                </Button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredCategories.map((category) => (
                <Card key={category.id} className="hover:shadow-md transition-shadow">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-4 h-4 rounded-full"
                          style={{ backgroundColor: category.color }}
                        />
                        <div>
                          <CardTitle className="text-lg">{category.name}</CardTitle>
                          <CardDescription className="text-sm">
                            {category.videoCount || 0} videos
                          </CardDescription>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openEditDialog(category)}
                          className="h-8 w-8"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete Category</AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to delete &ldquo;{category.name}&rdquo;? This action cannot be undone.
                                Videos will not be deleted, but they will be removed from this category.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleDeleteCategory(category.id)}
                                disabled={isDeleting}
                                className="bg-red-600 hover:bg-red-700"
                              >
                                {isDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Delete'}
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </div>
                  </CardHeader>
                  {category.description && (
                    <CardContent className="pt-0">
                      <p className="text-sm text-gray-600">{category.description}</p>
                    </CardContent>
                  )}
                </Card>
              ))}
            </div>
          )}
        </ScrollArea>
      </div>

      {/* Edit Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Category</DialogTitle>
            <DialogDescription>
              Update the category details.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Name</label>
              <Input
                placeholder="Category name"
                value={editForm.name}
                onChange={(e) => setEditForm(prev => ({ ...prev, name: e.target.value }))}
              />
            </div>
            <div>
              <label className="text-sm font-medium">Description (optional)</label>
              <Textarea
                placeholder="Brief description of this category"
                value={editForm.description}
                onChange={(e) => setEditForm(prev => ({ ...prev, description: e.target.value }))}
                rows={3}
              />
            </div>
            <div>
              <label className="text-sm font-medium">Color</label>
              <div className="flex gap-2 mt-2">
                {DEFAULT_COLORS.map((color) => (
                  <button
                    key={color}
                    onClick={() => setEditForm(prev => ({ ...prev, color }))}
                    className={`w-8 h-8 rounded-full border-2 ${
                      editForm.color === color ? 'border-gray-900' : 'border-gray-300'
                    }`}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowEditDialog(false)}
              disabled={isEditing}
            >
              Cancel
            </Button>
            <Button
              onClick={handleEditCategory}
              disabled={isEditing || !editForm.name.trim()}
            >
              {isEditing ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}