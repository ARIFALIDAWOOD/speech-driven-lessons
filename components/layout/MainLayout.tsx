"use client";

import { ReactNode } from "react";
import Link from "next/link";
import { Home, BookOpen, Upload, User, HelpCircle, GraduationCap } from "lucide-react";
import { UserMenu } from "./UserMenu";
import { ModeToggle } from "@/components/mode-toggle";

interface MainLayoutProps {
  children: ReactNode;
}

const navItems = [
  { href: "/dashboard", icon: Home, label: "Dashboard" },
  { href: "/learn", icon: GraduationCap, label: "Learn" },
  { href: "/my-courses", icon: BookOpen, label: "My Courses" },
  { href: "/my-uploads", icon: Upload, label: "My Uploads" },
  { href: "/profile", icon: User, label: "Profile" },
  { href: "/help-center", icon: HelpCircle, label: "Help" },
];

export function MainLayout({ children }: MainLayoutProps) {
  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-gray-200 flex flex-col">
        <div className="p-4 border-b flex justify-between items-center">
          <h1 className="text-xl font-bold text-emerald-700">Anantra LMS</h1>
          <ModeToggle />
        </div>
        <nav className="flex-1 p-4">
          <ul className="space-y-2">
            {navItems.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className="flex items-center gap-3 px-3 py-2 rounded-lg text-gray-700 hover:bg-emerald-50 hover:text-emerald-700 transition-colors"
                >
                  <item.icon className="w-5 h-5" />
                  <span>{item.label}</span>
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <div className="mt-auto border-t p-4">
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
