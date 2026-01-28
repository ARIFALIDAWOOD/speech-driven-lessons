"use client";

import { ReactNode } from "react";
import Link from "next/link";
import { Home, User, HelpCircle, Library, Settings, Brain } from "lucide-react";
import { UserMenu } from "./UserMenu";
import { ModeToggle } from "@/components/mode-toggle";

interface MainLayoutProps {
  children: ReactNode;
}

const navItems = [
  { href: "/dashboard", icon: Home, label: "Dashboard" },
  { href: "/courses", icon: Library, label: "Courses" },
  { href: "/admin", icon: Settings, label: "Admin" },
  { href: "/profile", icon: User, label: "Profile" },
  { href: "/help-center", icon: HelpCircle, label: "Help" },
];

export function MainLayout({ children }: MainLayoutProps) {
  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar */}
      <aside className="w-64 bg-card border-r border-border flex flex-col">
        <div className="p-4 border-b border-border flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-emerald-600 rounded-lg flex items-center justify-center shadow-lg shadow-emerald-500/30">
              <Brain className="w-4 h-4 text-white" />
            </div>
            <h1 className="font-bold text-lg tracking-tight">
              Anantra <span className="text-emerald-500">LMS</span>
            </h1>
          </div>
          <ModeToggle />
        </div>
        <nav className="flex-1 p-4">
          <ul className="space-y-2">
            {navItems.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className="flex items-center gap-3 px-3 py-2 rounded-lg text-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
                >
                  <item.icon className="w-5 h-5" />
                  <span>{item.label}</span>
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <div className="mt-auto border-t border-border p-4">
          <UserMenu />
        </div>
      </aside>
      {/* Main content */}
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  );
}
