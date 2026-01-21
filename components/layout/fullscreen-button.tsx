"use client";

import { Maximize2, Minimize2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface FullscreenButtonProps {
  isFullScreen: boolean;
  onToggle: () => void;
}

export function FullscreenButton({ isFullScreen, onToggle }: FullscreenButtonProps) {
  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={onToggle}
      className="fixed top-4 right-4 z-50"
      title={isFullScreen ? "Exit fullscreen" : "Enter fullscreen"}
    >
      {isFullScreen ? (
        <Minimize2 className="w-5 h-5" />
      ) : (
        <Maximize2 className="w-5 h-5" />
      )}
    </Button>
  );
}
