"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { authClient } from "@/lib/auth-client";
import { useRouter } from "next/navigation";
import {
  Search,
  Video,
  FileText,
  Library,
  MessageSquare,
  Tag,
  Brain,
  Clock,
} from "lucide-react";

export const HomeView = () => {
  const router = useRouter();
  const { data: session } = authClient.useSession();

  if (!session) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Top Bar */}
      <header className="flex h-16 shrink-0 items-center gap-2 border-b">
        <div className="flex items-center justify-between w-full px-4">
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
      <div className="flex-1 px-6 py-6">
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
                
                <Card className="hover:shadow-lg transition-all duration-200 cursor-pointer hover:border-accent group border-accent/10 bg-gradient-to-br from-accent/5 to-accent/10">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">
                      Browse Library
                    </CardTitle>
                    <div className="p-2 rounded-full bg-accent/10 group-hover:bg-accent/20 transition-colors">
                      <Library className="h-4 w-4 text-accent group-hover:scale-110 transition-transform" />
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-accent mb-1">24</div>
                    <p className="text-xs text-muted-foreground">
                      Saved summaries
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
                    <div className="text-2xl font-bold text-accent mb-1">8</div>
                    <p className="text-xs text-muted-foreground">
                      Active tags
                    </p>
                  </CardContent>
                </Card>
              </div>
              
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
                    <div className="space-y-4">
                      <div className="flex items-start gap-3">
                        <div className="p-2 bg-primary/10 rounded-lg">
                          <Video className="h-4 w-4 text-primary" />
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-medium">
                            Machine Learning Fundamentals
                          </p>
                          <p className="text-xs text-muted-foreground">
                            2 hours ago • AI/ML
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex items-start gap-3">
                        <div className="p-2 bg-accent/10 rounded-lg">
                          <FileText className="h-4 w-4 text-accent" />
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-medium">
                            React Hooks Deep Dive
                          </p>
                          <p className="text-xs text-muted-foreground">
                            1 day ago • Programming
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex items-start gap-3">
                        <div className="p-2 bg-primary/10 rounded-lg">
                          <Brain className="h-4 w-4 text-primary" />
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-medium">
                            Building a Second Brain
                          </p>
                          <p className="text-xs text-muted-foreground">
                            3 days ago • Productivity
                          </p>
                        </div>
                      </div>
                    </div>
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
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <Badge variant="secondary" className="bg-primary/20 text-primary hover:bg-primary/30 border border-primary/20 font-medium">
                          Machine Learning
                        </Badge>
                        <span className="text-sm text-muted-foreground font-medium">12 items</span>
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <Badge variant="secondary" className="bg-accent/20 text-accent hover:bg-accent/30 border border-accent/20 font-medium">
                          Programming
                        </Badge>
                        <span className="text-sm text-muted-foreground font-medium">8 items</span>
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <Badge variant="secondary" className="bg-primary/20 text-primary hover:bg-primary/30 border border-primary/20 font-medium">
                          Productivity
                        </Badge>
                        <span className="text-sm text-muted-foreground font-medium">6 items</span>
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <Badge variant="secondary" className="bg-accent/20 text-accent hover:bg-accent/30 border border-accent/20 font-medium">
                          Design
                        </Badge>
                        <span className="text-sm text-muted-foreground font-medium">4 items</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
      </div>
    </div>
  );
};