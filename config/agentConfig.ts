/**
 * Agent Configuration - Phase 1
 *
 * Central configuration for all agents with their PNGs, colors, and metadata.
 */

export interface AgentConfig {
  id: string;
  displayName: string;
  avatarPath: string;
  themeColor: string;
  description: string;
}

/**
 * Configuration for all 6 agents in the orchestration system.
 * PNG paths reference files in /public/agent-pngs/
 */
export const AGENT_CONFIGS: Record<string, AgentConfig> = {
  tutor: {
    id: 'tutor',
    displayName: 'Tutor',
    avatarPath: '/agent-pngs/tutor.png',
    themeColor: '#4CAF50', // Green
    description: 'Your learning guide',
  },
  assessor: {
    id: 'assessor',
    displayName: 'Assessor',
    avatarPath: '/agent-pngs/assessor.png',
    themeColor: '#2196F3', // Blue
    description: 'Checking your understanding',
  },
  course_creator: {
    id: 'course_creator',
    displayName: 'Course Creator',
    avatarPath: '/agent-pngs/course-creator.png',
    themeColor: '#9C27B0', // Purple
    description: 'Building your course',
  },
  curriculum_designer: {
    id: 'curriculum_designer',
    displayName: 'Curriculum Designer',
    avatarPath: '/agent-pngs/curriculum-designer.png',
    themeColor: '#FF5722', // Deep Orange
    description: 'Designing your learning path',
  },
  orchestrator: {
    id: 'orchestrator',
    displayName: 'Guide',
    avatarPath: '/agent-pngs/orchestrator.png',
    themeColor: '#FF9800', // Amber
    description: 'Coordinating your session',
  },
  progress_tracker: {
    id: 'progress_tracker',
    displayName: 'Progress Tracker',
    avatarPath: '/agent-pngs/progres-trackor.png', // Note: filename has typo
    themeColor: '#00BCD4', // Cyan
    description: 'Reviewing your progress',
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
