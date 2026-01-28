"use client"

import { BookOpen, Upload } from "lucide-react"
import { cn } from "@/lib/utils"

export type CourseTab = "start-new" | "contribute"

interface CourseSubNavProps {
  activeTab: CourseTab
  onTabChange: (tab: CourseTab) => void
  className?: string
}

export function CourseSubNav({ activeTab, onTabChange, className }: CourseSubNavProps) {
  const tabs = [
    {
      id: "start-new" as CourseTab,
      label: "Start New",
      icon: BookOpen,
      description: "Browse and start learning courses",
    },
    {
      id: "contribute" as CourseTab,
      label: "Contribute",
      icon: Upload,
      description: "Upload materials to help others learn",
    },
  ]

  return (
    <div className={cn("border-b", className)}>
      <nav className="flex gap-4" aria-label="Course navigation">
        {tabs.map((tab) => {
          const Icon = tab.icon
          const isActive = activeTab === tab.id

          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={cn(
                "flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors",
                isActive
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground/50"
              )}
              aria-current={isActive ? "page" : undefined}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          )
        })}
      </nav>
    </div>
  )
}
