'use client';

/**
 * Agent Transition Notification - Phase 1
 *
 * Toast notification when agent switches, showing the new agent's PNG.
 */

import { motion, AnimatePresence } from 'framer-motion';
import { getAgentConfig } from '@/config/agentConfig';

interface AgentTransitionProps {
  fromAgent: string | null;
  toAgent: string;
  show: boolean;
}

export function AgentTransitionNotification({
  fromAgent,
  toAgent,
  show,
}: AgentTransitionProps) {
  const toConfig = getAgentConfig(toAgent);

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          className="fixed bottom-6 left-1/2 z-50"
          initial={{ x: '-50%', y: 100, opacity: 0 }}
          animate={{ x: '-50%', y: 0, opacity: 1 }}
          exit={{ x: '-50%', y: 100, opacity: 0 }}
          transition={{ type: 'spring', damping: 20 }}
        >
          <div
            className="flex items-center gap-3 px-4 py-3 bg-white rounded-full shadow-lg border-2"
            style={{ borderColor: toConfig.themeColor }}
          >
            {/* Agent PNG */}
            <img
              src={toConfig.avatarPath}
              alt={toConfig.displayName}
              className="w-10 h-10 rounded-full object-cover"
            />

            {/* Transition text */}
            <div>
              <p className="text-sm text-muted-foreground">Now speaking:</p>
              <p className="font-semibold" style={{ color: toConfig.themeColor }}>
                {toConfig.displayName}
              </p>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
