"use client";

import { Card, CardContent } from "@/components/ui/card";
import { PlayCircle } from "lucide-react";

interface Tutorial {
  id: number;
  title: string;
  image: string;
  videoUrl: string;
}

interface TutorialCardProps {
  tutorial: Tutorial;
}

export function TutorialCard({ tutorial }: TutorialCardProps) {
  return (
    <Card className="overflow-hidden hover:shadow-lg transition-shadow cursor-pointer group">
      <div className="relative aspect-video bg-gray-100">
        <div className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-black/40 transition-colors">
          <PlayCircle className="w-16 h-16 text-white opacity-80 group-hover:opacity-100 transition-opacity" />
        </div>
        <img
          src={tutorial.image}
          alt={tutorial.title}
          className="w-full h-full object-cover"
        />
      </div>
      <CardContent className="p-4">
        <h3 className="font-semibold text-gray-900 line-clamp-2">
          {tutorial.title}
        </h3>
      </CardContent>
    </Card>
  );
}
