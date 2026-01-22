"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { X, Filter } from "lucide-react"

export interface LibraryFilters {
  tags: string[]
  universities?: string[]
  dateRange?: {
    from?: Date
    to?: Date
  }
}

interface FiltersProps {
  filters?: LibraryFilters
  onFiltersChange?: (filters: LibraryFilters) => void
  availableTags?: string[]
  initialFilters?: LibraryFilters
  onFilterChange?: (filters: LibraryFilters) => void
}

export function Filters({
  filters: filtersProp,
  onFiltersChange,
  availableTags = [],
  initialFilters,
  onFilterChange
}: FiltersProps) {
  const filters = filtersProp || initialFilters || { tags: [], universities: [] }
  const handleFiltersChange = onFiltersChange || onFilterChange || (() => {})
  const [isOpen, setIsOpen] = useState(false)

  const toggleTag = (tag: string) => {
    const newTags = filters.tags.includes(tag)
      ? filters.tags.filter((t) => t !== tag)
      : [...filters.tags, tag]
    handleFiltersChange({ ...filters, tags: newTags })
  }

  const clearFilters = () => {
    handleFiltersChange({ tags: [] })
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setIsOpen(!isOpen)}
        >
          <Filter className="w-4 h-4 mr-2" />
          Filters
          {filters.tags.length > 0 && (
            <Badge variant="secondary" className="ml-2">
              {filters.tags.length}
            </Badge>
          )}
        </Button>
        {filters.tags.length > 0 && (
          <Button variant="ghost" size="sm" onClick={clearFilters}>
            Clear
          </Button>
        )}
      </div>

      {isOpen && (
        <div className="p-4 border rounded-lg space-y-3">
          <div>
            <h3 className="text-sm font-medium mb-2">Tags</h3>
            <div className="flex flex-wrap gap-2">
              {availableTags.map((tag) => (
                <Badge
                  key={tag}
                  variant={filters.tags.includes(tag) ? "default" : "outline"}
                  className="cursor-pointer"
                  onClick={() => toggleTag(tag)}
                >
                  {tag}
                  {filters.tags.includes(tag) && (
                    <X className="w-3 h-3 ml-1" />
                  )}
                </Badge>
              ))}
            </div>
          </div>
        </div>
      )}

      {filters.tags.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {filters.tags.map((tag) => (
            <Badge
              key={tag}
              variant="secondary"
              className="cursor-pointer"
              onClick={() => toggleTag(tag)}
            >
              {tag}
              <X className="w-3 h-3 ml-1" />
            </Badge>
          ))}
        </div>
      )}
    </div>
  )
}
