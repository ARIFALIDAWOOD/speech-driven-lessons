'use client';

/**
 * SystemAgentsAccordion - Phase 6
 *
 * Collapsible accordion showing system agents with their status indicators.
 * Uses DiceBear for agent avatars.
 */

import { useState } from 'react';
import { ChevronUp, Bot } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  SYSTEM_AGENTS,
  getAgentConfig,
  getAgentDiceBearUrl,
} from '@/config/agentConfig';

interface SystemAgentsAccordionProps {
  activeAgent?: string;
  onlineAgents?: string[];
}

export function SystemAgentsAccordion({
  activeAgent,
  onlineAgents = [],
}: SystemAgentsAccordionProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="border-t border-border pt-4">
      <details open={isOpen} onToggle={() => setIsOpen(!isOpen)} className="group">
        <summary className="flex items-center justify-between list-none cursor-pointer p-2 rounded-lg hover:bg-background transition-colors">
          <div className="flex items-center gap-2">
            <Bot className="h-3 w-3 text-primary" />
            <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">
              System Agents
            </span>
          </div>
          <ChevronUp
            className={cn(
              'h-3 w-3 text-muted-foreground transition-transform',
              isOpen && 'rotate-180'
            )}
          />
        </summary>

        <div className="space-y-1 mt-2 max-h-48 overflow-y-auto pr-1 custom-scrollbar">
          {SYSTEM_AGENTS.map((agentId) => {
            const config = getAgentConfig(agentId);
            const isActive = activeAgent === agentId;
            const isOnline = onlineAgents.includes(agentId);

            return (
              <div
                key={agentId}
                className={cn(
                  'flex items-center gap-3 p-2 rounded-lg transition-colors',
                  `hover:bg-${config.themeColorClass}-500/5`,
                  isActive && `bg-${config.themeColorClass}-500/10`
                )}
              >
                <img
                  src={getAgentDiceBearUrl(agentId)}
                  alt={config.displayName}
                  className={cn(
                    'w-6 h-6 rounded-full',
                    `bg-${config.themeColorClass}-500/10`
                  )}
                />
                <span className="text-[11px] font-medium">{config.displayName}</span>
                {(isActive || isOnline) && (
                  <span
                    className={cn(
                      'ml-auto w-1.5 h-1.5 rounded-full',
                      isActive ? 'bg-emerald-500 animate-pulse' : 'bg-emerald-500'
                    )}
                  />
                )}
              </div>
            );
          })}
        </div>
      </details>
    </div>
  );
}
