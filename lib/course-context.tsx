"use client";

import React, { createContext, useContext, useState, ReactNode } from "react";

export interface Course {
  id: string;
  title: string;
  description?: string;
  progress?: number;
  aiTutor?: boolean;
  startDate?: string;
  endDate?: string;
}

interface CourseContextType {
  currentCourse: Course | null;
  setCurrentCourse: (course: Course | null) => void;
  courses: Course[];
  setCourses: (courses: Course[]) => void;
  addCourse: (course: Course) => void;
  removeCourse: (id: string, title: string) => void;
}

const CourseContext = createContext<CourseContextType | undefined>(undefined);

export function CourseProvider({ children }: { children: ReactNode }) {
  const [currentCourse, setCurrentCourse] = useState<Course | null>(null);
  const [courses, setCourses] = useState<Course[]>([]);

  const addCourse = (course: Course) => {
    setCourses((prev) => [...prev, course]);
  };

  const removeCourse = (id: string, title: string) => {
    setCourses((prev) => prev.filter((c) => c.id !== id));
  };

  return (
    <CourseContext.Provider
      value={{
        currentCourse,
        setCurrentCourse,
        courses,
        setCourses,
        addCourse,
        removeCourse,
      }}
    >
      {children}
    </CourseContext.Provider>
  );
}

export function useCourse() {
  const context = useContext(CourseContext);
  if (context === undefined) {
    throw new Error("useCourse must be used within a CourseProvider");
  }
  return context;
}

// Alias for compatibility
export function useCourses() {
  return useCourse();
}
