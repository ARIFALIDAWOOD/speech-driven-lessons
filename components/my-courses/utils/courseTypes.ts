export interface CourseProgress {
  completion: number;
  hours: number;
}

export interface CreateCourseProcess {
  is_creation_complete: boolean;
  current_step: number;
}

export interface UploadedFile {
  id: string;
  name: string;
  type: string;
  size: number;
  url?: string;
}

export interface CourseInfo {
  id: string;
  title: string;
  description: string | null;
  author: string;
  progress?: CourseProgress;
  created_at: string;
  last_updated_at: string;
  create_course_process: CreateCourseProcess;
  uploadedFiles: UploadedFile[];
  ai_voice: string;
  image?: string;
}
