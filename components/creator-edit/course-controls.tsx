"use client"

import { Button } from "@/components/ui/button"
import { LogOut, Maximize2, Minimize2, Eye } from "lucide-react"

interface CourseControlsProps {
  onExitClick: () => void
  isFullScreen: boolean
  toggleFullScreen: () => void
  onPreviewClick?: () => void
}

export function CourseControls({
  onExitClick,
  isFullScreen,
  toggleFullScreen,
  onPreviewClick,
}: CourseControlsProps) {
  return (
    <div className="w-full border-b bg-white">
      <div className="max-w-[1800px] mx-auto px-6 h-16 flex items-center justify-between">
        <div className="font-semibold text-gray-900">Creator Edit</div>
        <div className="flex items-center gap-2">
          {onPreviewClick && (
            <Button variant="outline" onClick={onPreviewClick}>
              <Eye className="w-4 h-4 mr-2" />
              Preview
            </Button>
          )}
          <Button variant="outline" onClick={toggleFullScreen}>
            {isFullScreen ? (
              <>
                <Minimize2 className="w-4 h-4 mr-2" />
                Exit Fullscreen
              </>
            ) : (
              <>
                <Maximize2 className="w-4 h-4 mr-2" />
                Fullscreen
              </>
            )}
          </Button>
          <Button variant="destructive" onClick={onExitClick}>
            <LogOut className="w-4 h-4 mr-2" />
            Exit
          </Button>
        </div>
      </div>
    </div>
  )
}
