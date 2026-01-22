"use client";

import { Button } from "@/components/ui/button";
import { LogOut, Maximize, Minimize } from "lucide-react";

interface CourseControlsProps {
  onExitClick: () => void;
  isFullScreen: boolean;
  toggleFullScreen: () => void;
}

export function CourseControls({
  onExitClick,
  isFullScreen,
  toggleFullScreen,
}: CourseControlsProps) {
  return (
    <div className="absolute top-4 right-4 z-50 flex gap-2">
      <Button
        variant="outline"
        size="icon"
        onClick={toggleFullScreen}
        className="bg-white/90 hover:bg-white"
      >
        {isFullScreen ? (
          <Minimize className="h-4 w-4" />
        ) : (
          <Maximize className="h-4 w-4" />
        )}
      </Button>
      <Button
        variant="outline"
        size="icon"
        onClick={onExitClick}
        className="bg-white/90 hover:bg-white text-red-600 hover:text-red-700"
      >
        <LogOut className="h-4 w-4" />
      </Button>
    </div>
  );
}
