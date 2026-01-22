"use client";

import { useState, useCallback, useRef } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  FileText,
  Upload,
  X,
  CheckCircle,
  AlertCircle,
  Loader2,
  BookOpen,
} from "lucide-react";

interface UploadedMaterial {
  id: string;
  name: string;
  size: number;
  status: "uploading" | "processing" | "ready" | "error";
  progress: number;
  error?: string;
}

interface MaterialsUploadProps {
  sessionId: string;
  onMaterialsReady: (materialIds: string[]) => void;
  accessToken: string;
  disabled?: boolean;
}

export function MaterialsUpload({
  sessionId,
  onMaterialsReady,
  accessToken,
  disabled = false,
}: MaterialsUploadProps) {
  const [materials, setMaterials] = useState<UploadedMaterial[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const uploadFile = async (file: File): Promise<void> => {
    const materialId = `mat_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;

    // Add to state
    setMaterials((prev) => [
      ...prev,
      {
        id: materialId,
        name: file.name,
        size: file.size,
        status: "uploading",
        progress: 0,
      },
    ]);

    try {
      // Create FormData
      const formData = new FormData();
      formData.append("file", file);
      formData.append("session_id", sessionId);

      // Upload to backend
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:5000"}/api/tutor-session/${sessionId}/materials/upload`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
          body: formData,
        }
      );

      if (!response.ok) {
        throw new Error("Upload failed");
      }

      // Update progress to processing
      setMaterials((prev) =>
        prev.map((m) =>
          m.id === materialId
            ? { ...m, status: "processing", progress: 100 }
            : m
        )
      );

      // Wait for processing (embeddings generation)
      const result = await response.json();

      // Mark as ready
      setMaterials((prev) =>
        prev.map((m) =>
          m.id === materialId ? { ...m, status: "ready" } : m
        )
      );

      // Notify parent
      const readyIds = materials
        .filter((m) => m.status === "ready")
        .map((m) => m.id);
      readyIds.push(materialId);
      onMaterialsReady(readyIds);
    } catch (error) {
      console.error("Upload error:", error);
      setMaterials((prev) =>
        prev.map((m) =>
          m.id === materialId
            ? {
                ...m,
                status: "error",
                error: error instanceof Error ? error.message : "Upload failed",
              }
            : m
        )
      );
    }
  };

  const handleFiles = useCallback(
    (files: FileList | null) => {
      if (!files || disabled) return;

      const validFiles = Array.from(files).filter((file) => {
        // Only accept PDFs
        if (file.type !== "application/pdf") {
          console.warn(`Skipping non-PDF file: ${file.name}`);
          return false;
        }
        // Max 50MB
        if (file.size > 50 * 1024 * 1024) {
          console.warn(`File too large: ${file.name}`);
          return false;
        }
        return true;
      });

      validFiles.forEach(uploadFile);
    },
    [disabled, sessionId, accessToken]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      handleFiles(e.dataTransfer.files);
    },
    [handleFiles]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const removeMaterial = (id: string) => {
    setMaterials((prev) => prev.filter((m) => m.id !== id));
    const readyIds = materials
      .filter((m) => m.status === "ready" && m.id !== id)
      .map((m) => m.id);
    onMaterialsReady(readyIds);
  };

  const hasReadyMaterials = materials.some((m) => m.status === "ready");

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BookOpen className="h-5 w-5 text-blue-600" />
          Study Materials (Optional)
        </CardTitle>
        <CardDescription>
          Upload your textbooks, notes, or study guides for a more personalized experience.
          The tutor will use these to provide more detailed explanations.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Drop Zone */}
        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onClick={() => !disabled && fileInputRef.current?.click()}
          className={cn(
            "border-2 border-dashed rounded-lg p-8 text-center transition-all cursor-pointer",
            isDragging
              ? "border-blue-500 bg-blue-50"
              : "border-gray-300 hover:border-gray-400 hover:bg-gray-50",
            disabled && "opacity-50 cursor-not-allowed"
          )}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf"
            multiple
            onChange={(e) => handleFiles(e.target.files)}
            className="hidden"
            disabled={disabled}
          />

          <Upload className="h-10 w-10 mx-auto text-gray-400 mb-3" />
          <p className="font-medium text-gray-700">
            Drop PDF files here or click to upload
          </p>
          <p className="text-sm text-gray-500 mt-1">
            PDF files only, max 50MB each
          </p>
        </div>

        {/* Uploaded Files */}
        {materials.length > 0 && (
          <div className="space-y-2">
            {materials.map((material) => (
              <div
                key={material.id}
                className={cn(
                  "flex items-center gap-3 p-3 rounded-lg border",
                  material.status === "error"
                    ? "bg-red-50 border-red-200"
                    : material.status === "ready"
                    ? "bg-green-50 border-green-200"
                    : "bg-gray-50 border-gray-200"
                )}
              >
                <FileText
                  className={cn(
                    "h-8 w-8 flex-shrink-0",
                    material.status === "error"
                      ? "text-red-500"
                      : material.status === "ready"
                      ? "text-green-500"
                      : "text-gray-400"
                  )}
                />

                <div className="flex-grow min-w-0">
                  <p className="font-medium text-gray-900 truncate">
                    {material.name}
                  </p>
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <span>{formatSize(material.size)}</span>
                    <span>•</span>
                    {material.status === "uploading" && (
                      <span className="flex items-center gap-1">
                        <Loader2 className="h-3 w-3 animate-spin" />
                        Uploading...
                      </span>
                    )}
                    {material.status === "processing" && (
                      <span className="flex items-center gap-1">
                        <Loader2 className="h-3 w-3 animate-spin" />
                        Processing...
                      </span>
                    )}
                    {material.status === "ready" && (
                      <span className="flex items-center gap-1 text-green-600">
                        <CheckCircle className="h-3 w-3" />
                        Ready
                      </span>
                    )}
                    {material.status === "error" && (
                      <span className="flex items-center gap-1 text-red-600">
                        <AlertCircle className="h-3 w-3" />
                        {material.error}
                      </span>
                    )}
                  </div>

                  {(material.status === "uploading" ||
                    material.status === "processing") && (
                    <Progress value={material.progress} className="h-1 mt-2" />
                  )}
                </div>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    removeMaterial(material.id);
                  }}
                  className="flex-shrink-0"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        )}

        {/* Info */}
        {hasReadyMaterials && (
          <div className="flex items-start gap-2 p-3 bg-green-50 border border-green-200 rounded-lg">
            <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-green-800">Materials Ready</p>
              <p className="text-sm text-green-700">
                Your uploaded materials will be used to provide more detailed and
                personalized explanations during the lesson.
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
