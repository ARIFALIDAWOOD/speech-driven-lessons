/**
 * Agent Configuration - Phase 1 + Phase 6 DiceBear Integration
 *
 * Central configuration for all agents with their PNGs, colors, and metadata.
 * Also provides DiceBear URL generation for sidebar/chat avatars.
 */

export interface AgentConfig {
  id: string;
  displayName: string;
  avatarPath: string;
  diceBearSeed: string;
  themeColor: string;
  themeColorClass: string;
  description: string;
}

/**
 * DiceBear base URLs for different avatar styles
 */
const DICEBEAR_BASE = 'https://api.dicebear.com/7.x';
const DICEBEAR_AGENT_STYLE = 'bottts-neutral';
const DICEBEAR_SESSION_STYLE = 'identicon';

/**
 * Configuration for all 6 agents in the orchestration system.
 * PNG paths reference files in /public/agent-pngs/
 * DiceBear seeds used for sidebar/chat avatars
 */
export const AGENT_CONFIGS: Record<string, AgentConfig> = {
  tutor: {
    id: 'tutor',
    displayName: 'Tutor',
    avatarPath: '/agent-pngs/tutor.png',
    diceBearSeed: 'Tutor',
    themeColor: '#10b981', // Emerald-500
    themeColorClass: 'emerald',
    description: 'Your learning guide',
  },
  assessor: {
    id: 'assessor',
    displayName: 'Assessor',
    avatarPath: '/agent-pngs/assessor.png',
    diceBearSeed: 'Assessor',
    themeColor: '#f59e0b', // Amber-500
    themeColorClass: 'amber',
    description: 'Checking your understanding',
  },
  course_creator: {
    id: 'course_creator',
    displayName: 'Course Creator',
    avatarPath: '/agent-pngs/course-creator.png',
    diceBearSeed: 'CourseCreator',
    themeColor: '#9C27B0', // Purple
    themeColorClass: 'purple',
    description: 'Building your course',
  },
  curriculum_designer: {
    id: 'curriculum_designer',
    displayName: 'Curriculum Designer',
    avatarPath: '/agent-pngs/curriculum-designer.png',
    diceBearSeed: 'CurriculumDesigner',
    themeColor: '#FF5722', // Deep Orange
    themeColorClass: 'orange',
    description: 'Designing your learning path',
  },
  orchestrator: {
    id: 'orchestrator',
    displayName: 'Guide',
    avatarPath: '/agent-pngs/orchestrator.png',
    diceBearSeed: 'Orchestrator',
    themeColor: '#3b82f6', // Blue-500
    themeColorClass: 'blue',
    description: 'Coordinating your session',
  },
  progress_tracker: {
    id: 'progress_tracker',
    displayName: 'Progress Tracker',
    avatarPath: '/agent-pngs/progres-trackor.png', // Note: filename has typo
    diceBearSeed: 'Tracker',
    themeColor: '#a855f7', // Purple-500
    themeColorClass: 'purple',
    description: 'Reviewing your progress',
  },
  overwatch: {
    id: 'overwatch',
    displayName: 'Overwatch',
    avatarPath: '/agent-pngs/orchestrator.png',
    diceBearSeed: 'Overwatch',
    themeColor: '#f43f5e', // Rose-500
    themeColorClass: 'rose',
    description: 'Monitoring session health',
  },
};

/**
 * Get agent config by ID with fallback to orchestrator.
 */
export function getAgentConfig(agentId: string): AgentConfig {
  return AGENT_CONFIGS[agentId] || AGENT_CONFIGS.orchestrator;
}

/**
 * Get all agent IDs.
 */
export function getAllAgentIds(): string[] {
  return Object.keys(AGENT_CONFIGS);
}

/**
 * Generate DiceBear avatar URL for an agent.
 * Uses bottts-neutral style for robot-like agent avatars.
 */
export function getAgentDiceBearUrl(agentId: string, size: number = 32): string {
  const config = getAgentConfig(agentId);
  return `${DICEBEAR_BASE}/${DICEBEAR_AGENT_STYLE}/svg?seed=${config.diceBearSeed}`;
}

/**
 * Generate DiceBear avatar URL for a session.
 * Uses identicon style for unique session identification.
 */
export function getSessionDiceBearUrl(sessionTitle: string): string {
  const seed = encodeURIComponent(sessionTitle);
  return `${DICEBEAR_BASE}/${DICEBEAR_SESSION_STYLE}/svg?seed=${seed}`;
}

/**
 * Generate DiceBear avatar URL with custom seed and optional background.
 */
export function getDiceBearUrl(
  seed: string,
  style: 'bottts-neutral' | 'identicon' = 'bottts-neutral',
  backgroundColor?: string
): string {
  let url = `${DICEBEAR_BASE}/${style}/svg?seed=${encodeURIComponent(seed)}`;
  if (backgroundColor) {
    url += `&backgroundColor=${encodeURIComponent(backgroundColor)}`;
  }
  return url;
}

/**
 * System agents list for sidebar accordion.
 * Ordered by typical interaction priority.
 */
export const SYSTEM_AGENTS = [
  'orchestrator',
  'tutor',
  'assessor',
  'overwatch',
  'progress_tracker',
] as const;

export type SystemAgentId = (typeof SYSTEM_AGENTS)[number];
