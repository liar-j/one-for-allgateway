import { Outlet, useLocation, useNavigate } from "react-router-dom";
import {
  SidebarProvider,
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarFooter,
  SidebarTrigger,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
} from "@/components/ui/sidebar";
import {
  LayoutDashboard,
  Cpu,
  ScrollText,
  BarChart3,
  Bot,
  Route,
  TestTubes,
  Shield,
} from "lucide-react";
import { CurrentUser } from "@/components/CurrentUser";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { useState } from "react";

const navItems = [
  { label: "仪表盘", icon: LayoutDashboard, path: "/" },
  { label: "模型管理", icon: Cpu, path: "/models" },
  { label: "访问密钥", icon: Shield, path: "/access-keys" },
  { label: "调用日志", icon: ScrollText, path: "/logs" },
  { label: "使用统计", icon: BarChart3, path: "/usage" },
  { label: "模型路由", icon: Route, path: "/routing" },
  { label: "代理测试", icon: TestTubes, path: "/proxy" },
  { label: "代理日志", icon: ScrollText, path: "/proxy-logs" },
];

export function AppLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const [open, setOpen] = useState(true);

  return (
    <SidebarProvider open={open} onOpenChange={setOpen}>
      <div className="flex min-h-screen w-full bg-[hsl(var(--background))]">
        <Sidebar className="border-r border-[hsl(var(--sidebar-border))] bg-[hsl(var(--sidebar-background))]">
          <SidebarHeader className="px-3 py-4">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[hsl(var(--primary))]">
                <Bot className="h-4 w-4 text-white" />
              </div>
              <div className={cn("transition-opacity", open ? "opacity-100" : "opacity-0 w-0 overflow-hidden")}>
                <p className="text-sm font-semibold text-[hsl(var(--sidebar-foreground))]">AI Model Gateway</p>
              </div>
            </div>
          </SidebarHeader>
          <SidebarContent className="px-3">
            <SidebarMenu>
              {navItems.map((item) => (
                <SidebarMenuItem key={item.path}>
                  <SidebarMenuButton
                    isActive={location.pathname === item.path}
                    onClick={() => navigate(item.path)}
                    className="text-[hsl(var(--sidebar-foreground))] hover:bg-[hsl(var(--sidebar-accent))] data-[active=true]:bg-[hsl(var(--sidebar-accent))] data-[active=true]:text-[hsl(var(--sidebar-primary))]"
                  >
                    <item.icon className="h-4 w-4" />
                    <span>{item.label}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarContent>
          <SidebarFooter className="px-3 py-3">
            <Separator className="mb-3 bg-[hsl(var(--sidebar-border))]" />
            <CurrentUser />
          </SidebarFooter>
        </Sidebar>
        <main className="flex-1">
          <header className="sticky top-0 z-10 flex h-16 items-center gap-4 border-b border-[hsl(var(--border))] bg-[hsl(var(--card))] px-6">
            <SidebarTrigger />
            <h1 className="text-lg font-semibold text-[hsl(var(--foreground))]">
              {navItems.find((n) => n.path === location.pathname)?.label || "仪表盘"}
            </h1>
          </header>
          <div className="p-6">
            <Outlet />
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
}
