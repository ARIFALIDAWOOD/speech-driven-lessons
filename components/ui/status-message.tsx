"use client"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { CheckCircle2, XCircle, AlertCircle, Info } from "lucide-react"

export type StatusType = "success" | "error" | "warning" | "info"

interface StatusMessageProps {
  type: StatusType
  title?: string
  message: string
  onClose?: () => void
}

const icons = {
  success: CheckCircle2,
  error: XCircle,
  warning: AlertCircle,
  info: Info,
}

const styles = {
  success: "border-green-200 bg-green-50 text-green-800",
  error: "border-red-200 bg-red-50 text-red-800",
  warning: "border-yellow-200 bg-yellow-50 text-yellow-800",
  info: "border-blue-200 bg-blue-50 text-blue-800",
}

export function StatusMessage({ type, title, message, onClose }: StatusMessageProps) {
  const Icon = icons[type]
  const styleClass = styles[type]

  return (
    <Alert className={styleClass}>
      <Icon className="h-4 w-4" />
      {title && <AlertTitle>{title}</AlertTitle>}
      <AlertDescription>{message}</AlertDescription>
      {onClose && (
        <button
          onClick={onClose}
          className="absolute top-2 right-2 text-current opacity-70 hover:opacity-100"
        >
          ×
        </button>
      )}
    </Alert>
  )
}
