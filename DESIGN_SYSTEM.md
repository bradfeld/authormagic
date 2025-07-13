# AuthorMagic Design System
*Comprehensive design system documentation for consistent UI development*

## 🎨 **Design Philosophy**

**Core Principles:**
- **Developer-First**: Code-driven design using shadcn/ui + Tailwind
- **Accessibility**: WCAG 2.1 AA compliance through Radix UI primitives
- **Consistency**: Unified design language across all interfaces
- **Scalability**: Component-based architecture for maintainability

---

## 🎯 **Design Tokens**

### **Typography**
```typescript
// Primary: Geist Sans (Modern, readable)
font-family: var(--font-geist-sans)

// Monospace: Geist Mono (Code, data display)
font-family: var(--font-geist-mono)

// Scale: Tailwind default (text-sm, text-base, text-lg, etc.)
```

### **Color Palette**
```css
/* Light Mode */
--background: oklch(1 0 0)           /* Pure white */
--foreground: oklch(0.145 0 0)       /* Near black */
--primary: oklch(0.205 0 0)          /* Dark gray */
--secondary: oklch(0.97 0 0)         /* Light gray */
--muted: oklch(0.97 0 0)             /* Subtle gray */
--border: oklch(0.922 0 0)           /* Border gray */
--destructive: oklch(0.577 0.245 27.325) /* Red */

/* Dark Mode */
--background: oklch(0.145 0 0)       /* Dark background */
--foreground: oklch(0.985 0 0)       /* Light text */
/* ... (see globals.css for complete set) */
```

### **Spacing & Layout**
```css
--radius: 0.625rem                   /* 10px - Primary border radius */
--radius-sm: calc(var(--radius) - 4px)  /* 6px */
--radius-md: calc(var(--radius) - 2px)  /* 8px */
--radius-lg: var(--radius)              /* 10px */
--radius-xl: calc(var(--radius) + 4px)  /* 14px */
```

---

## 🧩 **Component Library**

### **Available Components**
```
✅ Core Components:
- Button (5 variants: default, destructive, outline, secondary, ghost, link)
- Card (header, content, footer)
- Input (with proper focus states)
- Badge (status indicators)
- Avatar (user profiles)

✅ Layout Components:
- Dialog (modals, forms)
- Tabs (content organization)
- Table (data display)
- Navigation Menu (primary nav)
- Dropdown Menu (actions, settings)

✅ Form Components:
- Textarea (multi-line input)
```

### **Component Usage Patterns**

#### **Books & Content Cards**
```typescript
// Standard pattern for book display
<Card className="hover:shadow-md transition-shadow">
  <CardHeader>
    <CardTitle className="text-lg line-clamp-2">{title}</CardTitle>
  </CardHeader>
  <CardContent>
    <div className="space-y-3">
      {/* Icon + Text pattern */}
      <div className="flex items-center gap-2">
        <Users className="h-4 w-4 text-gray-500" />
        <span className="text-sm text-gray-600">{data}</span>
      </div>
    </div>
  </CardContent>
</Card>
```

#### **Icon Usage Standards**
```typescript
// Size standards
h-4 w-4        // Standard icon size (16px)
h-5 w-5        // Medium icon size (20px)
h-6 w-6        // Large icon size (24px)

// Color patterns
text-gray-500  // Inactive/secondary icons
text-primary   // Active/primary icons
text-destructive // Error/delete icons
```

#### **Button Patterns**
```typescript
// Primary actions
<Button>Primary Action</Button>

// Secondary actions  
<Button variant="outline">Secondary</Button>

// Destructive actions
<Button variant="destructive">Delete</Button>

// Icon buttons
<Button size="icon"><Icon className="h-4 w-4" /></Button>
```

---

## 🎨 **v0.dev Integration Workflow**

### **Step 1: Design Generation**
```
1. Visit: https://v0.dev
2. Describe UI: "Create a modern book statistics dashboard card with metric tiles"
3. Specify stack: "Use shadcn/ui components with Tailwind CSS"
4. Get React code output
```

### **Step 2: Integration Process**
```typescript
// 1. Copy component code from v0.dev
// 2. Save to: src/components/generated/ComponentName.tsx
// 3. Update imports to use your existing shadcn/ui components
// 4. Apply your design tokens (colors, spacing, typography)
// 5. Test in your local environment
// 6. Move to appropriate directory when finalized
```

### **Step 3: Consistency Checklist**
```
✅ Uses existing shadcn/ui components
✅ Follows icon patterns (Lucide React, h-4 w-4)
✅ Applies proper spacing (space-y-3, gap-2)
✅ Uses design token colors (text-gray-500, etc.)
✅ Includes hover states and transitions
✅ Supports light/dark mode
✅ TypeScript interfaces defined
```

---

## 📋 **Development Guidelines**

### **File Organization**
```
src/components/
├── ui/                     # shadcn/ui base components
├── book-management/        # Feature-specific components
├── generated/              # v0.dev components (staging)
└── layout/                 # Layout components (future)
```

### **Naming Conventions**
```typescript
// Components: PascalCase
BookCard.tsx
BookManagementDashboard.tsx

// Props interfaces: ComponentNameProps
interface BookCardProps {
  book: UIBook
  onView?: (book: UIBook) => void
}

// CSS classes: kebab-case (Tailwind standard)
className="hover:shadow-md transition-shadow"
```

### **Component Structure Template**
```typescript
'use client' // Only when needed

import { UIType } from '@/lib/types/ui-type'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Icon } from 'lucide-react'

interface ComponentNameProps {
  // TypeScript interfaces
}

export function ComponentName({ ...props }: ComponentNameProps) {
  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader>
        <CardTitle>Title</CardTitle>
      </CardHeader>
      <CardContent>
        {/* Content */}
      </CardContent>
    </Card>
  )
}
```

---

## 🚀 **Next Steps & Enhancements**

### **Phase 1: Enhanced Book UI**
- [ ] Author profile cards with statistics
- [ ] Book performance dashboard tiles  
- [ ] Enhanced search interface
- [ ] Book recommendation cards

### **Phase 2: Advanced Components**
- [ ] Data visualization components
- [ ] Interactive forms with validation
- [ ] Advanced table with sorting/filtering
- [ ] Notification system

### **Phase 3: Mobile Optimization**
- [ ] Responsive card layouts
- [ ] Mobile-first navigation
- [ ] Touch-friendly interactions

---

## 🛠️ **Tools & Resources**

### **Primary Tools**
- **v0.dev**: AI component generation
- **shadcn/ui**: Component library
- **Tailwind CSS**: Utility-first styling
- **Lucide React**: Icon system

### **Design References**
- [shadcn/ui Components](https://ui.shadcn.com/components)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)
- [Radix UI Documentation](https://www.radix-ui.com/docs)

### **Quick Commands**
```bash
# Add new shadcn/ui component
npx shadcn@latest add [component-name]

# Start development server
npm run dev

# Check TypeScript
npm run type-check
```

---

*Last updated: January 13, 2025*
*This document should be updated as the design system evolves* 