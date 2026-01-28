# Theme Unification Plan: Emerald Design System

## Overview
Unify the application theme based on the template at `.cursor/templates/final-init-template.html`, enforcing emerald as the primary accent color with consistent CSS variables throughout. Update AGENTS.md with theming guidelines.

**Navigation Structure (5 main tabs):**
- Dashboard (`/dashboard`)
- Courses (`/courses`)
- Admin (`/admin`, `/admin/courses`, `/admin/contributions`)
- Profile (`/profile`)
- Help (`/help-center`)

**Additional Active Routes:** 34 total pages including learning sessions, course creation, and publishing flows.

---

## Cleanup: Remove Unused Files

Delete these 3 unused component files:
1. `components/course-card.tsx` - Generic unused card
2. `components/dashboard/recommended-course-card.tsx` - Never imported
3. `components/my-uploads/create-course-modal-v2.tsx` - Abandoned v2

---

## Template Theme Specification

### CSS Custom Properties (Target Values)

**Dark Mode (Default):**
```css
--bg-primary: #0a0a0a;        /* Main background */
--bg-secondary: #171717;       /* Cards/panels */
--text-primary: #e5e7eb;       /* Main text */
--text-secondary: #9ca3af;     /* Muted text */
--border-color: rgba(255, 255, 255, 0.1);
--hover-bg: rgba(255, 255, 255, 0.05);
--active-bg: rgba(16, 185, 129, 0.15);  /* Emerald tint */
--btn-bg: #1f2937;
```

**Light Mode:**
```css
--bg-primary: #f9fafb;
--bg-secondary: #ffffff;
--text-primary: #111827;
--text-secondary: #4b5563;
--border-color: rgba(0, 0, 0, 0.1);
--hover-bg: rgba(0, 0, 0, 0.05);
--active-bg: rgba(5, 150, 105, 0.1);
--btn-bg: #f3f4f6;
```

**Accent Color:** Emerald (`#10b981` / `emerald-500`)

---

## Current Issues

1. **Dark mode primary is BLUE** (217 91% 60%) - should be EMERALD
2. **107 files** with hardcoded Tailwind colors (669 instances)
3. **Inconsistent variable usage** - mix of CSS vars and hardcoded values
4. **No semantic status colors** - success/error/warning use hardcoded values

---

## Phase 1: Update CSS Variables

### File: `app/globals.css`

**Changes:**
1. Update `:root` (light mode) variables to match template
2. Update `.dark` variables to use emerald primary (not blue)
3. Add semantic status color variables
4. Add template utility classes (`.glass-panel`, `.metric-card`, etc.)

**New Variable Mappings:**

| Shadcn Variable | Template Equivalent | Dark Value | Light Value |
|----------------|---------------------|------------|-------------|
| `--background` | `--bg-primary` | `0 0% 4%` (#0a0a0a) | `210 20% 98%` (#f9fafb) |
| `--card` | `--bg-secondary` | `0 0% 9%` (#171717) | `0 0% 100%` (#ffffff) |
| `--foreground` | `--text-primary` | `220 14% 90%` (#e5e7eb) | `220 14% 10%` (#111827) |
| `--muted-foreground` | `--text-secondary` | `220 9% 64%` (#9ca3af) | `220 9% 36%` (#4b5563) |
| `--primary` | emerald-500 | `160 84% 39%` | `160 84% 39%` |
| `--border` | `--border-color` | `0 0% 20%` | `0 0% 90%` |

**Add Semantic Status Variables:**
```css
/* Status Colors */
--success: 160 84% 39%;           /* emerald-500 */
--success-foreground: 0 0% 100%;
--success-muted: 160 84% 39% / 0.1;
--error: 0 84% 60%;               /* red-500 */
--error-foreground: 0 0% 100%;
--error-muted: 0 84% 60% / 0.1;
--warning: 38 92% 50%;            /* amber-500 */
--warning-foreground: 0 0% 0%;
--warning-muted: 38 92% 50% / 0.1;
--info: 199 89% 48%;              /* cyan-500 */
--info-foreground: 0 0% 100%;
--info-muted: 199 89% 48% / 0.1;
```

---

## Phase 2: Update Tailwind Config

### File: `tailwind.config.ts`

**Add semantic colors to theme.extend.colors:**
```typescript
colors: {
  // ... existing
  success: {
    DEFAULT: 'hsl(var(--success))',
    foreground: 'hsl(var(--success-foreground))',
    muted: 'hsl(var(--success-muted))',
  },
  error: {
    DEFAULT: 'hsl(var(--error))',
    foreground: 'hsl(var(--error-foreground))',
    muted: 'hsl(var(--error-muted))',
  },
  warning: {
    DEFAULT: 'hsl(var(--warning))',
    foreground: 'hsl(var(--warning-foreground))',
    muted: 'hsl(var(--warning-muted))',
  },
  info: {
    DEFAULT: 'hsl(var(--info))',
    foreground: 'hsl(var(--info-foreground))',
    muted: 'hsl(var(--info-muted))',
  },
}
```

---

## Phase 3: Update AGENTS.md

### Add Theming Section

```markdown
## Theming Guidelines

### Design System
The application uses an **emerald-based design system** with CSS custom properties for consistent theming.

**Primary Accent:** Emerald (`#10b981` / Tailwind `emerald-500`)

### CSS Variable Usage (REQUIRED)

**DO use semantic Tailwind classes:**
- `bg-background`, `bg-card`, `bg-muted`
- `text-foreground`, `text-muted-foreground`
- `bg-primary`, `text-primary-foreground`
- `border-border`, `ring-ring`
- `bg-success`, `bg-error`, `bg-warning`, `bg-info` (for status states)

**DO NOT use hardcoded colors:**
- ❌ `bg-gray-900`, `text-gray-500`, `bg-white`
- ❌ `bg-green-100 text-green-800` (use `bg-success-muted text-success`)
- ❌ `bg-red-50 text-red-600` (use `bg-error-muted text-error`)
- ❌ Inline styles with hex colors

### Status Colors
| State | Background | Text | Border |
|-------|-----------|------|--------|
| Success | `bg-success-muted` | `text-success` | `border-success` |
| Error | `bg-error-muted` | `text-error` | `border-error` |
| Warning | `bg-warning-muted` | `text-warning` | `border-warning` |
| Info | `bg-info-muted` | `text-info` | `border-info` |

### Dark/Light Mode
- Theme handled by `next-themes` with `.dark` class on `<html>`
- All colors automatically adapt via CSS variables
- Never hardcode dark mode colors inline

### Glass Panel Pattern
Use the `.glass-panel` utility class for cards:
```tsx
<div className="glass-panel rounded-2xl p-6">
  {/* Content */}
</div>
```
```

---

## Phase 4: Update ALL Component Files (Comprehensive)

### Color Replacement Patterns

```tsx
// STATUS COLORS
bg-green-100 text-green-800  →  bg-success/10 text-success
bg-red-100 text-red-800      →  bg-error/10 text-error
bg-amber-100 text-amber-800  →  bg-warning/10 text-warning
bg-blue-100 text-blue-800    →  bg-info/10 text-info

border-green-500  →  border-success
border-red-500    →  border-error

text-green-600, text-green-700  →  text-success
text-red-600, text-red-700      →  text-error
text-amber-600, text-amber-700  →  text-warning

// GRAY SCALE (use semantic names)
text-gray-500, text-gray-600  →  text-muted-foreground
text-gray-900                 →  text-foreground
bg-gray-50, bg-gray-100       →  bg-muted
bg-gray-200                   →  bg-muted/80
text-white                    →  text-foreground (context) or keep for contrast on primary

// ACCENT COLORS (emerald is now primary)
bg-emerald-600       →  bg-primary
text-emerald-600     →  text-primary
bg-emerald-500/10    →  bg-primary/10
hover:bg-emerald-500 →  hover:bg-primary/90

// GRADIENTS
from-black/80        →  from-background/80
via-black/40         →  via-background/40
```

### File Update List by Category

**A. Assessment Components (5 files)**
- `components/assessment/AssessmentContainer.tsx`
- `components/assessment/AssessmentQuestion.tsx`
- `components/assessment/QuestionRenderer.tsx`
- `components/assessment/question-types/MCQQuestion.tsx`
- `components/assessment/question-types/ShortAnswerQuestion.tsx`
- `components/assessment/question-types/TrueFalseQuestion.tsx`

**B. Dashboard Components (4 files)**
- `components/dashboard/featured-recommendation-card.tsx`
- `components/dashboard/tutorial-card.tsx`
- `components/dashboard/dashboard-section-header.tsx`
- `app/dashboard/page.tsx`

**C. Course Components (8 files)**
- `components/courses/CommunityCourseCard.tsx`
- `components/courses/ContributeModal.tsx`
- `components/courses/CreateCourseModal.tsx`
- `components/courses-library/CourseCard.tsx`
- `components/courses-library/CourseCardGallery.tsx`
- `components/my-courses/CourseCard.tsx`
- `components/my-courses/create-course-card.tsx`
- `components/my-uploads/CourseCard.tsx`

**D. Auth/Login Pages (2 files)**
- `app/login/page.tsx`
- `app/welcome/page.tsx`

**E. Learning Components (6 files)**
- `components/learn/main/ChatBubble.tsx`
- `components/learn/main/ChatPane.tsx`
- `components/learn/main/WorkspaceMetrics.tsx`
- `components/learn/sidebar/LearningPathSidebar.tsx`
- `app/learn/page.tsx`
- `app/learn/session/[id]/page.tsx`

**F. Creator/In-Class Components (6 files)**
- `components/creator-edit/course-controls.tsx`
- `components/creator-edit/chat-input.tsx`
- `components/in-class/course-controls.tsx`
- `components/in-class/chat-input.tsx`
- `components/in-class/slide-controller.tsx`
- `components/in-class/vapi-assistant.tsx`

**G. Layout Components (4 files)**
- `components/layout/HeaderOnlyLayout.tsx`
- `components/layout/LightCourseLayout.tsx`
- `components/layout/MainLayout.tsx`
- `components/layout/UserMenu.tsx`

**H. Admin Pages (3 files)**
- `app/admin/page.tsx`
- `app/admin/courses/page.tsx`
- `app/admin/contributions/page.tsx`

**I. Profile & Other Pages (4 files)**
- `app/profile/page.tsx`
- `app/courses/page.tsx`
- `app/courses/[id]/page.tsx`
- `app/help-center/page.tsx`

**Total: ~45 files with hardcoded colors to update**

---

## Phase 5: Utility Class Updates in globals.css

**Add/Update these utility classes:**

```css
/* Glass Panel (from template) */
.glass-panel {
  @apply bg-card border border-border;
  transition: background 0.3s, border 0.3s;
}

/* Metric Card Hover (from template) */
.metric-card:hover {
  transform: translateY(-2px);
  border-color: hsl(var(--primary) / 0.4);
}

/* Sidebar Active Item */
.sidebar-item-active {
  @apply bg-primary/15 text-primary border-r-2 border-primary;
}

/* Custom Scrollbar */
::-webkit-scrollbar { width: 6px; }
::-webkit-scrollbar-track { background: transparent; }
::-webkit-scrollbar-thumb {
  @apply bg-border rounded-full;
}

/* Pulse Animation */
@keyframes pulse-soft {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.6; }
}
.pulse-soft { animation: pulse-soft 2s infinite; }
```

---

## Critical Files Summary

| Action | File Path | Priority |
|--------|-----------|----------|
| DELETE | `components/course-card.tsx` | P0 |
| DELETE | `components/dashboard/recommended-course-card.tsx` | P0 |
| DELETE | `components/my-uploads/create-course-modal-v2.tsx` | P0 |
| MODIFY | `app/globals.css` | P1 - Foundation |
| MODIFY | `tailwind.config.ts` | P1 - Foundation |
| MODIFY | `AGENTS.md` | P1 - Documentation |
| MODIFY | Assessment components (6 files) | P2 - User feedback |
| MODIFY | Dashboard components (4 files) | P2 - Main tab |
| MODIFY | Course components (8 files) | P2 - Main tab |
| MODIFY | Auth/Login pages (2 files) | P2 - Entry point |
| MODIFY | Learning components (6 files) | P3 - Core feature |
| MODIFY | Creator/In-Class components (6 files) | P3 - Secondary |
| MODIFY | Layout components (4 files) | P3 - Shared |
| MODIFY | Admin pages (3 files) | P3 - Main tab |
| MODIFY | Profile & Other pages (4 files) | P3 - Main tabs |

**Total: 3 deletions + ~45 modifications**

---

## Verification Plan

### 1. Visual Inspection
- [ ] Toggle dark/light mode - colors should transition smoothly
- [ ] Primary accent should be emerald in BOTH modes
- [ ] No blue primary colors visible
- [ ] Success states show emerald tints
- [ ] Error states show red tints
- [ ] Warning states show amber tints

### 2. Component Testing
- [ ] Assessment questions show correct feedback colors
- [ ] Dashboard cards have consistent styling
- [ ] Login page error/success messages use semantic colors
- [ ] Course cards use theme variables

### 3. Build Verification
```bash
npm run build
```
Ensure no Tailwind purge issues with new classes.

### 4. Pages to Check
- `/dashboard` - Metric cards, recommendations
- `/courses` - Course cards
- `/login` - Form validation states
- `/learn/session/[id]` - Chat interface, assessment feedback
- `/profile` - Form styling

---

## Implementation Order

### Phase 1: Cleanup & Foundation
1. DELETE unused files (3 files)
2. UPDATE `app/globals.css` - CSS variables matching template
3. UPDATE `tailwind.config.ts` - Semantic color mappings

### Phase 2: Documentation
4. UPDATE `AGENTS.md` - Add theming guidelines section

### Phase 3: Main Navigation Tabs (User-Facing)
5. Dashboard components + `app/dashboard/page.tsx`
6. Courses components + `app/courses/page.tsx`, `app/courses/[id]/page.tsx`
7. Admin pages (`app/admin/*.tsx`)
8. Profile page (`app/profile/page.tsx`)
9. Help page (`app/help-center/page.tsx`)

### Phase 4: Entry Points
10. Login page (`app/login/page.tsx`)
11. Welcome page (`app/welcome/page.tsx`)

### Phase 5: Core Features
12. Assessment components (6 files)
13. Learning components (6 files)
14. Layout components (4 files)

### Phase 6: Secondary Features
15. Creator/In-Class components (6 files)
16. Course library components (if distinct from `/courses`)
17. My-courses components
18. My-uploads components

**Estimated scope: ~48 file changes total**
