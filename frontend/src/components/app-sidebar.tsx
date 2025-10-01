"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import Image from "next/image";

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
  SidebarMenuSub,
  SidebarMenuSubItem,
  SidebarMenuSubButton,
  SidebarRail,
} from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import {
  Guitar,
  ListMusic,
  Timer,
  Library,
  FileText,
  Settings,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ChevronDown, Code } from "lucide-react";
import { Avatar } from "./ui/avatar";
import { AvatarFallback } from "@radix-ui/react-avatar";
import { useEffect, useState } from "react";
import { Button } from "./ui/button";

// ------------------ Navigation structure ------------------
const navMain = [
  {
    title: "Zones",
    href: "/app/zones",
    icon: Guitar,
    items: [
      { title: "Practice Zone", href: "/app/zones/practice" },
      { title: "Performance Zone", href: "/app/zones/performance" },
    ],
  },
  {
    title: "Chords charts",
    href: "/app/chords",
    icon: ListMusic,
  },
  {
    title: "Practise Session",
    href: "/app/practise",
    icon: Timer,
  },
  {
    title: "Song Library",
    href: "/app/library",
    icon: Library,
  },
  {
    title: "Documentation",
    href: "/app/docs",
    icon: FileText,
    items: [
      { title: "API Reference", href: "/app/docs/api" },
      { title: "Guides", href: "/app/docs/guides" },
    ],
  },
  {
    title: "Settings",
    href: "/app/settings",
    icon: Settings,
  },
];

// ------------------ Helpers ------------------
function getInitials(name: string) {
  if (!name) return "??";
  return name
    .split(" ")
    .map((n) => n[0]?.toUpperCase())
    .slice(0, 2)
    .join("");
}

// ------------------ Sidebar Component ------------------
export function AppSidebar() {
  const pathname = usePathname();
  const [user, setUser] = useState<{
    name: string;
    email: string;
    accountType: string;
    avatar: string | null;
  } | null>(null);

  useEffect(() => {
    async function fetchUser() {
      try {
        const res = await fetch(
          process.env.NEXT_PUBLIC_BACKEND_API + "/auth/me",
          { credentials: "include" }
        );
        if (!res.ok) throw new Error("Not authenticated");
        const data = await res.json();
        setUser(data);
      } catch {
        setUser(null);
      }
    }
    fetchUser();
  }, []);

  const displayName = user?.name || "Unknown User";
  const initials = getInitials(displayName);
  return (
    <Sidebar collapsible="icon">
      {/* Header with profile */}
      <SidebarHeader className="flex flex-row">
        <div className="flex items-center gap-3 px-2 py-2">
          <Avatar className="h-8 w-8 flex justify-center items-center bg-green-500">
            <AvatarFallback>{initials}</AvatarFallback>
          </Avatar>
          <div className="flex flex-col">
            <span className="text-sm font-medium leading-tight">
              {user?.name}
            </span>
            <span className="text-xs text-muted-foreground">
              {user?.accountType || "Personal"}
            </span>
          </div>
        </div>
        <div className="">
          <Code className="mx-auto w-4 h-4 " />
        </div>
      </SidebarHeader>

      {/* Navigation */}
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navMain.map((item) => {
                const Icon = item.icon;
                const active = pathname?.startsWith(item.href);

                if (item.items) {
                  // has submenu → make it collapsible
                  return (
                    <Collapsible key={item.href} asChild defaultOpen={false}>
                      <SidebarMenuItem>
                        <CollapsibleTrigger asChild>
                          <SidebarMenuButton
                            tooltip={item.title}
                            className={cn(
                              "justify-between",
                              active && "bg-accent text-accent-foreground"
                            )}
                          >
                            <div className="flex items-center gap-2">
                              <Icon className="size-4" />
                              <span>{item.title}</span>
                            </div>
                            <ChevronDown className="ml-auto size-4 transition-transform duration-200 data-[state=open]:rotate-180" />
                          </SidebarMenuButton>
                        </CollapsibleTrigger>

                        <CollapsibleContent>
                          <SidebarMenuSub>
                            {item.items.map((sub) => (
                              <SidebarMenuSubItem key={sub.href}>
                                <SidebarMenuSubButton asChild>
                                  <Link href={sub.href}>{sub.title}</Link>
                                </SidebarMenuSubButton>
                              </SidebarMenuSubItem>
                            ))}
                          </SidebarMenuSub>
                        </CollapsibleContent>
                      </SidebarMenuItem>
                    </Collapsible>
                  );
                }

                // regular link
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

      {/* Footer with just name + email */}
      <SidebarFooter>
        <Separator />
        <div className="px-2 py-3 text-left">
          <p className="truncate text-sm font-medium">{user?.name}</p>
          <p className="truncate text-xs text-muted-foreground">
            {user?.email}
          </p>
        </div>
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  );
}
