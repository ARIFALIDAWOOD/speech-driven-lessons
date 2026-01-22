"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send } from "lucide-react";

interface ChatInputProps {
  courseId: string;
  slideIndex: number;
}

export function ChatInput({ courseId, slideIndex }: ChatInputProps) {
  const [message, setMessage] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;
    // TODO: Implement chat functionality
    console.log("Chat message:", message, "Course:", courseId, "Slide:", slideIndex);
    setMessage("");
  };

  return (
    <form onSubmit={handleSubmit} className="flex gap-2 mt-4">
      <Input
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        placeholder="Ask a question about this slide..."
        className="flex-1"
      />
      <Button type="submit" size="icon">
        <Send className="h-4 w-4" />
      </Button>
    </form>
  );
}
