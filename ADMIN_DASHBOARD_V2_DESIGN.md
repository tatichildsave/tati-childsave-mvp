# TATI ChildSave Admin Dashboard V2 — Visual Design Specification

## Design Reference
- **Reference Screenshot:** `design-references/admin-dashboard-approved.png`
- **Implementation:** `src/routes/admin/dashboard-v2.tsx`
- **Route:** `/admin/dashboard-v2`

---

## Brand Identity

### Colors (OKLCH Color Space)
All colors from TATI design system in `src/lib/theme.ts` and `src/styles.css`:

| Name | Purpose | OKLCH | Hex Approx | Tailwind |
|------|---------|-------|-----------|----------|
| **Primary Blue** | Navigation active, buttons, accents | oklch(0.42 0.18 264) | #154DA0 | `primary` |
| **Success Green** | Activity badges, positive trends | oklch(0.54 0.15 152) | #21856E | `green-600` |
| **Accent Gold** | Achievements, highlights | oklch(0.76 0.14 70) | #F4BA46 | `accent` |
| **Cream** | Page background | oklch(0.968 0.017 92) | #F8F3E9 | `background` |
| **White** | Cards, containers | #FFFFFF | #FFFFFF | `white` |
| **Dark Gray** | Primary text | #111827 | #111827 | `gray-900` |
| **Light Gray** | Secondary text | #6B7280 | #6B7280 | `gray-600` |
| **Border Gray** | Subtle borders | #E5E7EB | #E5E7EB | `gray-200` |

### Typography
- **Font Family:** Nunito (from TATI brand)
- **Font Sizes:** Tailwind scale (xs/sm/base/lg/xl/2xl)
- **Font Weights:** 400 (regular), 500 (medium), 600 (semibold), 700 (bold)

---

## Layout Architecture

### Desktop (1024px+)
```
┌─────────────────────────────────────────────────────┐
│ Sidebar (256px)      │ Top Navigation (full width) │
│ - Logo              │ - Menu toggle (hidden)      │
│ - Nav items (8)     │ - Title                     │
│ - Logout            │ - Notifications             │
│                     │ - Admin profile             │
├─────────────────────┼─────────────────────────────┤
│                     │ Hero Section                │
│                     │ - Welcome message           │
│                     │ - Image placeholder         │
│                     ├─────────────────────────────┤
│                     │ KPI Cards Grid (4 columns)  │
│                     │ - Families | Learners       │
│                     │ - Facilitators | Cohorts    │
│                     ├─────────────────────────────┤
│                     │ Enrol Banner (full width)   │
│                     ├─────────────────────────────┤
│                     │ Activity (2/3) │ Links (1/3)│
│                     └─────────────────────────────┘
```

### Tablet (768px - 1023px)
```
┌─────────────────────────────────────────────────────┐
│ Hamburger │ Top Navigation (mostly hidden)         │
├─────────────────────────────────────────────────────┤
│ Hero Section (full width, stacked)                  │
├─────────────────────────────────────────────────────┤
│ KPI Cards (2 columns)                              │
├─────────────────────────────────────────────────────┤
│ Enrol Banner (full width)                          │
├─────────────────────────────────────────────────────┤
│ Activity | Links (may stack or remain side-by-side)│
└─────────────────────────────────────────────────────┘
[Sidebar hidden, accessible via drawer]
```

### Mobile (360px - 767px)
```
┌──────────────────────────────┐
│ Hamburger  │ Title           │
├──────────────────────────────┤
│ Hero Section (stacked)       │
├──────────────────────────────┤
│ KPI Cards (1 column)         │
├──────────────────────────────┤
│ Enrol Banner (vertical)      │
├──────────────────────────────┤
│ Activity Section             │
├──────────────────────────────┤
│ Quick Links Section          │
└──────────────────────────────┘
[Sidebar drawer: slide-in from left]
```

---

## Component Specifications

### 1. Sidebar (Desktop & Mobile)

**Desktop Sidebar**
- Width: 256px (16rem)
- Background: White (`bg-white`)
- Border: Right border, 1px, `border-gray-200`
- Layout: Flex column, full height
- Positioned: Fixed on desktop

**Logo Section**
- Padding: 24px (6 units)
- Border-bottom: 1px `border-gray-200`
- Logo: 48px height (`h-12`), auto width
- Text: "TATI ChildSave", 14px, semibold, `text-gray-900`
- Spacing: 8px between logo and text

**Navigation**
- Container padding: 16px, 24px (4px horizontal, 6px vertical)
- Item spacing: 4px vertical gap
- Each nav item:
  - Height: 44px (py-3)
  - Padding: 16px (px-4)
  - Border radius: Large (lg)
  - Icon: 20px (`w-5 h-5`), margin-right: 12px
  - Label: 14px, medium weight
  - Default state: `text-gray-600`, hover: `bg-gray-50`
  - Active state:
    - Background: `bg-blue-50`
    - Text: `text-primary`
    - Left border: 4px, `border-primary`
  - Coming Soon badge:
    - Font: 12px, yellow background (`bg-yellow-100`), text (`text-yellow-800`)
    - Padding: 4px, 8px
    - Border radius: Full

**Logout Button**
- Border-top: 1px `border-gray-200`
- Padding: 16px
- Styling: Red text (`text-red-600`), hover: `bg-red-50`
- Icon: 20px, margin-right 12px
- Text: 14px, medium weight

**Mobile Sidebar (Drawer)**
- Width: 256px (same as desktop)
- Position: Fixed, inset-y-0, left-0, z-50
- Transform: Slide in/out (300ms transition)
- Closed: `-translate-x-full`
- Open: `translate-x-0`
- Header with close button in drawer version

---

### 2. Top Navigation

**Container**
- Height: 64px (approx)
- Background: White
- Border-bottom: 1px `border-gray-200`
- Padding: 16px, 24px (px-4 sm:px-6 lg:px-8)

**Content Layout**
- Display: Flex, items center, space-between
- Left: Hamburger menu (hidden on lg+), breadcrumb, or title
- Right: Notification icon (Bell), admin profile

**Hamburger Menu Button** (visible only on < lg)
- Icon: Menu (Lucide)
- Size: 20px
- Styling: `text-gray-600`, hover: `bg-gray-100`
- Padding: 8px
- Border radius: Large

**Notification Icon** (future)
- Icon: Bell (Lucide)
- Size: 20px
- Styling: `text-gray-600`

**Admin Profile**
- Display text: "Administrator"
- Font: 14px, medium weight
- Color: `text-gray-900`

---

### 3. Hero Section

**Container**
- Layout: Grid, 1 column (mobile/tablet) → 2 columns (desktop)
- Gap: 32px between columns
- Padding: Bottom 32px margin

**Text Content (Left/Top)**
- Greeting: "Welcome back, Administrator!"
  - Font: 28px, bold, `text-gray-900`
  - Color: Dark navy blue
- Supporting text: Optional tagline
  - Font: 16px, regular, `text-gray-600`

**Image Area (Right/Bottom)**
- Layout: Flex, center, justify-center
- Background: Gradient from cream to light blue (subtle)
- Placeholder: 
  - Font: 14px, `text-gray-400`
  - Text: "Hero image: Two smiling African schoolchildren"
  - Border: Dashed 2px `border-gray-300`
  - Min-height: 200px
  - Border radius: Large (8px)

**Responsive Behavior**
- Desktop: Side-by-side
- Tablet/Mobile: Stack vertically, image below text

---

### 4. KPI Grid

**Container**
- Grid: 1 column (mobile) → 2 columns (tablet: md) → 4 columns (desktop: lg)
- Gap: 24px (between cards)
- Margin-bottom: 32px

**Each KPI Card**

| Property | Value |
|----------|-------|
| Background | `bg-white` |
| Border | 1px `border-gray-200` |
| Padding | 24px (6 units) |
| Border-radius | Large (8px) |
| Hover effect | `hover:shadow-lg` transition |

**Icon Container**
- Width/Height: 48px (`w-12 h-12`)
- Border-radius: Large (8px)
- Display: Flex, center
- Background colors by KPI:
  - Families: `bg-blue-50`, icon `text-blue-600`
  - Learners: `bg-green-50`, icon `text-green-600`
  - Facilitators: `bg-purple-50`, icon `text-purple-600`
  - Cohorts: `bg-gray-50`, icon `text-gray-600`
- Margin-bottom: 16px

**Label**
- Font: 10px, semibold, uppercase, `text-gray-500`
- Margin-bottom: 4px

**Value**
- Font: 32px, bold, `text-gray-900`
- Margin-bottom: 8px

**Trend/Note**
- If trend available:
  - Icon: TrendingUp (Lucide), 16px, `text-green-600`
  - Text: "+{percentage}% from last month"
  - Font: 14px, `text-green-600`, medium weight
- If no trend (cohorts):
  - Text: "No active cohorts yet"
  - Font: 14px, `text-gray-500`

**Loading State**
- Show: Animated skeleton loader
- Height: 32px
- Background: `bg-gray-200`
- Border-radius: Default
- Animation: Pulse

---

### 5. Enrol Banner

**Container**
- Background: Gradient `from-blue-500 to-blue-600`
- Padding: 32px (8 units)
- Border-radius: Extra-large (12px) rounded-2xl
- Margin-bottom: 32px
- Layout: Flex, items-start to items-center (responsive)
- Gap: 24px

**Left Content**
- Layout: Flex, gap 16px
- Icon container:
  - Background: `bg-blue-400`
  - Border-radius: Full (rounded-full)
  - Padding: 12px
  - Size: 48px (`w-12 h-12`)
  - Icon: Plus (Lucide), 24px

**Text Content**
- Label: "ENROL NEW FAMILY"
  - Font: 10px, semibold, uppercase, `text-blue-100`
  - Margin-bottom: 4px
- Heading: "Add a new family to TATI ChildSave"
  - Font: 24px, bold, `text-white`
  - Margin-bottom: 8px
- Description: "Register a family and provision their children with TATI IDs to get started."
  - Font: 14px, regular, `text-blue-100`

**Button (Right)**
- Background: White (`bg-white`)
- Text color: `text-blue-600`
- Hover: `hover:bg-blue-50`
- Font: 14px, semibold
- Padding: 12px, 24px (py-3 px-6)
- Border-radius: Large (8px)
- Text: "Get Started"
- Icon: ChevronRight (Lucide), 16px, margin-left 8px
- Flex-shrink-0 (doesn't shrink on small screens)

**Responsive**
- Desktop: Horizontal layout, button on right
- Mobile: May stack to vertical, button below or beside

---

### 6. Recent Activity Section

**Container**
- Column span: 2 on lg (lg:col-span-2), 1 on smaller
- Background: `bg-white`
- Border: 1px `border-gray-200`
- Border-radius: Large (8px) rounded-xl
- Padding: 24px

**Header**
- Layout: Flex, justify-between, items-center
- Margin-bottom: 24px

**Left Section (Title)**
- Heading: "Recent Activity"
  - Font: 18px, bold, `text-gray-900`
- Description: "Latest updates and activity across the platform."
  - Font: 14px, `text-gray-500`
  - Margin-top: 4px

**Right Section (View All)**
- Link text: "View all"
- Icon: ChevronRight (Lucide), 16px
- Font: 14px, semibold, `text-primary`
- Display: Flex, gap-1, items-center

**Activity List**

Each activity item:
```
Icon    Title (bold)
(10px   Description (small, gray)
circle) Badge (if present)
        Time (small, gray) ⏱ format
        ─────────────────────────────
```

| Property | Value |
|----------|-------|
| Layout | Flex, gap 16px |
| Padding | 16px bottom, 16px top |
| Border-bottom | 1px `border-gray-100` (except last) |

**Icon Circle**
- Width/Height: 40px
- Background: `bg-gray-100`
- Border-radius: Full
- Display: Flex, center
- Icon size: 20px
- Icon colors by type:
  - Family: `text-blue-600`
  - Child: `text-green-600`
  - Learner: `text-purple-600`
- Flex-shrink-0

**Title & Description**
- Title: 14px, semibold, `text-gray-900`
- Description: 12px, `text-gray-500`
- Margin-top: 4px

**Badge** (if present)
- Font: 12px, medium, rounded-full
- Padding: 4px, 8px
- Colors by type:
  - Primary: `bg-blue-100`, `text-blue-700`
  - Success: `bg-green-100`, `text-green-700`
  - Warning: `bg-yellow-100`, `text-yellow-700`
- Position: Right side, flex-shrink-0

**Timestamp**
- Font: 12px, `text-gray-400`
- Icon: Clock (Lucide), 12px
- Format: "Just now", "5m ago", "2h ago", "1d ago", or date
- Margin-top: 8px

**Empty State**
- Text: "No recent activity"
- Font: 14px, center, `text-gray-500`
- Padding: 32px vertical (py-8)

**Loading State**
- Show 3 skeleton loaders
- Height: 48px each
- Spacing: 16px gap
- Background: `bg-gray-200`
- Animation: Pulse

---

### 7. Quick Links Section

**Container**
- Column span: 1 on lg
- Background: `bg-white`
- Border: 1px `border-gray-200`
- Border-radius: Large (8px) rounded-xl
- Padding: 24px

**Header**
- Heading: "Quick Links"
  - Font: 18px, bold, `text-gray-900`
- Description: "Common tasks to help you get started quickly."
  - Font: 14px, `text-gray-500`
  - Margin-top: 4px
- Margin-bottom: 24px

**Link Cards**
- Layout: Vertical stack (space-y-3)
- Each card padding: 16px (p-4)
- Border: 1px `border-gray-200`
- Border-radius: Large (8px)

**Enabled Card (e.g., "View Families")**
- Background: Default white
- Hover: `bg-blue-50`, `border-primary`
- Cursor: Pointer
- Transition: All

**Disabled Card (e.g., "Coming Soon")**
- Background: `bg-gray-50`
- Border: `border-gray-200`
- Opacity: 50% (opacity-50)
- Cursor: `cursor-not-allowed`

**Card Content**
- Layout: Flex, justify-between, items-center
- Left side: Flex, items-center, gap-12px (gap-3)
  - Icon: 20px, `text-gray-600` or `text-primary`
  - Text container:
    - Title: 14px, semibold, `text-gray-900`
    - Description: 12px, `text-gray-500`
    - Margin-top: 2px
- Right side: ChevronRight (Lucide), 20px, `text-gray-400`

---

## Responsive Design Rules

### Breakpoints (Tailwind)
| Breakpoint | Min Width | Device | Grid Columns |
|---|---|---|---|
| base | 0 | Mobile | 1 |
| sm | 640px | Small tablet | 1 |
| md | 768px | Tablet | 2 |
| lg | 1024px | Desktop | 4 |
| xl | 1280px | Large desktop | 4 |

### Responsive Classes Used
- `hidden lg:flex` — Sidebar visible only on desktop
- `grid-cols-1 md:grid-cols-2 lg:grid-cols-4` — KPI grid adapts
- `lg:col-span-2` — Activity section takes 2/3 on desktop
- `flex-col md:flex-row` — Hero section stacks on mobile
- `w-full md:w-auto` — Full width on mobile, auto on desktop

### Mobile-First Breakpoint Strategy
- Default: Mobile single-column layout
- At md (768px): Two-column layouts activate
- At lg (1024px): Full desktop layout with sidebar

---

## Accessibility Checklist

- ✅ Semantic HTML (button, a, nav, main, section)
- ✅ ARIA labels on icon-only buttons
- ✅ Focus states visible on keyboard navigation
- ✅ Color not sole differentiator (badges have text, icons have labels)
- ✅ Text contrast ≥ 4.5:1 (WCAG AA)
- ✅ Font size ≥ 12px for body text
- ✅ Touch targets ≥ 44px minimum (buttons)
- ✅ Keyboard accessible (Tab, Enter, Escape)

### Keyboard Interactions
- `Tab` — Navigate through interactive elements
- `Enter` / `Space` — Activate buttons
- `Escape` — Close mobile sidebar drawer
- `Arrow keys` — (Future) navigate menu items

---

## Interactive States

### Buttons
- Default: Resting appearance
- Hover: Shadow/background change
- Active/Pressed: Darker shade, visual feedback
- Disabled: Opacity 50%, cursor-not-allowed

### Links
- Default: Primary blue (`text-primary`)
- Hover: Underline or darker shade
- Visited: No change (dashboard is single-session)

### Sidebar Items
- Default: Gray text
- Hover: Light gray background
- Active: Blue background, left border, blue text
- Coming Soon: Disabled appearance, yellow badge

### Cards
- Default: White background, subtle border
- Hover: Shadow elevation (hover:shadow-lg)
- Focus: Border color change (on click)

---

## Future Enhancement Opportunities

1. **Dark Mode** — Add `dark:` Tailwind classes for dark theme
2. **Animation** — Fade-in, slide-in effects on load
3. **Micro-interactions** — Button ripple effects, success toasts
4. **Data Persistence** — Cache recent activity, preferences
5. **Real-time Updates** — Firestore subscriptions for live data
6. **Advanced Filtering** — Filter activity by type, date range
7. **Export/Reports** — Download dashboard data as PDF/CSV
8. **Notifications** — Toast notifications for actions, errors
9. **Customization** — Adjust dashboard widgets, layout

---

**Design System Version:** 1.0
**Last Updated:** October 2026
**Status:** Approved ✅
