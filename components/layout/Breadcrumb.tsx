"use client";

import Link from "next/link";
import { ChevronRight, Home } from "lucide-react";
import { cn } from "@/lib/utils";

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface BreadcrumbProps {
  items: BreadcrumbItem[];
  className?: string;
}

export function Breadcrumb({ items, className }: BreadcrumbProps) {
  return (
    <nav
      aria-label="Breadcrumb"
      className={cn("flex items-center text-sm", className)}
    >
      <ol className="flex items-center space-x-1">
        {/* Home/Dashboard link */}
        <li>
          <Link
            href="/dashboard"
            className="flex items-center text-gray-500 hover:text-emerald-600 transition-colors"
          >
            <Home className="h-4 w-4" />
            <span className="sr-only">Dashboard</span>
          </Link>
        </li>

        {items.map((item, index) => {
          const isLast = index === items.length - 1;

          return (
            <li key={index} className="flex items-center">
              <ChevronRight className="h-4 w-4 text-gray-400 mx-1" />
              {isLast || !item.href ? (
                <span
                  className={cn(
                    "font-medium",
                    isLast ? "text-gray-900" : "text-gray-500"
                  )}
                >
                  {item.label}
                </span>
              ) : (
                <Link
                  href={item.href}
                  className="text-gray-500 hover:text-emerald-600 transition-colors"
                >
                  {item.label}
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
