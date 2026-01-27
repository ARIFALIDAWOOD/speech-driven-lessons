"use client";

import * as React from "react";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

export interface BreadcrumbProps {
  items: BreadcrumbItem[];
  separator?: React.ReactNode;
  className?: string;
}

export function Breadcrumb({
  items,
  separator,
  className,
}: BreadcrumbProps) {
  if (items.length === 0) {
    return null;
  }

  const separatorElement = separator ?? (
    <ChevronRight className="h-4 w-4 text-gray-400 mx-1 flex-shrink-0" />
  );

  return (
    <nav
      className={cn("flex items-center flex-wrap gap-1 py-2", className)}
      aria-label="Breadcrumb"
    >
      {items.map((item, index) => {
        const isLast = index === items.length - 1;
        const isClickable = !!item.href && !isLast;

        return (
          <div key={`${item.label}-${index}`} className="flex items-center">
            {isClickable ? (
              <Link
                href={item.href!}
                className={cn(
                  "inline-flex items-center px-2 py-1 rounded-md text-sm",
                  "bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors"
                )}
              >
                <span className="truncate max-w-[200px]">{item.label}</span>
              </Link>
            ) : (
              <span
                className={cn(
                  "inline-flex items-center px-2 py-1 rounded-md text-sm",
                  isLast
                    ? "bg-blue-100 text-blue-800 font-medium"
                    : "bg-gray-100 text-gray-700"
                )}
              >
                <span className="truncate max-w-[200px]">{item.label}</span>
              </span>
            )}
            {!isLast && separatorElement}
          </div>
        );
      })}
    </nav>
  );
}

export interface BreadcrumbLinkProps
  extends React.ComponentPropsWithoutRef<typeof Link> {
  isCurrentPage?: boolean;
}

export function BreadcrumbLink({
  isCurrentPage,
  className,
  ...props
}: BreadcrumbLinkProps) {
  return (
    <Link
      aria-current={isCurrentPage ? "page" : undefined}
      className={cn(
        "inline-flex items-center px-2 py-1 rounded-md text-sm transition-colors",
        isCurrentPage
          ? "bg-blue-100 text-blue-800 font-medium"
          : "bg-gray-100 text-gray-700 hover:bg-gray-200",
        className
      )}
      {...props}
    />
  );
}

export function BreadcrumbSeparator({
  children,
  className,
}: {
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      role="presentation"
      aria-hidden="true"
      className={cn("mx-1 flex-shrink-0", className)}
    >
      {children ?? <ChevronRight className="h-4 w-4 text-gray-400" />}
    </span>
  );
}
