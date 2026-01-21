"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Send } from "lucide-react"

interface ChatInputProps {
  courseId: string
  slideIndex: number
}

export function ChatInput({ courseId, slideIndex }: ChatInputProps) {
  const [message, setMessage] = useState("")

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!message.trim()) return

    // Testing stub: keep UI responsive without requiring backend wiring.
    console.log("creator-edit chat message", { courseId, slideIndex, message: message.trim() })
    setMessage("")
  }

  return (
    <form onSubmit={handleSubmit} className="flex gap-2 p-4 border-t bg-white">
      <Input
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        placeholder="Ask AI about this slide..."
        className="flex-1"
      />
      <Button type="submit" disabled={!message.trim()}>
        <Send className="w-4 h-4" />
      </Button>
    </form>
  )
}
