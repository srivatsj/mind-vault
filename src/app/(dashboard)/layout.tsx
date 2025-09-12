"use client";

import { useEffect } from "react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarRail,
} from "@/components/ui/sidebar";
import { authClient } from "@/lib/auth-client";
import { useRouter, usePathname } from "next/navigation";
import {
  Brain,
  Home,
  Library,
  MessageSquare,
  Plus,
  Settings,
  Tag,
  User,
  BarChart3,
} from "lucide-react";

const sidebarItems = [
  {
    title: "Dashboard",
    icon: Home,
    url: "/",
  },
  {
    title: "Add Content",
    icon: Plus,
    url: "/add",
  },
  {
    title: "Library",
    icon: Library,
    url: "/library",
  },
  {
    title: "Chat",
    icon: MessageSquare,
    url: "/chat",
  },
  {
    title: "Categories",
    icon: Tag,
    url: "/categories",
  },
  {
    title: "Analytics",
    icon: BarChart3,
    url: "/analytics",
  },
];

const bottomItems = [
  {
    title: "Settings",
    icon: Settings,
    url: "/settings",
  },
];

interface DashboardLayoutProps {
  children: React.ReactNode;
}

const DashboardLayout = ({ children }: DashboardLayoutProps) => {
  const router = useRouter();
  const pathname = usePathname();
  const { data: session, isPending } = authClient.useSession();

  // Handle redirect to sign-in when not authenticated
  useEffect(() => {
    if (!isPending && !session) {
      router.push('/sign-in');
    }
  }, [isPending, session, router]);

  // Show loading spinner while checking authentication
  if (isPending) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  // Show redirecting message if not authenticated
  if (!session) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Redirecting to sign in...</p>
        </div>
      </div>
    );
  }

  return (
    <SidebarProvider defaultOpen={true}>
      <div className="flex min-h-screen w-full bg-gradient-to-br from-purple-600/15 via-purple-500/8 to-indigo-600/12">
        <Sidebar variant="inset" className="border-0 bg-transparent backdrop-blur-sm">
          <SidebarHeader className="border-b border-white/10">
            <div className="flex items-center gap-3 px-3 py-4">
              <div className="p-2 rounded-lg bg-white/20 backdrop-blur-md border border-white/20">
                <Brain className="h-5 w-5 text-white" />
              </div>
              <div className="flex flex-col">
                <span className="font-bold text-lg text-white">MindVault</span>
                <span className="text-xs text-white/70">AI Knowledge Hub</span>
              </div>
            </div>
          </SidebarHeader>
          
          <SidebarContent>
            <SidebarGroup>
              <SidebarGroupLabel className="text-white/60">Main</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {sidebarItems.map((item) => (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton
                        asChild
                        isActive={pathname === item.url}
                        className="text-white/80 hover:text-white hover:bg-white/10 data-[state=open]:bg-white/15"
                      >
                        <a href={item.url}>
                          <item.icon />
                          <span>{item.title}</span>
                        </a>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </SidebarContent>
          
          <SidebarFooter>
            <SidebarMenu>
              {bottomItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton 
                    asChild
                    className="text-white/80 hover:text-white hover:bg-white/10"
                  >
                    <a href={item.url}>
                      <item.icon />
                      <span>{item.title}</span>
                    </a>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
              <SidebarMenuItem>
                <SidebarMenuButton
                  className="text-white/80 hover:text-white hover:bg-white/10"
                  onClick={() =>
                    authClient.signOut({
                      fetchOptions: {
                        onSuccess: () => router.push("/sign-in"),
                      },
                    })
                  }
                >
                  <User />
                  <span>Sign Out</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarFooter>
          
          <SidebarRail />
        </Sidebar>
        
        <SidebarInset className="flex-1 p-3 pt-4 pr-4 pb-4">
          {children}
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
};

export default DashboardLayout;