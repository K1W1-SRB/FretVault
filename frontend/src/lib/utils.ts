import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import {
  Guitar,
  ListMusic,
  Timer,
  Library,
  FileText,
  Settings,
  LayoutDashboard,
  MicVocal,
  NotebookPen,
} from "lucide-react";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const navMain = [
  {
    title: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    title: "Note Book",
    href: "/dashboard/notebook",
    icon: NotebookPen,
  },
  {
    title: "Song Library",
    href: "/dashboard/song-library",
    icon: Library,
  },
  {
    title: "Guitar Tuner",
    href: "/dashboard/tuner",
    icon: MicVocal,
  },
  {
    title: "Chords charts",
    href: "/dashboard/chords",
    icon: ListMusic,
  },
  {
    title: "Practice Session",
    href: "/dashboard/practice",
    icon: Timer,
  },
  {
    title: "Zones",
    href: "/dashboard/zones",
    icon: Guitar,
    items: [
      { title: "Practice Zone", href: "/dashboard/zones/practice" },
      { title: "Performance Zone", href: "/dashboard/zones/performance" },
    ],
  },
  {
    title: "Documentation",
    href: "/dashboard/docs",
    icon: FileText,
    items: [
      { title: "API Reference", href: "/docs/api" },
      { title: "Guides", href: "/docs/guides" },
    ],
  },
  {
    title: "Settings",
    href: "/dashboard/settings",
    icon: Settings,
  },
];
