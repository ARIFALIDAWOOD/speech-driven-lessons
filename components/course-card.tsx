"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { MoreVertical, Settings, Trash2 } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

interface CourseCardProps {
  id: string
  title: string
  progress?: number
  aiTutor?: boolean
  startDate?: string
  endDate?: string
  onCustomize?: () => void
  onRemove?: () => void
}

export function CourseCard({
  id,
  title,
  progress = 0,
  aiTutor = false,
  startDate,
  endDate,
  onCustomize,
  onRemove
}: CourseCardProps) {
  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardHeader>
        <div className="flex justify-between items-start">
          <CardTitle className="text-lg line-clamp-2">{title}</CardTitle>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreVertical className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {onCustomize && (
                <DropdownMenuItem onClick={onCustomize}>
                  <Settings className="w-4 h-4 mr-2" />
                  Customize
                </DropdownMenuItem>
              )}
              {onRemove && (
                <DropdownMenuItem onClick={onRemove} className="text-red-600">
                  <Trash2 className="w-4 h-4 mr-2" />
                  Remove
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {progress !== undefined && (
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-600">Progress</span>
                <span className="font-medium">{progress}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-emerald-600 h-2 rounded-full transition-all"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}
          
          {aiTutor && (
            <div className="text-sm text-gray-600">
              AI Tutor Available
            </div>
          )}
          
          {startDate && endDate && (
            <div className="text-sm text-gray-500">
              {new Date(startDate).toLocaleDateString()} - {new Date(endDate).toLocaleDateString()}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
