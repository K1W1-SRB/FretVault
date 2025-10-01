"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarRail,
} from "@/components/ui/sidebar";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import {
  Guitar,
  ListMusic,
  BookOpenText,
  Timer,
  Library,
  FileText,
  Settings,
} from "lucide-react";
import { cn } from "@/lib/utils";

const navMain = [
  { title: "Zones", href: "/app/zones", icon: Guitar },
  { title: "Chords charts", href: "/app/chords", icon: ListMusic },
  { title: "Practise Session", href: "/app/practise", icon: Timer },
  { title: "Song Library", href: "/app/library", icon: Library },
  { title: "Documentation", href: "/app/docs", icon: FileText },
  { title: "Settings", href: "/app/settings", icon: Settings },
];

export function AppSidebar() {
  const pathname = usePathname();

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <div className="flex items-center gap-2 px-2 py-1.5">
          <Image
            src="/favicon.ico"
            alt="FretVault"
            width={20}
            height={20}
            className="rounded"
          />
          <span className="text-sm font-semibold tracking-tight">
            FretVault
          </span>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Me</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navMain.map((item) => {
                const Icon = item.icon;
                const active = pathname?.startsWith(item.href);
                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton
                      asChild
                      tooltip={item.title}
                      className={cn(
                        active && "bg-accent text-accent-foreground"
                      )}
                    >
                      <Link href={item.href}>
                        <Icon className="size-4" />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <Separator />
        <div className="flex items-center gap-2 px-2 py-2">
          <Avatar className="h-7 w-7">
            <AvatarImage src="" />
            <AvatarFallback>ME</AvatarFallback>
          </Avatar>
          <div className="min-w-0 leading-tight">
            <p className="truncate text-sm font-medium">Me</p>
            <p className="truncate text-xs text-muted-foreground">
              sebastiansomogyi@gmail.com
            </p>
          </div>
        </div>
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  );
}
