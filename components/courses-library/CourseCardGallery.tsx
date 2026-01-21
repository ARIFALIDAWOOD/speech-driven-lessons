"use client"

import { CourseCard, CourseItem } from "./CourseCard"

interface CourseCardGalleryProps {
  item: CourseItem
}

export function CourseCardGallery({ item }: CourseCardGalleryProps) {
  return <CourseCard item={item} />
}
