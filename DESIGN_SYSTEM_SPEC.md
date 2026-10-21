# Admin Design System Specification

**Version:** 1.0  
**Phase:** 1 (Admin Dashboard Foundation)  
**Status:** Ready for Implementation

---

## Overview

Reusable component library for TATI ChildSave admin dashboard and future role-specific dashboards (Parent, Facilitator, Learner).

**Principles:**
- Semantic, accessible, responsive
- Built on existing Radix UI & TATI foundations
- Uses OKLCH color system
- Token-driven, no hardcoded values
- Mobile-first, progressive enhancement

---

## 1. Layout Components

### AdminLayout (200 lines)
```tsx
interface AdminLayoutProps {
  children: React.ReactNode;
  title?: string;
  description?: string;
  actions?: React.ReactNode;
}

export function AdminLayout({
  children,
  title,
  description,
  actions
}: AdminLayoutProps) {
  // Returns:
  // <div className="flex h-screen">
  //   <AdminSidebar />
  //   <div className="flex-1 flex flex-col">
  //     <AdminHeader title={title} actions={actions} />
  //     <main className="flex-1 overflow-auto">
  //       <div className="p-6">{children}</div>
  //     </main>
  //   </div>
  // </div>
}
```

**Features:**
- ✓ Sidebar on desktop (>1024px)
- ✓ Drawer on mobile/tablet
- ✓ Sticky header with title/actions
- ✓ Scrollable content area
- ✓ Proper z-index for overlays
- ✓ Accessible via keyboard

**Responsive:**
- Mobile: `flex-col`, sidebar as drawer
- Tablet: `flex-col`, sidebar collapsible
- Desktop: `flex`, sidebar always visible

---

### AdminSidebar (150 lines)
```tsx
interface SidebarItem {
  label: string;
  to: string;
  icon: React.ReactNode;
  badge?: number;
  disabled?: boolean;
}

export function AdminSidebar() {
  const pathname = useRouterState(state => state.location.pathname);
  
  const items: SidebarItem[] = [
    { label: 'Overview', to: '/admin/dashboard', icon: <LayoutDashboard /> },
    { label: 'Families', to: '/admin/families', icon: <Users /> },
    { label: 'Learners', to: '/admin/learners', icon: <BookOpen />, disabled: true },
    { label: 'Facilitators', to: '/admin/facilitators', icon: <UserCheck /> },
    { label: 'Programmes', to: '/admin/programmes', icon: <Layers />, disabled: true },
    { label: 'Sessions', to: '/admin/sessions', icon: <Calendar />, disabled: true },
    { label: 'Reports', to: '/admin/reports', icon: <BarChart3 />, disabled: true },
    { label: 'Settings', to: '/admin/settings', icon: <Settings /> },
  ];
  
  return (
    <nav className="w-64 bg-card border-r border-border">
      {/* TATI Logo */}
      {/* Navigation Items */}
      {/* Footer with user menu */}
    </nav>
  );
}
```

**Styling:**
- Width: `w-64` (16rem)
- Background: `bg-card`
- Border: `border-r border-border`
- Active: `bg-primary text-primary-foreground rounded-xl`
- Hover: `bg-muted`
- Disabled: `opacity-50 cursor-not-allowed`

**Icons:** Lucide React

---

### AdminHeader (100 lines)
```tsx
interface AdminHeaderProps {
  title?: string;
  description?: string;
  actions?: React.ReactNode;
}

export function AdminHeader({ title, description, actions }: AdminHeaderProps) {
  return (
    <header className="border-b border-border bg-card px-6 py-4">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-extrabold">{title}</h1>
          {description && <p className="text-muted-foreground">{description}</p>}
        </div>
        {actions && <div className="flex gap-2">{actions}</div>}
      </div>
    </header>
  );
}
```

---

## 2. Data Display Components

### DataTable (250 lines)
```tsx
interface Column<T> {
  key: keyof T;
  label: string;
  width?: string;
  sortable?: boolean;
  render?: (value: T[keyof T], row: T) => React.ReactNode;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  onRowClick?: (row: T) => void;
  emptyState?: React.ReactNode;
  loading?: boolean;
  pagination?: { current: number; total: number; pageSize: number };
  onPageChange?: (page: number) => void;
}

export function DataTable<T extends { id: string }>({
  columns,
  data,
  onRowClick,
  emptyState,
  loading,
  pagination,
  onPageChange,
}: DataTableProps<T>) {
  // Table structure:
  // <div className="overflow-x-auto">
  //   <table className="w-full">
  //     <thead>
  //       <tr>{/* Column headers with sort indicators */}</tr>
  //     </thead>
  //     <tbody>
  //       {data.map(row => (
  //         <tr onClick={() => onRowClick?.(row)}>
  //           {/* Row cells */}
  //         </tr>
  //       ))}
  //     </tbody>
  //   </table>
  // </div>
  // {pagination && <Pagination />}
}
```

**Features:**
- ✓ Sortable columns
- ✓ Pagination controls
- ✓ Row click handling
- ✓ Custom cell rendering
- ✓ Empty state
- ✓ Loading skeleton
- ✓ Responsive (horizontal scroll on mobile)
- ✓ Hover state for rows
- ✓ Keyboard accessible

**Styling:**
- Header: `font-bold bg-secondary`
- Rows: `border-b border-border hover:bg-muted`
- Cells: `px-4 py-3 text-sm`
- Pagination: Bottom controls

---

### MetricCard (100 lines)
```tsx
type Tone = 'primary' | 'success' | 'warning' | 'neutral';
type Trend = 'up' | 'down' | 'neutral' | undefined;

interface MetricCardProps {
  title: string;
  value: string | number;
  unit?: string;
  icon?: React.ReactNode;
  trend?: Trend;
  trendValue?: string;
  tone?: Tone;
}

export function MetricCard({
  title,
  value,
  unit,
  icon,
  trend,
  trendValue,
  tone = 'primary',
}: MetricCardProps) {
  return (
    <Card className="p-6">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-muted-foreground text-sm font-medium">{title}</p>
          <div className="mt-2 flex items-baseline gap-1">
            <span className="text-3xl font-extrabold">{value}</span>
            {unit && <span className="text-muted-foreground">{unit}</span>}
          </div>
          {trendValue && (
            <p className="mt-2 text-xs">
              <TrendIndicator trend={trend} /> {trendValue}
            </p>
          )}
        </div>
        {icon && (
          <div className={`text-xl ${toneClasses[tone]}`}>{icon}</div>
        )}
      </div>
    </Card>
  );
}
```

**Tone Mapping:**
- `primary`: Blue icon, "Main metric"
- `success`: Green icon, "Active/positive"
- `warning`: Gold icon, "Pending/caution"
- `neutral`: Gray icon, "Secondary metric"

---

### StatusBadge (80 lines)
```tsx
type Status = 'active' | 'inactive' | 'pending' | 'error';

interface StatusBadgeProps {
  status: Status;
  label?: string;
  dot?: boolean;
}

export function StatusBadge({ status, label, dot = false }: StatusBadgeProps) {
  const statusConfig = {
    active: { color: 'success', icon: '●', text: 'Active' },
    inactive: { color: 'neutral', icon: '○', text: 'Inactive' },
    pending: { color: 'warning', icon: '◐', text: 'Pending' },
    error: { color: 'danger', icon: '✕', text: 'Error' },
  };
  
  const config = statusConfig[status];
  
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium ${toneClasses[config.color]}`}>
      {dot && <span>{config.icon}</span>}
      {label || config.text}
    </span>
  );
}
```

**Styling:**
- Active: Green background/text
- Inactive: Gray background/text
- Pending: Gold background/text
- Error: Red background/text

---

## 3. Form Components

### FormField (120 lines)
```tsx
interface FormFieldProps {
  label: string;
  name?: string;
  required?: boolean;
  error?: string;
  help?: string;
  children: React.ReactNode;
}

export function FormField({
  label,
  name,
  required = false,
  error,
  help,
  children,
}: FormFieldProps) {
  return (
    <div className="space-y-1">
      <label htmlFor={name} className="block text-sm font-semibold">
        {label}
        {required && <span className="ml-1 text-destructive">*</span>}
      </label>
      <div className="relative">
        {children}
      </div>
      {error && <p className="text-xs text-destructive mt-1">{error}</p>}
      {help && <p className="text-xs text-muted-foreground mt-1">{help}</p>}
    </div>
  );
}
```

**Features:**
- ✓ Label with required indicator
- ✓ Error message display
- ✓ Help text
- ✓ Proper spacing
- ✓ Accessible via htmlFor

---

### FormFieldInput (100 lines)
```tsx
interface FormFieldInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  help?: string;
  required?: boolean;
}

export function FormFieldInput({
  label,
  error,
  help,
  required,
  ...props
}: FormFieldInputProps) {
  const content = (
    <input
      className={cn(
        'w-full px-4 py-2 rounded-lg border-2 transition',
        'focus:outline-none focus:border-primary',
        error ? 'border-destructive' : 'border-border hover:border-primary',
        props.disabled && 'opacity-50 cursor-not-allowed',
      )}
      {...props}
    />
  );
  
  if (label) {
    return (
      <FormField label={label} error={error} help={help} required={required}>
        {content}
      </FormField>
    );
  }
  
  return content;
}
```

---

## 4. State Components

### EmptyState (100 lines)
```tsx
interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export function EmptyState({
  icon,
  title,
  description,
  action,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
      {icon && <div className="text-4xl mb-4 opacity-50">{icon}</div>}
      <h3 className="text-lg font-bold mb-2">{title}</h3>
      <p className="text-muted-foreground text-sm mb-6 max-w-sm">{description}</p>
      {action && (
        <Button variant="primary" onClick={action.onClick}>
          {action.label}
        </Button>
      )}
    </div>
  );
}
```

---

### LoadingState (80 lines)
```tsx
interface LoadingStateProps {
  count?: number;
}

export function LoadingState({ count = 3 }: LoadingStateProps) {
  return (
    <div className="space-y-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="h-12 bg-muted rounded-lg animate-pulse" />
      ))}
    </div>
  );
}
```

---

### ConfirmDialog (100 lines)
```tsx
interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  variant?: 'default' | 'danger';
}

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  onConfirm,
  variant = 'default',
}: ConfirmDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{cancelLabel}</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            className={variant === 'danger' ? 'bg-destructive' : ''}
          >
            {confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
```

---

## 5. Color System

### Semantic Mapping

```tsx
export const adminColors = {
  // Backgrounds
  background: 'oklch(0.968 0.017 92)',    // Cream
  surface: 'oklch(1 0 0)',                // White
  muted: 'oklch(0.93 0.017 82)',          // Light gray
  
  // Text
  foreground: 'oklch(0.21 0.02 264)',     // Dark blue
  muted_foreground: 'oklch(0.45 0.02 264)',
  
  // Actions
  primary: 'oklch(0.42 0.18 264)',        // TATI blue
  primary_soft: 'oklch(0.94 0.03 264)',   // Light blue
  
  // States
  success: 'oklch(0.54 0.15 152)',        // Green
  success_soft: 'oklch(0.92 0.06 152)',
  
  warning: 'oklch(0.78 0.15 68)',         // Gold
  warning_soft: 'oklch(0.94 0.05 75)',
  
  error: 'oklch(0.58 0.2 27)',            // Red
  error_soft: 'oklch(0.96 0.05 25)',
  
  // Borders
  border: 'oklch(0.9 0.015 84)',
  ring: 'oklch(0.42 0.18 264)',
};
```

---

## 6. Typography Scale

```tsx
export const adminTypography = {
  // Headings
  h1: 'text-3xl font-extrabold leading-tight',
  h2: 'text-2xl font-bold',
  h3: 'text-lg font-bold',
  
  // Body
  body: 'text-base leading-relaxed',
  body_sm: 'text-sm',
  body_xs: 'text-xs',
  
  // Labels
  label: 'text-sm font-semibold',
  label_sm: 'text-xs font-semibold',
  
  // Stats
  stat: 'text-3xl font-extrabold',
  stat_label: 'text-sm text-muted-foreground',
};
```

---

## 7. Spacing & Layout

```tsx
export const adminSpacing = {
  // Sidebar
  sidebar_width: 'w-64',
  sidebar_padding: 'px-4 py-3',
  
  // Content
  content_padding: 'px-6 py-4',
  content_max_width: 'max-w-7xl',
  
  // Sections
  section_gap: 'space-y-6',
  card_gap: 'gap-4',
  
  // Buttons
  button_height: 'h-10',
  button_padding: 'px-4 py-2',
  
  // Forms
  form_gap: 'space-y-4',
  input_height: 'h-10',
};
```

---

## 8. Component Export

```tsx
// src/components/admin/index.ts
export { AdminLayout } from './AdminLayout';
export { AdminSidebar } from './AdminSidebar';
export { AdminHeader } from './AdminHeader';
export { DataTable } from './DataTable';
export { MetricCard } from './MetricCard';
export { StatusBadge } from './StatusBadge';
export { FormField } from './FormField';
export { FormFieldInput } from './FormFieldInput';
export { EmptyState } from './EmptyState';
export { LoadingState } from './LoadingState';
export { ConfirmDialog } from './ConfirmDialog';

export type { AdminLayoutProps } from './AdminLayout';
export type { DataTableProps } from './DataTable';
export type { MetricCardProps } from './MetricCard';
// ... etc
```

---

## 9. Usage Examples

### Dashboard Page
```tsx
<AdminLayout title="Dashboard" description="Overview of the system">
  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
    <MetricCard
      title="Total Families"
      value={42}
      icon={<Users />}
      trend="up"
      trendValue="3 new this week"
      tone="primary"
    />
    <MetricCard
      title="Active Learners"
      value={156}
      icon={<BookOpen />}
      tone="success"
    />
    {/* More cards */}
  </div>
</AdminLayout>
```

### Data Table
```tsx
<AdminLayout title="Families">
  <DataTable
    columns={[
      { key: 'name', label: 'Family Name', sortable: true },
      { key: 'parent', label: 'Parent', sortable: true },
      { key: 'children', label: 'Children', width: 'w-20' },
      { key: 'status', label: 'Status', render: (v) => <StatusBadge status={v} /> },
    ]}
    data={families}
    onRowClick={(row) => navigate({ to: `/admin/families/${row.id}` })}
    emptyState={
      <EmptyState
        title="No families yet"
        description="Start by enrolling a new family"
        action={{ label: 'Enrol Family', onClick: () => navigate({ to: '/admin/enroll' }) }}
      />
    }
  />
</AdminLayout>
```

---

## 10. Accessibility Checklist

- [ ] All interactive elements keyboard accessible
- [ ] ARIA labels on buttons without text
- [ ] Proper heading hierarchy
- [ ] Form labels associated with inputs
- [ ] Error messages linked to fields
- [ ] Color not only indicator (icons + text)
- [ ] Focus indicators visible and high-contrast
- [ ] Sufficient color contrast (WCAG AA+)
- [ ] Responsive to prefers-reduced-motion
- [ ] Modals trap focus and restore on close

---

**Status:** Ready for Implementation  
**Next:** Begin Phase 1 Component Development

