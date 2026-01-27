/**
 * Types for the hierarchical curriculum selection system
 */

export interface SelectionOption {
  id: string;
  name: string;
  description?: string;
}

export interface CurriculumSelection {
  state: SelectionOption | null;
  city: SelectionOption | null;
  board: SelectionOption | null;
  subject: SelectionOption | null;
  chapter: SelectionOption | null;
  topic?: string; // Optional free-text topic specification
  // Custom mode fields - for manually entering course details
  isCustomMode?: boolean;
  customBoard?: string;
  customSubject?: string;
  customChapter?: string;
}

export interface SelectionStepConfig {
  id: keyof Omit<CurriculumSelection, 'topic'>;
  label: string;
  placeholder: string;
  description: string;
  required: boolean;
}

export const SELECTION_STEPS: SelectionStepConfig[] = [
  {
    id: 'state',
    label: 'State',
    placeholder: 'Select your state...',
    description: 'Choose the state for your curriculum',
    required: true,
  },
  {
    id: 'city',
    label: 'City',
    placeholder: 'Select your city...',
    description: 'Choose your city',
    required: true,
  },
  {
    id: 'board',
    label: 'Education Board',
    placeholder: 'Select education board...',
    description: 'Choose your education board (e.g., CBSE, ICSE, State Board)',
    required: true,
  },
  {
    id: 'subject',
    label: 'Subject',
    placeholder: 'Select subject...',
    description: 'Choose the subject you want to learn',
    required: true,
  },
  {
    id: 'chapter',
    label: 'Chapter',
    placeholder: 'Select chapter...',
    description: 'Choose the chapter to study',
    required: true,
  },
];

// Initial curriculum data - can be replaced with API calls
export const INITIAL_STATES: SelectionOption[] = [
  { id: 'MH', name: 'Maharashtra', description: 'Western India' },
  { id: 'KA', name: 'Karnataka', description: 'South India' },
  { id: 'DL', name: 'Delhi', description: 'North India' },
  { id: 'TN', name: 'Tamil Nadu', description: 'South India' },
  { id: 'UP', name: 'Uttar Pradesh', description: 'North India' },
  { id: 'GJ', name: 'Gujarat', description: 'Western India' },
  { id: 'WB', name: 'West Bengal', description: 'Eastern India' },
  { id: 'RJ', name: 'Rajasthan', description: 'North India' },
  { id: 'AP', name: 'Andhra Pradesh', description: 'South India' },
  { id: 'KL', name: 'Kerala', description: 'South India' },
];

// Mock data for boards - in production, fetch from API based on city
export const EDUCATION_BOARDS: SelectionOption[] = [
  { id: 'CBSE', name: 'CBSE', description: 'Central Board of Secondary Education' },
  { id: 'ICSE', name: 'ICSE', description: 'Indian Certificate of Secondary Education' },
  { id: 'STATE', name: 'State Board', description: 'State Education Board' },
  { id: 'IB', name: 'IB', description: 'International Baccalaureate' },
  { id: 'IGCSE', name: 'IGCSE', description: 'International General Certificate of Secondary Education' },
];

// Mock subjects - in production, fetch based on board
export const SUBJECTS: SelectionOption[] = [
  { id: 'MATH', name: 'Mathematics', description: 'Numbers, algebra, geometry' },
  { id: 'PHY', name: 'Physics', description: 'Matter, energy, and their interactions' },
  { id: 'CHEM', name: 'Chemistry', description: 'Composition and properties of matter' },
  { id: 'BIO', name: 'Biology', description: 'Living organisms and life processes' },
  { id: 'ENG', name: 'English', description: 'Language and literature' },
  { id: 'HIST', name: 'History', description: 'Past events and civilizations' },
  { id: 'GEO', name: 'Geography', description: 'Earth and its features' },
  { id: 'CS', name: 'Computer Science', description: 'Computing and programming' },
];
