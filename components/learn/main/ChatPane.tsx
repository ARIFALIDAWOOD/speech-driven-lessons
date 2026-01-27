'use client';

/**
 * ChatPane - Phase 6
 *
 * Left pane with messages, input, and floating agent avatar.
 */

import { useRef, useEffect, useState, FormEvent } from 'react';
import { Send } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ChatBubble } from './ChatBubble';
import { getDiceBearUrl, getAgentConfig } from '@/config/agentConfig';

interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
  agentId?: string;
}

interface ChatPaneProps {
  messages: Message[];
  isStreaming: boolean;
  currentStreamContent?: string;
  activeAgent?: string;
  onSendMessage: (message: string) => void;
  onSimulateStall?: () => void;
  isAlertMode?: boolean;
  className?: string;
}

export function ChatPane({
  messages,
  isStreaming,
  currentStreamContent,
  activeAgent = 'tutor',
  onSendMessage,
  onSimulateStall,
  isAlertMode = false,
  className,
}: ChatPaneProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [inputValue, setInputValue] = useState('');

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, currentStreamContent]);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (inputValue.trim() && !isStreaming) {
      onSendMessage(inputValue.trim());
      setInputValue('');
    }
  };

  const agentConfig = getAgentConfig(activeAgent);

  return (
    <section className={cn('chat-pane h-full', className)}>
      {/* Header */}
      <header className="h-16 border-b flex items-center justify-between px-6 bg-card">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-xs font-medium uppercase tracking-wider">
            Live Tutoring Session
          </span>
        </div>
        {onSimulateStall && (
          <button
            onClick={onSimulateStall}
            className={cn(
              'text-[10px] font-bold px-3 py-1.5 rounded-lg border uppercase transition-colors',
              isAlertMode
                ? 'bg-destructive/20 border-destructive/50 text-destructive'
                : 'bg-background hover:opacity-80 border-border text-foreground'
            )}
          >
            {isAlertMode ? 'Resume Session' : 'Simulate Stall'}
          </button>
        )}
      </header>

      {/* Messages */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-6 space-y-6 pb-24 custom-scrollbar"
      >
        {messages.map((message, index) => (
          <ChatBubble
            key={index}
            role={message.role}
            content={message.content}
            agentId={message.agentId || activeAgent}
            timestamp={message.timestamp}
          />
        ))}

        {/* Streaming content */}
        {isStreaming && currentStreamContent && (
          <ChatBubble
            role="assistant"
            content={currentStreamContent}
            agentId={activeAgent}
            isStreaming
          />
        )}

        {/* Thinking indicator */}
        {isStreaming && !currentStreamContent && (
          <div className="flex gap-3 message-in">
            <img
              src={getDiceBearUrl(agentConfig.diceBearSeed)}
              alt={agentConfig.displayName}
              className="w-8 h-8 rounded p-1 flex-shrink-0 border border-border/20 bg-card"
            />
            <div className="flex items-center gap-2 text-muted-foreground">
              <div className="flex gap-1">
                <span
                  className="w-2 h-2 bg-primary rounded-full animate-bounce"
                  style={{ animationDelay: '0ms' }}
                />
                <span
                  className="w-2 h-2 bg-primary rounded-full animate-bounce"
                  style={{ animationDelay: '150ms' }}
                />
                <span
                  className="w-2 h-2 bg-primary rounded-full animate-bounce"
                  style={{ animationDelay: '300ms' }}
                />
              </div>
              <span className="text-sm">{agentConfig.displayName} is thinking...</span>
            </div>
          </div>
        )}
      </div>

      {/* Input Area with Tutor Avatar */}
      <div className="p-6 bg-gradient-to-t from-background to-transparent">
        {/* Tutor Avatar above input */}
        <div className="flex justify-end mb-2">
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-muted-foreground uppercase tracking-wide">
              {agentConfig.displayName}
            </span>
            <div
              className="w-10 h-10 rounded-xl overflow-hidden border-2 shadow-lg cursor-help"
              style={{
                borderColor: agentConfig.themeColor,
                boxShadow: `0 0 15px ${agentConfig.themeColor}40`,
              }}
            >
              <img
                src={getDiceBearUrl(agentConfig.diceBearSeed, 'bottts-neutral', '10b981')}
                alt={agentConfig.displayName}
                className="w-full h-full object-cover"
              />
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="glass-panel-learn rounded-2xl p-2 flex items-center gap-2">
            <Input
              type="text"
              placeholder="Respond to the session..."
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              disabled={isStreaming}
              className="flex-1 bg-transparent border-none focus-visible:ring-0 text-sm py-2 px-3"
            />
            <Button
              type="submit"
              size="icon"
              disabled={isStreaming || !inputValue.trim()}
              className="w-9 h-9 rounded-xl shadow-lg shadow-primary/20"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </form>
      </div>
    </section>
  );
}
