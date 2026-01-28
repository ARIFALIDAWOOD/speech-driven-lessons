"use client";

import Link from "next/link";
import { ChevronRight } from "lucide-react";

interface SectionHeaderProps {
  title: string;
  description?: string;
  actionHref?: string;
  actionText?: string;
}

export function SectionHeader({
  title,
  description,
  actionHref,
  actionText = "View All",
}: SectionHeaderProps) {
  return (
    <div className="flex justify-between items-end mb-4">
      <div>
        <h2 className="text-2xl font-bold text-foreground">{title}</h2>
        {description && (
          <p className="text-muted-foreground mt-1">{description}</p>
        )}
      </div>
      {actionHref && (
        <Link
          href={actionHref}
          className="flex items-center text-primary hover:text-primary/80 font-medium"
        >
          {actionText}
          <ChevronRight className="w-4 h-4 ml-1" />
        </Link>
      )}
    </div>
  );
}
