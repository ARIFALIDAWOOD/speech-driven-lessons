"use client";

import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  showBackButton?: boolean;
  onBack?: () => void;
}

export function PageHeader({
  title,
  subtitle,
  showBackButton = true,
  onBack,
}: PageHeaderProps) {
  const router = useRouter();

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      router.back();
    }
  };

  return (
    <div className="flex items-center gap-4 mb-6">
      {showBackButton && (
        <Button variant="ghost" size="icon" onClick={handleBack}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
      )}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
        {subtitle && <p className="text-sm text-gray-500 mt-1">{subtitle}</p>}
      </div>
    </div>
  );
}
