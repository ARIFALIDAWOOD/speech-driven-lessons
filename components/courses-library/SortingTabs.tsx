"use client"

import { Button } from "@/components/ui/button"

export type SortOption = "relevant" | "newest" | "views" | "recent" | "popular" | "alphabetical" | "duration"

interface SortingTabsProps {
  activeSort: SortOption
  onSort: (sort: SortOption) => void
}

export function SortingTabs({ activeSort, onSort }: SortingTabsProps) {
  const tabs: { label: string; value: SortOption }[] = [
    { label: "Relevant", value: "relevant" },
    { label: "Newest", value: "newest" },
    { label: "Most Views", value: "views" },
  ]

  return (
    <div className="flex gap-2 flex-wrap">
      {tabs.map((tab) => (
        <Button
          key={tab.value}
          variant={activeSort === tab.value ? "default" : "outline"}
          size="sm"
          onClick={() => onSort(tab.value)}
        >
          {tab.label}
        </Button>
      ))}
    </div>
  )
}
