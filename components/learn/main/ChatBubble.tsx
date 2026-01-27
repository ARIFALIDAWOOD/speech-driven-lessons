'use client';

/**
 * ChatBubble - Phase 6
 *
 * Message bubble component with agent/user variants.
 * Uses DiceBear for agent avatars.
 */

import { cn } from '@/lib/utils';
import { getAgentDiceBearUrl, getAgentConfig } from '@/config/agentConfig';
import { User } from 'lucide-react';

interface ChatBubbleProps {
  role: 'user' | 'assistant' | 'system';
  content: string;
  agentId?: string;
  timestamp?: string;
  isStreaming?: boolean;
  className?: string;
}

export function ChatBubble({
  role,
  content,
  agentId = 'tutor',
  timestamp,
  isStreaming = false,
  className,
}: ChatBubbleProps) {
  const isUser = role === 'user';
  const isSystem = role === 'system';
  const agentConfig = getAgentConfig(agentId);

  if (isSystem) {
    return (
      <div className="flex justify-center">
        <span className="text-xs text-muted-foreground bg-muted px-3 py-1 rounded-full">
          {content}
        </span>
      </div>
    );
  }

  return (
    <div
      className={cn(
        'flex gap-3 message-in',
        isUser && 'flex-row-reverse',
        className
      )}
    >
      {/* Avatar */}
      {isUser ? (
        <div className="w-8 h-8 rounded flex items-center justify-center flex-shrink-0 text-xs text-white bg-primary">
          <User className="h-4 w-4" />
        </div>
      ) : (
        <img
          src={getAgentDiceBearUrl(agentId)}
          alt={agentConfig.displayName}
          className={cn(
            'w-8 h-8 rounded p-1 flex-shrink-0 border',
            `border-${agentConfig.themeColorClass}-500/20`,
            `bg-${agentConfig.themeColorClass}-500/5`
          )}
          style={{
            borderColor: `${agentConfig.themeColor}33`,
            backgroundColor: `${agentConfig.themeColor}0D`,
          }}
        />
      )}

      {/* Message Bubble */}
      <div
        className={cn(
          'p-4 rounded-2xl text-sm max-w-sm',
          isUser
            ? 'chat-bubble-user rounded-tr-none shadow-md'
            : 'chat-bubble-agent rounded-tl-none border border-border/20'
        )}
      >
        <MessageContent content={content} />
        {isStreaming && (
          <span className="inline-block w-2 h-4 bg-primary animate-pulse ml-1" />
        )}
      </div>
    </div>
  );
}

function MessageContent({ content }: { content: string }) {
  const lines = content.split('\n');

  return (
    <>
      {lines.map((line, index) => {
        // Handle bold text
        if (line.startsWith('**') && line.endsWith('**')) {
          return (
            <p key={index} className="font-semibold">
              {line.replace(/\*\*/g, '')}
            </p>
          );
        }

        // Handle bullet points
        if (line.startsWith('- ') || line.startsWith('* ')) {
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
              {line.replace(/^\d+\.\s/, '')}
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
