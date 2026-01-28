"use client"

import { Badge } from "@/components/ui/badge"
import { MapPin, GraduationCap, BookOpen } from "lucide-react"

export interface UserClassification {
  state_id: string
  city_id: string
  board_id: string
  class_level: number
  state_name?: string
  city_name?: string
  board_name?: string
}

interface ClassificationDisplayProps {
  classification: UserClassification | null
  showLocation?: boolean
  compact?: boolean
  className?: string
}

export function ClassificationDisplay({
  classification,
  showLocation = true,
  compact = false,
  className = "",
}: ClassificationDisplayProps) {
  if (!classification) {
    return (
      <div className={`flex items-center gap-2 text-muted-foreground ${className}`}>
        <span className="text-sm">Classification not set</span>
      </div>
    )
  }

  const { city_name, state_name, board_name, class_level } = classification

  if (compact) {
    return (
      <div className={`flex flex-wrap items-center gap-2 ${className}`}>
        {class_level && (
          <Badge variant="default" className="bg-emerald-600">
            Class {class_level}
          </Badge>
        )}
        {board_name && (
          <Badge variant="secondary">{board_name}</Badge>
        )}
        {showLocation && city_name && state_name && (
          <Badge variant="outline">
            {city_name}, {state_name}
          </Badge>
        )}
      </div>
    )
  }

  return (
    <div className={`flex flex-wrap items-center gap-3 ${className}`}>
      {class_level && (
        <div className="flex items-center gap-1.5">
          <GraduationCap className="w-4 h-4 text-muted-foreground" />
          <Badge variant="default" className="bg-emerald-600">
            Class {class_level}
          </Badge>
        </div>
      )}

      {board_name && (
        <div className="flex items-center gap-1.5">
          <BookOpen className="w-4 h-4 text-muted-foreground" />
          <Badge variant="secondary">{board_name}</Badge>
        </div>
      )}

      {showLocation && city_name && state_name && (
        <div className="flex items-center gap-1.5">
          <MapPin className="w-4 h-4 text-muted-foreground" />
          <Badge variant="outline">
            {city_name}, {state_name}
          </Badge>
        </div>
      )}
    </div>
  )
}

// Summary text version for smaller displays
export function ClassificationSummary({
  classification,
  className = "",
}: {
  classification: UserClassification | null
  className?: string
}) {
  if (!classification) {
    return <span className={`text-muted-foreground ${className}`}>Not set</span>
  }

  const parts: string[] = []

  if (classification.class_level) {
    parts.push(`Class ${classification.class_level}`)
  }
  if (classification.board_name) {
    parts.push(classification.board_name)
  }
  if (classification.city_name && classification.state_name) {
    parts.push(`${classification.city_name}, ${classification.state_name}`)
  }

  return (
    <span className={className}>
      {parts.join(" | ")}
    </span>
  )
}
