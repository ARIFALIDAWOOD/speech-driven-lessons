'use client';

/**
 * LearnSidebar - Phase 6
 *
 * Main sidebar container for the learning session page.
 * Uses existing SidebarProvider primitives.
 */

import { useRouter } from 'next/navigation';
import { Brain, Moon, Sun } from 'lucide-react';
import { useTheme } from 'next-themes';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  useSidebar,
} from '@/components/ui/sidebar';
import { RecentSessionsList } from './RecentSessionsList';
import { SystemAgentsAccordion } from './SystemAgentsAccordion';
import { CurrentGoalCard } from './CurrentGoalCard';
import { useRecentSessions } from '@/hooks/useRecentSessions';

interface LearnSidebarProps {
  sessionId: string;
  currentGoal?: string;
  goalProgress?: number;
  activeAgent?: string;
  onlineAgents?: string[];
}

export function LearnSidebar({
  sessionId,
  currentGoal = 'Learning Session',
  goalProgress = 0,
  activeAgent,
  onlineAgents = [],
}: LearnSidebarProps) {
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const { sessions, isLoading } = useRecentSessions(5);

  const handleSelectSession = (id: string) => {
    router.push(`/learn/session/${id}`);
  };

  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  };

  return (
    <Sidebar collapsible="offcanvas" className="border-r">
      <SidebarHeader className="p-4">
        <div className="flex items-center gap-3 px-2">
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
            <Brain className="h-4 w-4 text-primary-foreground" />
          </div>
          <h1 className="font-bold text-lg tracking-tight">
            Anantra <span className="text-primary">LMS</span>
          </h1>
        </div>
      </SidebarHeader>

      <SidebarContent className="flex-1 flex flex-col min-h-0 px-4">
        {/* Recent Sessions */}
        <div className="flex-1 flex flex-col min-h-0">
          <p className="text-[10px] uppercase font-bold text-muted-foreground px-2 mb-4 tracking-widest">
            Recent Sessions
          </p>
          <RecentSessionsList
            sessions={sessions}
            activeSessionId={sessionId}
            onSelectSession={handleSelectSession}
            isLoading={isLoading}
          />
        </div>

        {/* System Agents Accordion */}
        <SystemAgentsAccordion
          activeAgent={activeAgent}
          onlineAgents={onlineAgents}
        />
      </SidebarContent>

      <SidebarFooter className="p-4 space-y-4">
        {/* Theme Toggle */}
        <Button
          variant="outline"
          className="w-full justify-between text-xs"
          onClick={toggleTheme}
        >
          <span>Appearance</span>
          {theme === 'dark' ? (
            <Moon className="h-4 w-4" />
          ) : (
            <Sun className="h-4 w-4" />
          )}
        </Button>

        {/* Current Goal */}
        <CurrentGoalCard goalTitle={currentGoal} progress={goalProgress} />
      </SidebarFooter>
    </Sidebar>
  );
}

// Export component parts for flexible composition
export { RecentSessionsList } from './RecentSessionsList';
export { SystemAgentsAccordion } from './SystemAgentsAccordion';
export { CurrentGoalCard } from './CurrentGoalCard';
