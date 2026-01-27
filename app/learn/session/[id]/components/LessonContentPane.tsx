"use client";

import { useRef, useEffect } from "react";
import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Bot, User } from "lucide-react";

interface Message {
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: string;
  state?: string;
}

interface LessonContentPaneProps {
  messages: Message[];
  isStreaming: boolean;
  currentStreamContent?: string;
}

export function LessonContentPane({
  messages,
  isStreaming,
  currentStreamContent,
}: LessonContentPaneProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, currentStreamContent]);

  return (
    <div
      ref={scrollRef}
      className="flex-1 overflow-y-auto p-6 space-y-4"
    >
      {messages.map((message, index) => (
        <MessageBubble key={index} message={message} />
      ))}

      {isStreaming && currentStreamContent && (
        <MessageBubble
          message={{
            role: "assistant",
            content: currentStreamContent,
            timestamp: new Date().toISOString(),
          }}
          isStreaming
        />
      )}

      {isStreaming && !currentStreamContent && (
        <div className="flex items-start gap-3">
          <Avatar className="h-8 w-8 bg-blue-100">
            <AvatarFallback>
              <Bot className="h-4 w-4 text-blue-600" />
            </AvatarFallback>
          </Avatar>
          <div className="flex items-center gap-2 text-gray-500">
            <div className="animate-pulse flex gap-1">
              <span className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
              <span className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
              <span className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
            </div>
            <span className="text-sm">Tutor is thinking...</span>
          </div>
        </div>
      )}
    </div>
  );
}

function MessageBubble({
  message,
  isStreaming = false,
}: {
  message: Message;
  isStreaming?: boolean;
}) {
  const isUser = message.role === "user";
  const isSystem = message.role === "system";

  if (isSystem) {
    return (
      <div className="flex justify-center">
        <span className="text-xs text-muted-foreground bg-muted px-3 py-1 rounded-full">
          {message.content}
        </span>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "flex items-start gap-3",
        isUser && "flex-row-reverse"
      )}
    >
      <Avatar className={cn("h-8 w-8", isUser ? "bg-muted" : "bg-primary/10")}>
        <AvatarFallback>
          {isUser ? (
            <User className="h-4 w-4 text-gray-600" />
          ) : (
            <Bot className="h-4 w-4 text-blue-600" />
          )}
        </AvatarFallback>
      </Avatar>

      <Card
        className={cn(
          "max-w-[80%] px-4 py-3",
          isUser
            ? "bg-blue-600 text-white border-blue-600"
            : "bg-white border-gray-200"
        )}
      >
        <div
          className={cn(
            "prose prose-sm max-w-none",
            isUser && "prose-invert"
          )}
        >
          <MessageContent content={message.content} />
        </div>

        {isStreaming && (
          <span className="inline-block w-2 h-4 bg-blue-500 animate-pulse ml-1" />
        )}
      </Card>
    </div>
  );
}

function MessageContent({ content }: { content: string }) {
  // Simple markdown-like rendering
  const lines = content.split("\n");

  return (
    <>
      {lines.map((line, index) => {
        // Handle headers
        if (line.startsWith("**") && line.endsWith("**")) {
          return (
            <p key={index} className="font-semibold">
              {line.replace(/\*\*/g, "")}
            </p>
          );
        }

        // Handle bullet points
        if (line.startsWith("- ") || line.startsWith("* ")) {
          return (
            <li key={index} className="ml-4">
              {line.slice(2)}
            </li>
          );
        }

        // Handle numbered lists
        if (/^\d+\.\s/.test(line)) {
          return (
            <li key={index} className="ml-4 list-decimal">
              {line.replace(/^\d+\.\s/, "")}
            </li>
          );
        }

        // Regular paragraph
        if (line.trim()) {
          return <p key={index}>{line}</p>;
        }

        // Empty line
        return <br key={index} />;
      })}
    </>
  );
}
