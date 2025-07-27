# Menu & Navigation Rules for AuthorMagic

## Core Navigation Principles

### 1. **MANDATORY Layout Usage**

**ALWAYS use `DashboardLayout` for authenticated pages:**

```tsx
// ✅ CORRECT - All authenticated pages
import { DashboardLayout } from '@/components/layout/DashboardLayout';

export default function SomePage() {
  return (
    <DashboardLayout>
      <div className="space-y-6">{/* Page content */}</div>
    </DashboardLayout>
  );
}
```

**NEVER create custom layouts for individual pages:**

```tsx
// ❌ WRONG - Don't create custom page layouts
<div className="min-h-screen bg-gray-50">
  <div className="mx-auto max-w-7xl px-4">
    {/* Custom layout - DON'T DO THIS */}
  </div>
</div>
```

### 2. **Consistent Page Structure**

**Standard page header pattern:**

```tsx
{
  /* Page Header - ALWAYS start with this */
}
<div>
  <h1 className="text-2xl font-bold text-gray-900">[Page Title]</h1>
  <p className="text-gray-600">[Page description/subtitle]</p>
</div>;
```

**With action buttons (when needed):**

```tsx
<div className="flex items-center justify-between">
  <div>
    <h1 className="text-2xl font-bold text-gray-900">[Page Title]</h1>
    <p className="text-gray-600">[Description]</p>
  </div>
  <Button>
    <Icon className="mr-2 h-4 w-4" />
    [Action]
  </Button>
</div>
```

### 3. **Hierarchical Navigation Standards**

**NEW: Two-tier navigation structure (User → Admin):**

```tsx
const navigationItems: NavigationItem[] = [
  // Regular user navigation
  { name: 'Dashboard', href: '/dashboard', icon: Home },
  { name: 'Books', href: '/books', icon: Book },
  { name: 'Analytics', href: '/analytics', icon: BarChart3 },
  { name: 'Profile', href: '/profile', icon: User },
  { name: 'Settings', href: '/settings', icon: Settings },

  // Admin parent with nested children
  {
    name: 'Admin',
    icon: Shield,
    adminOnly: true,
    children: [
      {
        name: 'Dashboard',
        href: '/admin/dashboard',
        icon: Home,
        adminOnly: true,
      },
      {
        name: 'User Management',
        href: '/admin/users',
        icon: Users,
        adminOnly: true,
      },
      {
        name: 'Analytics',
        href: '/admin/analytics',
        icon: BarChart3,
        adminOnly: true,
      },
      {
        name: 'System Health',
        href: '/admin/system',
        icon: Activity,
        adminOnly: true,
      },
    ],
  },
];
```

**Navigation interface requirements:**

```tsx
interface NavigationItem {
  name: string;
  href?: string; // Optional for parent items
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
  adminOnly?: boolean;
  children?: NavigationItem[]; // For nested navigation
}
```

**Visual hierarchy features:**

- **Expandable Admin Menu**: Click to expand/collapse admin items
- **Auto-expansion**: Admin menu automatically opens when on admin pages
- **Visual Indicators**: Shield icons for admin areas, chevron for expand/collapse
- **Indented Children**: Clear visual nesting with border lines
- **Active State Propagation**: Parent items show active when children are active

### 4. **Page Creation Requirements**

**EVERY navigation item MUST have a corresponding page:**

```
/dashboard          → src/app/(dashboard)/dashboard/page.tsx
/books             → src/app/(dashboard)/books/page.tsx
/profile           → src/app/(dashboard)/profile/page.tsx
/analytics         → src/app/(dashboard)/analytics/page.tsx
/settings          → src/app/(dashboard)/settings/page.tsx

// Admin pages (nested under Admin menu)
/admin/dashboard   → src/app/admin/dashboard/page.tsx
/admin/users       → src/app/admin/users/page.tsx
/admin/analytics   → src/app/admin/analytics/page.tsx
/admin/system      → src/app/admin/system/page.tsx
```

**Stub page template for coming soon features:**

```tsx
import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { [RelevantIcon] } from 'lucide-react';

export default async function [PageName]Page() {
  const { userId } = await auth();
  if (!userId) redirect('/sign-in');

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">[Page Title]</h1>
            <p className="text-gray-600">[Description]</p>
          </div>
          <Button>
            <[Icon] className="h-4 w-4 mr-2" />
            [Action]
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <[Icon] className="h-5 w-5" />
              [Feature Name]
            </CardTitle>
            <CardDescription>[Feature description]</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8">
              <div className="mx-auto w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                <[Icon] className="h-8 w-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                [Feature] Coming Soon
              </h3>
              <p className="text-gray-600 mb-4">
                [Coming soon description]
              </p>
              <Button variant="outline">
                <[Icon] className="h-4 w-4 mr-2" />
                [Placeholder Action]
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
```

### 5. **Admin Page Requirements**

**Admin permission check (REQUIRED for all admin pages):**

```tsx
// Use the role-based admin checking system
const waitlistService = new WaitlistService();
const isAdmin = await waitlistService.isUserAdmin(userId);

if (!isAdmin) {
  redirect('/dashboard');
}
```

**Admin page header pattern:**

```tsx
{
  /* Admin Notice */
}
<Card className="border-blue-200 bg-blue-50">
  <CardHeader>
    <CardTitle className="flex items-center gap-2 text-blue-900">
      <Shield className="h-5 w-5" />
      Admin Area - [Feature Name]
    </CardTitle>
    <CardDescription className="text-blue-700">
      You have admin access to [feature description].
    </CardDescription>
  </CardHeader>
</Card>;
```

### 6. **Navigation State Management**

**Hierarchical active state detection:**

```tsx
const isActiveItem = (item: NavigationItem): boolean => {
  if (item.href) {
    return (
      pathname === item.href ||
      (item.href !== '/dashboard' && pathname.startsWith(item.href))
    );
  }
  // For parent items without href, check if any children are active
  if (item.children) {
    return item.children.some(
      child =>
        child.href &&
        (pathname === child.href ||
          (child.href !== '/dashboard' && pathname.startsWith(child.href))),
    );
  }
  return false;
};
```

**Admin menu expansion logic:**

- **Auto-expand**: Admin menu opens when navigating to any admin page
- **Manual toggle**: Click the Admin parent item to expand/collapse
- **Persistent state**: Expansion state maintained during navigation
- **Collapsed sidebar**: No expansion when sidebar is collapsed

**Admin role checking:**

- **Primary method**: API call to `/api/admin/users?limit=1`
- **Fallback method**: Email check for `brad@feld.com`
- **Loading states**: Shows animated placeholders while checking admin status
- **Error handling**: Graceful fallback if API is unavailable

### 7. **Forbidden Navigation Patterns**

**❌ NEVER do these:**

1. **Flat admin navigation mixed with user items:**

```tsx
// ❌ WRONG - Don't mix admin and user items at same level
const navigationItems = [
  { name: 'Dashboard', href: '/dashboard' },
  { name: 'Admin Dashboard', href: '/admin/dashboard', adminOnly: true },
  { name: 'Books', href: '/books' },
  { name: 'User Management', href: '/admin/users', adminOnly: true },
];
```

2. **Custom "Back" buttons in headers:**

```tsx
// ❌ WRONG - Don't add back buttons
<Link href="/dashboard">
  <Button variant="outline">Back to App</Button>
</Link>
```

3. **Multiple admin parent sections:**

```tsx
// ❌ WRONG - Don't create multiple admin sections
{ name: 'Admin Users', children: [...] },
{ name: 'Admin System', children: [...] },
```

4. **Missing admin permission checks:**

```tsx
// ❌ WRONG - Admin pages without proper role checking
export default async function AdminPage() {
  // Missing admin role check - anyone can access!
}
```

### 8. **Modern Design Benefits**

**✅ Why hierarchical navigation is better:**

1. **Clean Organization**: Clear separation between user and admin functions
2. **Scalability**: Easy to add more admin features without overwhelming navigation
3. **Industry Standard**: Follows patterns used by Vercel, Linear, GitHub, Notion
4. **Better UX**: Users expect grouped navigation in modern applications
5. **Visual Clarity**: Reduces cognitive load with logical grouping
6. **Mobile Friendly**: Hierarchical structure works better on smaller screens

### 9. **Testing Checklist**

**Before committing navigation changes:**

- [ ] All navigation items have working pages (no 404s)
- [ ] Admin section only visible to authenticated admins
- [ ] Admin menu expands/collapses properly
- [ ] Auto-expansion works when visiting admin pages
- [ ] All pages use DashboardLayout consistently
- [ ] Active states work for both parent and child items
- [ ] Mobile responsiveness verified
- [ ] Sidebar collapse/expand works with nested items

**Navigation flow testing:**

1. **Non-admin user**: Should see only user navigation items
2. **Admin user**: Should see Admin section with expandable sub-items
3. **Admin page visit**: Admin menu should auto-expand
4. **Sidebar collapse**: Admin items should hide when sidebar is collapsed
5. **Active states**: Should highlight both active child and parent items

---

## Quick Reference Commands

```bash
# Test all navigation (no 404s should occur)
npm run restart
# Visit: /dashboard, /books, /profile, /analytics, /settings
# Admin test: Click "Admin" to expand, then test all sub-items

# Create new admin navigation page
mkdir -p src/app/admin/[page-name]
# Copy admin page template above
# Add to admin children array in sidebar navigationItems
# Test expansion and active states
```

---

**Current Clean Navigation Structure:**

```
📁 User Navigation
├── 🏠 Dashboard
├── 📚 Books
├── 📊 Analytics
├── 👤 Profile
└── ⚙️ Settings

📁 Admin Navigation (Hierarchical)
└── 🛡️ Admin ▼
    ├── 🏠 Dashboard
    ├── 👥 User Management
    ├── 📈 Analytics
    └── 🖥️ System Health
```

**Remember:** The hierarchical navigation provides better organization, follows modern design patterns, and scales beautifully as the admin feature set grows. Every admin function is grouped under the Admin parent, creating a clear separation of concerns and improved user experience.
