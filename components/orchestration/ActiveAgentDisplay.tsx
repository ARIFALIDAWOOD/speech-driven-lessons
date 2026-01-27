'use client';

/**
 * Active Agent Display - Phase 1
 *
 * Prominent display of active agent with PNG and animations.
 * Shows speaking/thinking indicators when agent is active.
 */

import { motion, AnimatePresence } from 'framer-motion';
import { getAgentConfig } from '@/config/agentConfig';

interface ActiveAgentDisplayProps {
  activeAgent: string;
  isSpeaking: boolean;
  isThinking: boolean;
}

export function ActiveAgentDisplay({
  activeAgent,
  isSpeaking,
  isThinking,
}: ActiveAgentDisplayProps) {
  const config = getAgentConfig(activeAgent);

  return (
    <div className="flex flex-col items-center gap-3 p-4">
      {/* Agent Avatar with animations */}
      <motion.div
        className="relative"
        animate={isSpeaking ? { scale: [1, 1.05, 1] } : {}}
        transition={{ duration: 0.5, repeat: isSpeaking ? Infinity : 0 }}
      >
        {/* Glow ring when speaking */}
        <AnimatePresence>
          {isSpeaking && (
            <motion.div
              className="absolute inset-0 rounded-full"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{
                opacity: [0.4, 0.8, 0.4],
                scale: [1, 1.15, 1],
              }}
              exit={{ opacity: 0 }}
              transition={{ duration: 1.5, repeat: Infinity }}
              style={{
                backgroundColor: config.themeColor,
                filter: 'blur(8px)',
              }}
            />
          )}
        </AnimatePresence>

        {/* Agent PNG - PROMINENT DISPLAY */}
        <img
          src={config.avatarPath}
          alt={config.displayName}
          className="relative w-20 h-20 rounded-full object-cover border-4 z-10"
          style={{ borderColor: config.themeColor }}
        />

        {/* Thinking indicator */}
        {isThinking && (
          <motion.div
            className="absolute -bottom-1 -right-1 w-6 h-6 bg-white rounded-full flex items-center justify-center shadow-md z-20"
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
          >
            <div
              className="w-4 h-4 border-2 border-t-transparent rounded-full"
              style={{ borderColor: config.themeColor }}
            />
          </motion.div>
        )}

        {/* Speaking indicator (sound waves) */}
        {isSpeaking && (
          <motion.div
            className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full z-20 flex items-center justify-center"
            style={{ backgroundColor: config.themeColor }}
          >
            <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="none">
              <motion.path
                d="M12 3v18M8 8v8M16 8v8M4 11v2M20 11v2"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                animate={{ pathLength: [0.5, 1, 0.5] }}
                transition={{ duration: 0.5, repeat: Infinity }}
              />
            </svg>
          </motion.div>
        )}
      </motion.div>

      {/* Agent name and description */}
      <div className="text-center">
        <p className="font-semibold text-lg" style={{ color: config.themeColor }}>
          {config.displayName}
        </p>
        <p className="text-sm text-muted-foreground">{config.description}</p>
      </div>
    </div>
  );
}
