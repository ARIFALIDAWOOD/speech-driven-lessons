'use client';

/**
 * WorkspacePane - Phase 6
 *
 * Right pane - Kinesthetic Laboratory workspace.
 */

import { useState } from 'react';
import { Microscope } from 'lucide-react';
import { cn } from '@/lib/utils';
import { WorkspaceMetrics } from './WorkspaceMetrics';
import { getAgentConfig, getDiceBearUrl } from '@/config/agentConfig';

interface WorkspacePaneProps {
  title?: string;
  description?: string;
  coherence?: number;
  interference?: number;
  gapStatus?: 'filling' | 'identified' | 'resolved' | 'none';
  className?: string;
  children?: React.ReactNode;
}

export function WorkspacePane({
  title = 'Interactive Workspace',
  description = 'Interact with the workspace to reinforce your learning.',
  coherence = 100,
  interference = 50,
  gapStatus = 'filling',
  className,
  children,
}: WorkspacePaneProps) {
  const [particleAActive, setParticleAActive] = useState(false);
  const [particleBActive, setParticleBActive] = useState(false);

  const handleParticleClick = (particle: 'a' | 'b') => {
    if (particle === 'a') {
      setParticleAActive(true);
      setTimeout(() => setParticleAActive(false), 200);
    } else {
      setParticleBActive(true);
      setTimeout(() => setParticleBActive(false), 200);
    }
  };

  return (
    <section className={cn('workspace-pane h-full', className)}>
      {/* Header */}
      <header className="h-16 border-b flex items-center px-6 gap-4">
        <Microscope className="h-4 w-4 text-primary" />
        <h2 className="text-xs font-bold uppercase tracking-widest">
          Kinesthetic Laboratory
        </h2>
      </header>

      {/* Content */}
      <div className="flex-1 p-8 relative overflow-hidden flex flex-col">
        <div className="mb-4">
          <h3 className="text-xl font-bold mb-1">{title}</h3>
          <p className="text-xs text-muted-foreground">{description}</p>
        </div>

        {/* Interactive Area */}
        <div className="flex-1 glass-panel-learn rounded-3xl relative overflow-hidden border-dashed border-2 border-border/50 flex items-center justify-center">
          {children || (
            <div className="text-center space-y-4">
              <div className="flex gap-8 justify-center">
                {/* Particle A */}
                <button
                  onClick={() => handleParticleClick('a')}
                  className={cn(
                    'w-16 h-16 rounded-full bg-primary/20 border-2 border-primary cursor-grab active:cursor-grabbing flex items-center justify-center transition-transform hover:scale-105',
                    particleAActive && 'scale-125 rotate-6'
                  )}
                  style={{
                    boxShadow: '0 0 20px rgba(59, 130, 246, 0.3)',
                  }}
                >
                  <span className="text-[10px] font-bold text-primary">STATE: A</span>
                </button>

                {/* Particle B */}
                <button
                  onClick={() => handleParticleClick('b')}
                  className={cn(
                    'w-16 h-16 rounded-full bg-emerald-500/20 border-2 border-emerald-500 cursor-grab active:cursor-grabbing flex items-center justify-center transition-transform hover:scale-105',
                    particleBActive && 'scale-125 -rotate-6'
                  )}
                  style={{
                    boxShadow: '0 0 20px rgba(16, 185, 129, 0.3)',
                  }}
                >
                  <span className="text-[10px] font-bold text-emerald-500">STATE: B</span>
                </button>
              </div>
              <p className="text-[10px] uppercase font-bold text-muted-foreground">
                Interaction required to fill gap
              </p>
            </div>
          )}
        </div>

        {/* Assessor Avatar + Metrics */}
        <div className="mt-4">
          {/* Assessor Avatar */}
          <div className="flex justify-end mb-2">
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-muted-foreground uppercase tracking-wide">
                Assessor
              </span>
              <div
                className="w-10 h-10 rounded-xl overflow-hidden border-2 shadow-lg cursor-help"
                style={{
                  borderColor: getAgentConfig('assessor').themeColor,
                  boxShadow: `0 0 15px ${getAgentConfig('assessor').themeColor}40`,
                }}
              >
                <img
                  src={getDiceBearUrl('Assessor', 'bottts-neutral')}
                  alt="Assessor"
                  className="w-full h-full object-cover"
                />
              </div>
            </div>
          </div>

          {/* Metrics */}
          <WorkspaceMetrics
            coherence={coherence}
            interference={interference}
            gapStatus={gapStatus}
          />
        </div>
      </div>
    </section>
  );
}
