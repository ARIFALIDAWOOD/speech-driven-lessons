"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Coffee, Play, Clock, Brain } from "lucide-react";

interface BreakSuggestionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onTakeBreak: () => void;
  onContinue: () => void;
  timeElapsed: number; // minutes
  topicsCompleted: number;
}

export function BreakSuggestionModal({
  isOpen,
  onClose,
  onTakeBreak,
  onContinue,
  timeElapsed,
  topicsCompleted,
}: BreakSuggestionModalProps) {
  const formatTime = (minutes: number) => {
    const mins = Math.floor(minutes);
    return mins >= 60
      ? `${Math.floor(mins / 60)}h ${mins % 60}m`
      : `${mins} minutes`;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="mx-auto w-16 h-16 rounded-full bg-amber-500/10 flex items-center justify-center mb-4">
            <Coffee className="h-8 w-8 text-amber-600 dark:text-amber-400" />
          </div>
          <DialogTitle className="text-center text-xl">
            Time for a Break?
          </DialogTitle>
          <DialogDescription className="text-center">
            Great progress! You've been learning for a while.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-4 py-4">
          <div className="bg-primary/10 rounded-lg p-4 text-center">
            <Clock className="h-6 w-6 mx-auto text-primary mb-2" />
            <p className="text-2xl font-bold text-foreground">
              {formatTime(timeElapsed)}
            </p>
            <p className="text-xs text-primary">Time Spent</p>
          </div>
          <div className="bg-emerald-500/10 rounded-lg p-4 text-center">
            <Brain className="h-6 w-6 mx-auto text-emerald-600 dark:text-emerald-400 mb-2" />
            <p className="text-2xl font-bold text-foreground">
              {topicsCompleted}
            </p>
            <p className="text-xs text-emerald-600 dark:text-emerald-400">Topics Covered</p>
          </div>
        </div>

        <p className="text-sm text-muted-foreground text-center">
          Taking short breaks helps improve retention and prevents mental fatigue.
          A 5-10 minute break is recommended.
        </p>

        <DialogFooter className="sm:justify-center gap-3 mt-4">
          <Button
            variant="outline"
            onClick={onContinue}
            className="gap-2"
          >
            <Play className="h-4 w-4" />
            Keep Going
          </Button>
          <Button
            onClick={onTakeBreak}
            className="gap-2 bg-amber-600 hover:bg-amber-700"
          >
            <Coffee className="h-4 w-4" />
            Take a Break
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
