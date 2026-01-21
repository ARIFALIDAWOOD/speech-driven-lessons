"use client"

import { Button } from "@/components/ui/button"
import { Grid3x3, List } from "lucide-react"

export type ViewMode = "grid" | "list"

interface ViewToggleProps {
  activeView: ViewMode
  onViewChange: (mode: ViewMode) => void
}

export function ViewToggle({ activeView, onViewChange }: ViewToggleProps) {
  return (
    <div className="flex gap-2 border rounded-lg p-1">
      <Button
        variant={activeView === "grid" ? "default" : "ghost"}
        size="sm"
        onClick={() => onViewChange("grid")}
      >
        <Grid3x3 className="w-4 h-4" />
      </Button>
      <Button
        variant={activeView === "list" ? "default" : "ghost"}
        size="sm"
        onClick={() => onViewChange("list")}
      >
        <List className="w-4 h-4" />
      </Button>
    </div>
  )
}
