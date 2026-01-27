'use client';

/**
 * Agent Indicator - Phase 1
 *
 * Compact agent indicator showing active agent PNG with speaking animation.
 * Used in headers and compact UI areas.
 */

import { getAgentConfig } from '@/config/agentConfig';

interface AgentIndicatorProps {
  activeAgent: string;
  isSpeaking?: boolean;
}

export function AgentIndicator({ activeAgent, isSpeaking = false }: AgentIndicatorProps) {
  const config = getAgentConfig(activeAgent);

  return (
    <div
      className="flex items-center gap-2 px-3 py-2 rounded-full transition-all"
      style={{
        backgroundColor: `${config.themeColor}15`,
        borderColor: config.themeColor,
        borderWidth: isSpeaking ? 2 : 1,
        borderStyle: 'solid',
      }}
    >
      {/* Agent PNG */}
      <div className="relative">
        <img
          src={config.avatarPath}
          alt={config.displayName}
          className="w-8 h-8 rounded-full object-cover"
        />
        {isSpeaking && (
          <span
            className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full animate-pulse border-2 border-white"
            style={{ backgroundColor: config.themeColor }}
          />
        )}
      </div>

      {/* Agent name */}
      <span className="text-sm font-medium" style={{ color: config.themeColor }}>
        {config.displayName}
      </span>
    </div>
  );
}
