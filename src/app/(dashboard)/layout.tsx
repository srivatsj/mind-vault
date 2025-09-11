"use client";

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
  const { data: session } = authClient.useSession();

  if (!session) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <SidebarProvider defaultOpen={true}>
      <div className="flex min-h-screen w-full">
        <Sidebar variant="inset" className="border-r">
          <SidebarHeader className="border-b border-sidebar-border/50">
            <div className="flex items-center gap-3 px-3 py-4">
              <div className="p-2 rounded-lg bg-sidebar-primary">
                <Brain className="h-5 w-5 text-sidebar-primary-foreground" />
              </div>
              <div className="flex flex-col">
                <span className="font-bold text-lg text-sidebar-primary">MindVault</span>
                <span className="text-xs text-sidebar-foreground/70">AI Knowledge Hub</span>
              </div>
            </div>
          </SidebarHeader>
          
          <SidebarContent>
            <SidebarGroup>
              <SidebarGroupLabel>Main</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {sidebarItems.map((item) => (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton
                        asChild
                        isActive={pathname === item.url}
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
                  <SidebarMenuButton asChild>
                    <a href={item.url}>
                      <item.icon />
                      <span>{item.title}</span>
                    </a>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
              <SidebarMenuItem>
                <SidebarMenuButton
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
        
        <SidebarInset className="flex-1">
          <div className="flex-1">
            {children}
          </div>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
};

export default DashboardLayout;