"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { authClient } from "@/lib/auth-client";
import { useRouter } from "next/navigation";
import { useDashboard } from "../../hooks/useDashboard";
import Image from "next/image";
import {
  Search,
  Video,
  Library,
  MessageSquare,
  Tag,
  Clock,
  RefreshCw,
  CheckCircle,
  AlertCircle,
  TrendingUp,
} from "lucide-react";

export const HomeView = () => {
  const router = useRouter();
  const { data: session } = authClient.useSession();
  const { data: dashboardData, loading: dashboardLoading, error: dashboardError } = useDashboard();

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'failed':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      default:
        return <RefreshCw className="h-4 w-4 text-blue-500 animate-spin" />;
    }
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return 'Just now';
    if (diffInHours < 24) return `${diffInHours}h ago`;
    
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) return `${diffInDays}d ago`;
    
    const diffInWeeks = Math.floor(diffInDays / 7);
    return `${diffInWeeks}w ago`;
  };

  if (!session) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <RefreshCw className="h-8 w-8 animate-spin mr-2" />
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Top Bar */}
      <header className="flex h-16 shrink-0 items-center gap-2 border-b bg-background/95 backdrop-blur-sm">
        <div className="flex items-center justify-between w-full px-6">
          <div className="flex items-center gap-2">
            <h1 className="font-semibold">Dashboard</h1>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="relative max-w-sm">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search your knowledge..."
                className="pl-8"
              />
            </div>
            
            <Avatar className="h-8 w-8">
              <AvatarImage src={session.user.image || undefined} />
              <AvatarFallback>
                {session.user.name?.charAt(0) || "U"}
              </AvatarFallback>
            </Avatar>
          </div>
        </div>
      </header>
      
      {/* Main Content */}
      <div className="flex-1 px-6 py-6 overflow-y-auto">
            <div className="grid gap-6">
              {/* Welcome Section */}
              <div className="flex flex-col gap-2">
                <h2 className="text-3xl font-bold tracking-tight">
                  Welcome back, {session.user.name}!
                </h2>
                <p className="text-muted-foreground">
                  Build your second brain with AI-powered knowledge capture.
                </p>
              </div>
              
              {/* Quick Actions */}
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card 
                  className="hover:shadow-lg transition-all duration-200 cursor-pointer hover:border-primary group border-primary/10 bg-gradient-to-br from-primary/5 to-primary/10"
                  onClick={() => router.push("/add")}
                >
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">
                      Add YouTube Video
                    </CardTitle>
                    <div className="p-2 rounded-full bg-primary/10 group-hover:bg-primary/20 transition-colors">
                      <Video className="h-4 w-4 text-primary group-hover:scale-110 transition-transform" />
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-primary mb-1">+</div>
                    <p className="text-xs text-muted-foreground">
                      Extract knowledge from videos
                    </p>
                  </CardContent>
                </Card>
                
                <Card 
                  className="hover:shadow-lg transition-all duration-200 cursor-pointer hover:border-accent group border-accent/10 bg-gradient-to-br from-accent/5 to-accent/10"
                  onClick={() => router.push("/library")}
                >
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">
                      Browse Library
                    </CardTitle>
                    <div className="p-2 rounded-full bg-accent/10 group-hover:bg-accent/20 transition-colors">
                      <Library className="h-4 w-4 text-accent group-hover:scale-110 transition-transform" />
                    </div>
                  </CardHeader>
                  <CardContent>
                    {dashboardLoading ? (
                      <Skeleton className="h-8 w-12 mb-1" />
                    ) : (
                      <div className="text-2xl font-bold text-accent mb-1">
                        {dashboardData?.totalVideos || 0}
                      </div>
                    )}
                    <p className="text-xs text-muted-foreground">
                      Saved videos
                    </p>
                  </CardContent>
                </Card>
                
                <Card className="hover:shadow-lg transition-all duration-200 cursor-pointer hover:border-primary group border-primary/10 bg-gradient-to-br from-primary/5 to-primary/10">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">
                      Chat with AI
                    </CardTitle>
                    <div className="p-2 rounded-full bg-primary/10 group-hover:bg-primary/20 transition-colors">
                      <MessageSquare className="h-4 w-4 text-primary group-hover:scale-110 transition-transform" />
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-primary mb-1">?</div>
                    <p className="text-xs text-muted-foreground">
                      Ask questions about your notes
                    </p>
                  </CardContent>
                </Card>
                
                <Card className="hover:shadow-lg transition-all duration-200 cursor-pointer hover:border-accent group border-accent/10 bg-gradient-to-br from-accent/5 to-accent/10">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">
                      Categories
                    </CardTitle>
                    <div className="p-2 rounded-full bg-accent/10 group-hover:bg-accent/20 transition-colors">
                      <Tag className="h-4 w-4 text-accent group-hover:scale-110 transition-transform" />
                    </div>
                  </CardHeader>
                  <CardContent>
                    {dashboardLoading ? (
                      <Skeleton className="h-8 w-12 mb-1" />
                    ) : (
                      <div className="text-2xl font-bold text-accent mb-1">
                        {dashboardData?.totalCategories || 0}
                      </div>
                    )}
                    <p className="text-xs text-muted-foreground">
                      Categories
                    </p>
                  </CardContent>
                </Card>
              </div>
              
              {/* Processing Status Overview */}
              {dashboardData && (dashboardData.processingVideos > 0 || dashboardData.completedVideos > 0) && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <TrendingUp className="h-5 w-5" />
                      Processing Overview
                    </CardTitle>
                    <CardDescription>
                      Your video processing pipeline status
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="text-center p-4 rounded-lg bg-green-50 border border-green-200">
                        <div className="text-2xl font-bold text-green-600 mb-1">
                          {dashboardData.completedVideos}
                        </div>
                        <p className="text-xs text-green-600 font-medium">Completed</p>
                      </div>
                      
                      <div className="text-center p-4 rounded-lg bg-blue-50 border border-blue-200">
                        <div className="text-2xl font-bold text-blue-600 mb-1">
                          {dashboardData.processingVideos}
                        </div>
                        <p className="text-xs text-blue-600 font-medium">Processing</p>
                      </div>
                      
                      <div className="text-center p-4 rounded-lg bg-purple-50 border border-purple-200">
                        <div className="text-2xl font-bold text-purple-600 mb-1">
                          {dashboardData.totalTags}
                        </div>
                        <p className="text-xs text-purple-600 font-medium">Tags</p>
                      </div>
                      
                      <div className="text-center p-4 rounded-lg bg-orange-50 border border-orange-200">
                        <div className="text-2xl font-bold text-orange-600 mb-1">
                          {Math.round((dashboardData.completedVideos / Math.max(dashboardData.totalVideos, 1)) * 100)}%
                        </div>
                        <p className="text-xs text-orange-600 font-medium">Success Rate</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
              
              {/* Recent Activity & Popular Categories */}
              <div className="grid gap-6 lg:grid-cols-2">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Clock className="h-5 w-5" />
                      Recent Activity
                    </CardTitle>
                    <CardDescription>
                      Your latest knowledge captures
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {dashboardLoading ? (
                      <div className="space-y-4">
                        {[...Array(3)].map((_, i) => (
                          <div key={i} className="flex items-start gap-3">
                            <Skeleton className="h-10 w-10 rounded-lg" />
                            <div className="flex-1 space-y-2">
                              <Skeleton className="h-4 w-3/4" />
                              <Skeleton className="h-3 w-1/2" />
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : dashboardError ? (
                      <Alert>
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>
                          Failed to load recent activity
                        </AlertDescription>
                      </Alert>
                    ) : dashboardData?.recentActivity && dashboardData.recentActivity.length > 0 ? (
                      <div className="space-y-4">
                        {dashboardData.recentActivity.map((item) => (
                          <div 
                            key={item.id} 
                            className="flex items-start gap-3 p-2 rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                            onClick={() => {
                              if (item.status === 'completed') {
                                router.push(`/videos/${item.id}/summary`);
                              } else {
                                router.push(`/videos/${item.id}`);
                              }
                            }}
                          >
                            <div className="relative">
                              {item.thumbnailUrl ? (
                                <div className="w-10 h-10 rounded-lg overflow-hidden bg-muted">
                                  <Image
                                    src={item.thumbnailUrl}
                                    alt={item.title}
                                    width={40}
                                    height={40}
                                    className="w-full h-full object-cover"
                                  />
                                </div>
                              ) : (
                                <div className="p-2 bg-primary/10 rounded-lg">
                                  <Video className="h-4 w-4 text-primary" />
                                </div>
                              )}
                              <div className="absolute -bottom-1 -right-1">
                                {getStatusIcon(item.status)}
                              </div>
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate">
                                {item.title}
                              </p>
                              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                <span>{formatTimeAgo(item.createdAt)}</span>
                                {item.categories && item.categories.length > 0 && (
                                  <>
                                    <span>•</span>
                                    <span className="truncate">
                                      {item.categories.slice(0, 2).join(", ")}
                                    </span>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8 text-muted-foreground">
                        <Video className="h-8 w-8 mx-auto mb-2 opacity-50" />
                        <p className="text-sm">No videos yet</p>
                        <p className="text-xs mt-1">Add your first YouTube video to get started</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Tag className="h-5 w-5" />
                      Popular Categories
                    </CardTitle>
                    <CardDescription>
                      Your most used knowledge areas
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {dashboardLoading ? (
                      <div className="space-y-3">
                        {[...Array(4)].map((_, i) => (
                          <div key={i} className="flex items-center justify-between">
                            <Skeleton className="h-6 w-24 rounded-full" />
                            <Skeleton className="h-4 w-16" />
                          </div>
                        ))}
                      </div>
                    ) : dashboardError ? (
                      <Alert>
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>
                          Failed to load categories
                        </AlertDescription>
                      </Alert>
                    ) : dashboardData?.topCategories && dashboardData.topCategories.length > 0 ? (
                      <div className="space-y-3">
                        {dashboardData.topCategories.map((category, index) => (
                          <div key={category.name} className="flex items-center justify-between">
                            <Badge 
                              variant="secondary" 
                              className="font-medium"
                              style={{ 
                                backgroundColor: `${category.color}20`,
                                color: category.color,
                                borderColor: `${category.color}40`
                              }}
                            >
                              {category.name}
                            </Badge>
                            <div className="flex items-center gap-2">
                              <span className="text-sm text-muted-foreground font-medium">
                                {category.count} video{category.count !== 1 ? 's' : ''}
                              </span>
                              {index === 0 && <TrendingUp className="h-3 w-3 text-green-500" />}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8 text-muted-foreground">
                        <Tag className="h-8 w-8 mx-auto mb-2 opacity-50" />
                        <p className="text-sm">No categories yet</p>
                        <p className="text-xs mt-1">Categories will appear as you add videos</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
      </div>
    </div>
  );
};