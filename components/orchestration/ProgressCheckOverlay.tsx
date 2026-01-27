'use client';

/**
 * Progress Check Overlay - Phase 1
 *
 * Visual overlay when orchestrator is doing progress check rounds.
 * Shows prominently when the system is checking on student progress.
 */

import { motion, AnimatePresence } from 'framer-motion';
import { getAgentConfig } from '@/config/agentConfig';

interface ProgressCheckOverlayProps {
  isActive: boolean;
  checkType: 'routine' | 'intervention' | 'assessment';
  message?: string;
}

export function ProgressCheckOverlay({
  isActive,
  checkType,
  message,
}: ProgressCheckOverlayProps) {
  // Use orchestrator for intervention, progress_tracker for routine checks
  const agentId = checkType === 'intervention' ? 'orchestrator' : 'progress_tracker';
  const config = getAgentConfig(agentId);

  const checkMessages = {
    routine: 'Checking in on your progress...',
    intervention: 'Let me help you with this concept',
    assessment: 'Time for a quick check-up!',
  };

  return (
    <AnimatePresence>
      {isActive && (
        <motion.div
          className="fixed inset-0 z-40 flex items-center justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          {/* Semi-transparent backdrop */}
          <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" />

          {/* Progress check card */}
          <motion.div
            className="relative z-10 bg-white rounded-2xl shadow-2xl p-8 mx-4 max-w-md"
            initial={{ scale: 0.8, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.8, y: 20 }}
            style={{ borderTop: `4px solid ${config.themeColor}` }}
          >
            <div className="flex flex-col items-center gap-4">
              {/* Agent PNG */}
              <motion.img
                src={config.avatarPath}
                alt={config.displayName}
                className="w-24 h-24 rounded-full border-4 object-cover"
                style={{ borderColor: config.themeColor }}
                animate={{ scale: [1, 1.05, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
              />

              {/* Check type badge */}
              <span
                className="px-3 py-1 rounded-full text-white text-sm font-medium"
                style={{ backgroundColor: config.themeColor }}
              >
                {checkType === 'intervention' ? 'Support Mode' : 'Progress Check'}
              </span>

              {/* Message */}
              <p className="text-center text-lg font-medium text-gray-700">
                {message || checkMessages[checkType]}
              </p>

              {/* Animated dots */}
              <div className="flex gap-1">
                {[0, 1, 2].map((i) => (
                  <motion.div
                    key={i}
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: config.themeColor }}
                    animate={{ y: [0, -8, 0] }}
                    transition={{
                      duration: 0.6,
                      repeat: Infinity,
                      delay: i * 0.2,
                    }}
                  />
                ))}
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
