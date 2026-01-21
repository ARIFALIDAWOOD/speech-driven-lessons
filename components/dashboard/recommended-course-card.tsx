"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Clock, Search } from "lucide-react";
import Link from "next/link";

interface RecommendedCourseCardProps {
  id: string;
  title: string;
  duration?: number;
  onClick?: () => void;
}

export function RecommendedCourseCard({
  id,
  title,
  duration,
  onClick,
}: RecommendedCourseCardProps) {
  return (
    <Card
      className="hover:shadow-lg transition-shadow cursor-pointer"
      onClick={onClick}
    >
      <CardContent className="p-4">
        <h3 className="font-semibold text-gray-900 mb-2 line-clamp-2">
          {title}
        </h3>
        {duration && (
          <div className="flex items-center text-sm text-gray-500">
            <Clock className="w-4 h-4 mr-1" />
            {duration} hours
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function RecommendedCoursesSearch() {
  return (
    <Link href="/courses-library">
      <Card className="hover:shadow-lg transition-shadow cursor-pointer h-full">
        <CardContent className="p-4 h-full flex flex-col items-center justify-center text-center">
          <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center mb-3">
            <Search className="w-6 h-6 text-emerald-700" />
          </div>
          <h3 className="font-semibold text-gray-900">Browse All Courses</h3>
          <p className="text-sm text-gray-500 mt-1">
            Find more courses that match your interests
          </p>
        </CardContent>
      </Card>
    </Link>
  );
}
