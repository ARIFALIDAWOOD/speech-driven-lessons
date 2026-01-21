"use client";

import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, ChevronRight, Clock, Star } from "lucide-react";
import { Button } from "@/components/ui/button";

interface FeaturedRecommendation {
  id: number;
  title: string;
  description: string;
  image: string;
  duration: number;
  match: number;
}

interface FeaturedRecommendationCardProps {
  recommendations: FeaturedRecommendation[];
}

export function FeaturedRecommendationCard({
  recommendations,
}: FeaturedRecommendationCardProps) {
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    if (recommendations.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % recommendations.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [recommendations.length]);

  if (recommendations.length === 0) {
    return (
      <Card className="h-full flex items-center justify-center">
        <CardContent>
          <p className="text-gray-500">No recommendations available</p>
        </CardContent>
      </Card>
    );
  }

  const current = recommendations[currentIndex];

  return (
    <Card className="h-full overflow-hidden relative group">
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent z-10" />
      <img
        src={current.image}
        alt={current.title}
        className="absolute inset-0 w-full h-full object-cover"
      />
      <CardContent className="relative z-20 h-full flex flex-col justify-end p-6 text-white">
        <Badge className="w-fit mb-2 bg-emerald-600">
          <Star className="w-3 h-3 mr-1" />
          {current.match}% Match
        </Badge>
        <h3 className="text-xl font-bold mb-1">{current.title}</h3>
        <p className="text-sm text-gray-200 mb-2 line-clamp-2">
          {current.description}
        </p>
        <div className="flex items-center text-sm text-gray-300">
          <Clock className="w-4 h-4 mr-1" />
          {current.duration} hours
        </div>
      </CardContent>
      {recommendations.length > 1 && (
        <>
          <Button
            variant="ghost"
            size="icon"
            className="absolute left-2 top-1/2 -translate-y-1/2 z-20 text-white opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={() =>
              setCurrentIndex(
                (prev) => (prev - 1 + recommendations.length) % recommendations.length
              )
            }
          >
            <ChevronLeft className="w-6 h-6" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-2 top-1/2 -translate-y-1/2 z-20 text-white opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={() =>
              setCurrentIndex((prev) => (prev + 1) % recommendations.length)
            }
          >
            <ChevronRight className="w-6 h-6" />
          </Button>
        </>
      )}
    </Card>
  );
}
