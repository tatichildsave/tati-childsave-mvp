# Admin Dashboard Visual Design — Implementation Reference

## Desktop Layout (1920x1080+)

```
┌─────────────────────────────────────────────────────────────────────────┐
│                                                                           │
│  TATI Logo    │  Dashboard                                    🔔   👤  │
│  [Sidebar]    │  Welcome to TATI Admin                                  │
│               │                                                          │
├─────────────────────────────────────────────────────────────────────────┤
│               │                                                          │
│ Dashboard  ⎕  │  Welcome back, Administrator                            │
│ ━━━━━━━━━   │  Here's an overview of your platform                    │
│               │                                                          │
│ Families    ⎕ │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐
│               │  │ Total    │  │ Active   │  │Facil-   │  │ Active   │
│ Learners   ⏳ │  │Families  │  │ Learners │  │itators  │  │ Cohorts  │
│               │  │         45│  │       127│  │        12│  │         0│
│ Facil.     ⏳ │  └──────────┘  └──────────┘  └──────────┘  └──────────┘
│               │
│ Prog.      ⏳ │  ┌────────────────────────────────────────────────────┐
│               │  │ 👨‍👩‍👧  Enrol New Family                             │
│ Sessions   ⏳ │  │ Add a family to the platform and provision         │
│               │  │ their children with TATI IDs                       │
│ Reports    ⏳ │  │                          [Get Started →]           │
│               │  └────────────────────────────────────────────────────┘
│ Settings   ⎕  │
│               │  ┌────────────────────┐  ┌──────────────────┐
│ [Logout]      │  │Recent Activity     │  │ Quick Links      │
│               │  │                    │  │                  │
└───────────────┤  │ 👨‍👩‍👧 Family created │  │ View All Families│
│              │  │    Smith Family    │  │ Manage records   │
│              │  │    3 member(s)     │  │                  │
│              │  │    2h ago          │  │                  │
│              │  │                    │  │                  │
│              │  │ 👶 Child enrolled  │  │                  │
│              │  │    Sarah           │  │                  │
│              │  │    TATI ID: TAT... │  │                  │
│              │  │    1h ago          │  │                  │
│              │  │                    │  │                  │
│              │  │ 👨‍👩‍👧 Family created │  │                  │
│              │  │    Johnson Family  │  │                  │
│              │  │    2 member(s)     │  │                  │
│              │  │    45m ago         │  │                  │
│              │  │                    │  │                  │
│              │  └────────────────────┘  └──────────────────┘
└────────────────────────────────────────────────────────────────────────────┘
```

### Color Scheme

**Navigation & Sidebar:**
- Background: `#F8F3E9` (Warm cream - from brand)
- Text: `#1A1A1A` (Dark foreground)
- Active item border: `#154DA0` (Primary blue)
- Logo area: White background with subtle shadow

**Metrics Cards (KPI Grid):**
Each card: 
- Background: White
- Border: Subtle 1px `#E5E0D8` (light border)
- Shadow: `0 1px 2px rgba(0, 0, 0, 0.05)`
- Hover shadow: `0 4px 6px rgba(0, 0, 0, 0.1)`

Card tones:
- **Primary (Families):** Icon bg `#EBF5FF` (#154DA0 faded), icon `#154DA0`
- **Success (Learners):** Icon bg `#EBF8F5` (#21856E faded), icon `#21856E`
- **Accent (Facilitators):** Icon bg `#FFF8EB` (#F4BA46 faded), icon `#F4BA46`
- **Neutral (Cohorts):** Icon bg `#F5F5F5`, icon `#666666`

**Action Card (Enrol Family):**
- Background: White
- Border: `2px solid #154DA0` (featured)
- Icon background: `#EBF5FF`
- Button: Primary blue `#154DA0` with white text, rounded lg

**Recent Activity:**
- Cards: White with subtle border
- Icon containers: `#F5F5F5` background, 40px × 40px rounded
- Timeline line: `#E5E0D8` (1px divider)
- Timestamps: Small gray text `#808080`
- Tone badges: Semantic colors matching card tones

**Quick Links:**
- Card: White background, border, hover effect

### Typography

- **Page title:** 30px, 700 weight (Nunito), `#1A1A1A`
- **Section subtitle:** 14px, 400 weight, `#666666`
- **Card titles:** 16px, 600 weight, `#1A1A1A`
- **Card numbers:** 32px, 600 weight, `#154DA0` or tone-specific
- **Activity title:** 14px, 600 weight, `#1A1A1A`
- **Activity description:** 13px, 400 weight, `#666666`
- **Body text:** 14px, 400 weight, `#1A1A1A`
- **Small text (timestamp):** 12px, 400 weight, `#808080`

### Spacing

- Sidebar width: 260px
- Main content padding: 32px (lg screens), 24px (md screens), 16px (mobile)
- Grid gap (KPIs): 16px
- Section spacing: 32px between major sections
- Card internal padding: 24px

---

## Tablet Layout (768px - 1023px)

```
┌────────────────────────────────────┐
│ TATI [☰] │ Dashboard      🔔  👤  │
├────────────────────────────────────┤
│                                    │
│ Welcome back, Administrator        │
│ Here's an overview                 │
│                                    │
│ ┌──────────┐  ┌──────────┐        │
│ │ Families │  │ Learners │        │
│ │    45    │  │   127    │        │
│ └──────────┘  └──────────┘        │
│                                    │
│ ┌──────────┐  ┌──────────┐        │
│ │Facil.    │  │ Cohorts  │        │
│ │   12     │  │     0    │        │
│ └──────────┘  └──────────┘        │
│                                    │
│ ┌────────────────────────────────┐ │
│ │ 👨‍👩‍👧  Enrol New Family          │ │
│ │ Add a family to the platform  │ │
│ │        [Get Started →]        │ │
│ └────────────────────────────────┘ │
│                                    │
│ ┌────────────────────────────────┐ │
│ │Recent Activity                 │ │
│ │ 👨‍👩‍👧 Family created: Smith      │ │
│ │    3 member(s) | 2h ago        │ │
│ │ 👶 Child enrolled: Sarah        │ │
│ │    TATI ID: TAT... | 1h ago    │ │
│ │ 👨‍👩‍👧 Family created: Johnson    │ │
│ │    2 member(s) | 45m ago       │ │
│ │                                │ │
│ │Quick Links                     │ │
│ │ View All Families              │ │
│ └────────────────────────────────┘ │
│                                    │
└────────────────────────────────────┘
```

**Changes from desktop:**
- Navigation drawer accessible via hamburger icon
- 2-column KPI grid instead of 4-column
- Single-column content (Activity fills width)
- Full-width quick links
- Reduced padding and margins

---

## Mobile Layout (< 768px)

```
┌──────────────────────────┐
│ [☰] Dashboard      🔔  👤│
├──────────────────────────┤
│ Welcome back,            │
│ Administrator            │
│                          │
│ ┌──────────────────────┐ │
│ │ Families            │ │
│ │      45             │ │
│ └──────────────────────┘ │
│                          │
│ ┌──────────────────────┐ │
│ │ Active Learners      │ │
│ │      127             │ │
│ └──────────────────────┘ │
│                          │
│ ┌──────────────────────┐ │
│ │ Facilitators        │ │
│ │      12             │ │
│ └──────────────────────┘ │
│                          │
│ ┌──────────────────────┐ │
│ │ Active Cohorts       │ │
│ │       0              │ │
│ └──────────────────────┘ │
│                          │
│ ┌──────────────────────┐ │
│ │ 👨‍👩‍👧 Enrol New Family │ │
│ │ Add a family to      │ │
│ │ the platform and     │ │
│ │ provision children   │ │
│ │ [Get Started]        │ │
│ └──────────────────────┘ │
│                          │
│ ┌──────────────────────┐ │
│ │Recent Activity       │ │
│ │                      │ │
│ │ 👨‍👩‍👧 Family created: │ │
│ │ Smith Family         │ │
│ │ 3 member(s)          │ │
│ │ 2h ago               │ │
│ │                      │ │
│ │ 👶 Child enrolled:   │ │
│ │ Sarah                │ │
│ │ TATI ID: TAT...      │ │
│ │ 1h ago               │ │
│ │                      │ │
│ │ 👨‍👩‍👧 Family created: │ │
│ │ Johnson Family       │ │
│ │ 2 member(s)          │ │
│ │ 45m ago              │ │
│ │                      │ │
│ │Quick Links           │ │
│ │View All Families     │ │
│ └──────────────────────┘ │
└──────────────────────────┘
```

**Mobile-specific design:**
- 1-column layout for all cards
- Hamburger menu opens navigation drawer
- Full-width button styling
- Touch-friendly spacing (44px minimum touch targets)
- Stacked sections vertically
- Optimized font sizes for readability

---

## Navigation Drawer (Mobile)

```
┌──────────────────────┐
│ ╳  TATI ChildSave    │
├──────────────────────┤
│                      │
│ Dashboard     ✓      │
│ ━━━━━━━━━━━━━━━━━━  │
│                      │
│ Families             │
│                      │
│ Learners      ⏳      │
│                      │
│ Facilitators  ⏳      │
│                      │
│ Programmes    ⏳      │
│                      │
│ Sessions      ⏳      │
│                      │
│ Reports       ⏳      │
│                      │
│ Settings             │
│                      │
├──────────────────────┤
│ [Logout]             │
└──────────────────────┘
```

---

## Component States

### Loading State
- Metric cards: Animated skeleton loader
- Activity feed: 3 placeholder rows with pulse animation
- Entire dashboard: Loading overlay or spinner while fetching data

### Empty State (No Data)
```
┌────────────────────────────┐
│  ⚠️  Something went wrong   │
│                            │
│  Failed to load dashboard  │
│  data. Please try again.   │
│                            │
│      [Try Again]           │
└────────────────────────────┘
```

### Error State
- Message displayed instead of dashboard
- Retry button to reload data
- Maintains header navigation

### Data-Loaded State
- All cards display real metrics
- Activity feed shows recent events
- All buttons functional
- Links to other admin sections work

---

## Interaction States

### Metric Cards
- **Hover:** Shadow increases, slight scale up
- **Focus (keyboard):** Outline with primary color
- **Disabled:** Opacity 0.5, no interaction

### Buttons
- **Default:** Solid primary blue background, white text
- **Hover:** Slightly darker blue, increased shadow
- **Active/Pressed:** Darker color, inset shadow
- **Focus (keyboard):** Outline + solid background
- **Disabled:** Gray background, no hover effects

### Links (Quick Links)
- **Default:** Border, light background
- **Hover:** Darker border, slightly darker background
- **Focus:** Outline focus ring
- **Active:** Primary blue underline or border

### Activity Timeline
- **Hover:** Highlight row with light background
- **Focus:** Outline around activity item

---

## Responsive Breakpoints

| Breakpoint | Width | Layout | Sidebar |
|-----------|-------|--------|---------|
| Mobile | < 768px | 1 column | Drawer |
| Tablet | 768px - 1023px | 2 column | Drawer |
| Desktop | ≥ 1024px | Full (4-col grid) | Fixed |

---

## Accessibility Features

✅ **Color Contrast**
- Text-to-background ratios meet WCAG AA standard (4.5:1 for body, 3:1 for large text)
- Do not rely on color alone for meaning (use icons, badges, text)

✅ **Keyboard Navigation**
- All interactive elements focusable with Tab
- Logical tab order (left-to-right, top-to-bottom)
- Escape key closes drawer
- Enter/Space activates buttons
- Focus visible indicators

✅ **Screen Readers**
- Semantic HTML structure
- ARIA labels on interactive elements
- Activity feed uses list structure
- Metric cards labeled with purpose
- Loading states announced

✅ **Touch Friendly**
- Minimum 44px touch targets
- Adequate spacing between clickable elements
- No hover-only information on mobile

✅ **Motion & Animation**
- Smooth transitions (150ms - 300ms)
- Respects `prefers-reduced-motion`
- Loading spinners optional

---

## Typography Hierarchy Example

**Page Level:**
"Welcome back, Administrator" — 30px, 700, primary color
"Here's an overview of your platform" — 14px, 400, gray

**Section Level:**
"Recent Activity" — 16px, 700, primary color

**Card Level:**
"Total Families" — 12px, 500, gray
"45" — 32px, 700, primary color

**Content Level:**
"Smith Family" — 14px, 600, primary color
"3 member(s)" — 12px, 400, gray
"2h ago" — 11px, 400, light gray

---

## Shadow Depth

- **Elevated (Cards):** `0 1px 2px rgba(0,0,0,0.05)` (subtle)
- **Interactive (Hover):** `0 4px 6px rgba(0,0,0,0.1)` (raised)
- **Modal/Drawer:** `0 10px 15px rgba(0,0,0,0.2)` (prominent)
- **Sidebar:** `0 4px 6px rgba(0,0,0,0.08)` (slight depth)

---

## Spacing System

| Scale | Value |
|-------|-------|
| xs | 4px |
| sm | 8px |
| md | 12px |
| lg | 16px |
| xl | 24px |
| 2xl | 32px |
| 3xl | 48px |

**Applied in dashboard:**
- Between major sections: 2xl (32px)
- Card internal padding: xl (24px)
- KPI grid gap: lg (16px)
- Line height: 1.5-1.75 for readability

---

## Color Palette Reference

| Name | Hex | OKLCH | Usage |
|------|-----|-------|-------|
| Primary | #154DA0 | OKLCh(50%, 0.12, 262) | Brand blue, buttons, active states |
| Success | #21856E | OKLCh(50%, 0.10, 172) | Growth, learners, positive |
| Accent | #F4BA46 | OKLCh(73%, 0.20, 73) | Gold, achievements, highlights |
| Cream | #F8F3E9 | OKLCh(92%, 0.02, 83) | Sidebar background, neutral |
| White | #FFFFFF | OKLCh(100%, 0, 0) | Card backgrounds, text backgrounds |
| Foreground | #1A1A1A | OKLCh(17%, 0.01, 280) | Primary text |
| Muted | #808080 | OKLCh(50%, 0.02, 240) | Secondary text, disabled |
| Border | #E5E0D8 | OKLCh(88%, 0.02, 83) | Card borders, dividers |

---

## Icon Reference

All icons from Lucide React:

- **Dashboard:** LayoutDashboard (24px)
- **Families:** Users (24px)
- **Learners:** BookOpen (24px)
- **Facilitators:** UserCheck (24px)
- **Programmes:** Layers (24px)
- **Sessions:** Calendar (24px)
- **Reports:** BarChart3 (24px)
- **Settings:** Settings (24px)
- **Logout:** LogOut (20px)
- **Menu:** Menu (24px) / MoreVertical (24px)
- **Actions:** UserPlus (24px) for enrol, Plus (20px) for new

**Icon sizing:**
- Sidebar: 24px
- Card headers: 24px
- Action buttons: 24px
- Inline: 18-20px

---

## Future Enhancements

✨ **Phase 2 (Parent Dashboard):**
- Child progress overview
- Learning milestones
- Family activity feed
- Communication with facilitators

✨ **Phase 3 (Facilitator Dashboard):**
- Session management
- Class roster
- Assessment tracking
- Parent communication

✨ **Phase 4 (Learner Dashboard):**
- Personalized learning pathway
- Achievement tracking
- Session access
- Progress visualization

---

## Design System Validation

✅ **Consistency:** All components use design tokens from `src/lib/theme.ts`
✅ **Accessibility:** WCAG AA compliance for colors and contrast
✅ **Responsiveness:** Tested at 320px, 768px, 1024px, 1920px
✅ **Performance:** Minimal re-renders, lazy loading for activity
✅ **Brand Alignment:** Uses official TATI colors, Nunito font, logo placement
✅ **Usability:** Clear visual hierarchy, predictable interactions
✅ **Maintainability:** Reusable component patterns, semantic naming

