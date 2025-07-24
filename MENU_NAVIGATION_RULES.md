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
  <div className="max-w-7xl mx-auto px-4">
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
    <Icon className="h-4 w-4 mr-2" />
    [Action]
  </Button>
</div>
```

### 3. **Sidebar Navigation Standards**

**Navigation items configuration (in `sidebar.tsx`):**

```tsx
const navigationItems: NavigationItem[] = [
  { name: 'Dashboard', href: '/dashboard', icon: Home },
  { name: 'Books', href: '/books', icon: Book },
  { name: 'Profile', href: '/profile', icon: User },
  { name: 'Analytics', href: '/analytics', icon: BarChart3 },
  { name: 'Settings', href: '/settings', icon: Settings },
  // Admin section
  {
    name: 'Admin Dashboard',
    href: '/admin/dashboard',
    icon: Users,
    adminOnly: true,
  },
  { name: 'Waitlist', href: '/admin/waitlist', icon: Users, adminOnly: true },
  {
    name: 'User Management',
    href: '/admin/users',
    icon: Users,
    adminOnly: true,
  },
  {
    name: 'Admin Analytics',
    href: '/admin/analytics',
    icon: BarChart3,
    adminOnly: true,
  },
];
```

**Admin visibility rules:**

- Admin sections ONLY visible to `brad@feld.com`
- Use `adminOnly: true` property for admin navigation items
- Admin check: `userEmail === 'brad@feld.com'`

### 4. **Page Creation Requirements**

**EVERY navigation item MUST have a corresponding page:**

```
/dashboard          → src/app/(dashboard)/dashboard/page.tsx
/books             → src/app/(dashboard)/books/page.tsx
/profile           → src/app/(dashboard)/profile/page.tsx
/analytics         → src/app/(dashboard)/analytics/page.tsx
/settings          → src/app/(dashboard)/settings/page.tsx
/admin/dashboard   → src/app/admin/dashboard/page.tsx
/admin/waitlist    → src/app/admin/waitlist/page.tsx
/admin/users       → src/app/admin/users/page.tsx
/admin/analytics   → src/app/admin/analytics/page.tsx
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
// Check if user is admin (brad@feld.com)
const client = await clerkClient();
const user = await client.users.getUser(userId);
const userEmail = user.emailAddresses[0]?.emailAddress;
const isAdmin = userEmail === 'brad@feld.com';

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
      Admin Area
    </CardTitle>
    <CardDescription className="text-blue-700">
      You have admin access to [feature description].
    </CardDescription>
  </CardHeader>
</Card>;
```

### 6. **Forbidden Navigation Patterns**

**❌ NEVER do these:**

1. **Custom "Back" buttons in headers:**

```tsx
// ❌ WRONG - Don't add back buttons
<Link href="/dashboard">
  <Button variant="outline">Back to App</Button>
</Link>
```

2. **Inconsistent user profile displays:**

```tsx
// ❌ WRONG - Don't add custom user buttons
<CustomUserButton />
```

3. **Direct routing without authentication:**

```tsx
// ❌ WRONG - Always check authentication
export default function Page() {
  // Missing auth check!
}
```

4. **Missing admin permission checks:**

```tsx
// ❌ WRONG - Admin pages without permission check
export default async function AdminPage() {
  // Missing admin check - anyone can access!
}
```

### 7. **Navigation State Management**

**Active state detection (automatic in sidebar):**

```tsx
const isActive =
  pathname === item.href ||
  (item.href !== '/dashboard' && pathname.startsWith(item.href));
```

**Sidebar collapse state:**

- Automatically handled by `DashboardLayout`
- Mobile responsive with overlay
- Desktop collapsible to icon-only mode

### 8. **Error Prevention Rules**

**404 Prevention:**

1. EVERY sidebar navigation item MUST have a working page
2. Create stub pages for unimplemented features
3. Test all navigation paths before committing
4. Use TypeScript for route validation when possible

**Server restart requirements:**

- ALWAYS restart dev server after creating new pages
- Use `npm run restart` for clean cache clearing
- Test navigation thoroughly after major changes

### 9. **Vercel Design Compliance**

**Styling standards:**

- Use consistent `space-y-6` for page sections
- Follow Vercel's color palette (grays 50-950)
- Use proper card layouts for content sections
- Maintain consistent button styling with icons
- Follow Vercel's typography hierarchy

**Icon usage:**

- Lucide React icons ONLY
- Consistent sizing: `h-4 w-4` for buttons, `h-5 w-5` for titles
- Always include meaningful icons for navigation items

### 10. **Testing Checklist**

**Before committing navigation changes:**

- [ ] All sidebar items have working pages (no 404s)
- [ ] Admin sections only visible to brad@feld.com
- [ ] All pages use DashboardLayout consistently
- [ ] No custom "Back" buttons or inconsistent headers
- [ ] Server restart performed and tested
- [ ] Mobile responsiveness verified
- [ ] Coming soon pages are professional and consistent

---

## Quick Reference Commands

```bash
# Test all navigation (no 404s should occur)
npm run restart
# Visit: /dashboard, /books, /profile, /analytics, /settings
# Admin test: /admin/dashboard, /admin/waitlist, /admin/users, /admin/analytics

# Create new navigation page
mkdir -p src/app/(dashboard)/[page-name]
# Copy stub template above
# Add to sidebar navigationItems array
# Test and restart server
```

---

**Remember:** Navigation consistency is critical for professional UX. Every navigation item must work, every admin page must have proper permissions, and every page must use the standard layout. No exceptions!
