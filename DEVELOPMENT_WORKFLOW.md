# Development Workflow Guide

_Unified workflow for AuthorMagic development_

## 🚀 **Quick Start**

### Essential Commands

```bash
# Clean development server restart
npm run restart

# Production validation (run before commits)
npm run build

# Database query access
npm run query

# Security validation
npm run security:scan
```

### Environment Setup

```bash
# Required .env.local variables
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
CLERK_SECRET_KEY=
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
ANTHROPIC_API_KEY=
ISBNDB_API_KEY=
GOOGLE_BOOKS_API_KEY=
```

## 📋 **Development Protocol**

### Permission & Planning Workflow

1. **Complex Tasks (>3 files, >30 minutes)**:
   - Present detailed implementation plan
   - Wait for plan approval
   - Ask for implementation permission
   - Execute with progress updates

2. **Simple Tasks**:
   - Ask for permission before making changes
   - Wait for explicit confirmation
   - Proceed with implementation

3. **Informational Tasks**: No permission needed
   - Reading files, searching code
   - Running status commands
   - Explaining processes

### Task Management Strategy

- **Strategic Projects**: Create Linear tasks with comprehensive details
- **Tactical Work**: Use local todo_write for immediate tracking
- **Assignment**: Always assign Linear tasks to "bfeld"

## 🛠️ **Technical Workflow**

### 1. Development Environment

```bash
# Start development (always localhost:3000)
npm run restart  # Handles port conflicts automatically

# If manual port clearing needed
lsof -ti:3000 | xargs kill -9
npm run dev
```

### 2. Code Development

- Use feature branches for major changes: `git checkout -b feature/feature-name`
- Server Components by default, Client Components only when needed
- Follow file organization patterns in `/lib`, `/components`, `/app`

### 3. Quality Assurance

```bash
# Before committing
npm run build        # Test TypeScript/ESLint
npm run type-check   # TypeScript validation
npm run lint         # ESLint check
npm run security:scan # Secret detection
```

### 4. Database Operations

```bash
# Interactive database queries
npm run query

# Apply migrations
# Use Supabase dashboard SQL editor for new migrations
```

### 5. Deployment Safety

```bash
# Local production testing
npm run build
npm run start

# Only after user approval and testing
git push origin main  # Triggers Vercel deployment
```

## 🔧 **Component Development Patterns**

### Page Structure

```tsx
import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { DashboardLayout } from '@/components/layout/DashboardLayout';

export default async function PageName() {
  const { userId } = await auth();
  if (!userId) redirect('/sign-in');

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Page Title</h1>
          <p className="text-gray-600">Page description</p>
        </div>
        {/* Page content */}
      </div>
    </DashboardLayout>
  );
}
```

### Admin Page Pattern

```tsx
// Add admin check after auth
const client = await clerkClient();
const user = await client.users.getUser(userId);
const userEmail = user.emailAddresses[0]?.emailAddress;
const isAdmin = userEmail === 'brad@feld.com';

if (!isAdmin) {
  redirect('/dashboard');
}
```

### API Route Pattern

```tsx
import { auth } from '@clerk/nextjs/server';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Implementation
    return NextResponse.json({ data });
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
```

## 🗄️ **Database Patterns**

### Supabase Client Usage

```tsx
// Server-side
import { createClient } from '@/lib/supabase/server';

const supabase = await createClient();
const { data, error } = await supabase
  .from('table_name')
  .select('*')
  .eq('user_id', userId);
```

### RLS Policy Pattern

```sql
CREATE POLICY "Users can access own data" ON table_name
FOR ALL USING (auth.uid()::text = user_id);
```

## 🔐 **Security Checklist**

### Before Committing

- [ ] No hardcoded secrets or API keys
- [ ] Environment variables properly configured
- [ ] RLS policies applied to new tables
- [ ] Admin permissions verified
- [ ] Authentication checks in place

### API Security

- [ ] User authentication validated
- [ ] Input sanitization implemented
- [ ] Proper error handling (no sensitive data exposure)
- [ ] Rate limiting considered for public endpoints

## 📊 **Performance Standards**

### Build Requirements

- TypeScript compilation: ✅ No errors
- ESLint validation: ✅ No errors
- Production build: ✅ Successful
- Server startup: ✅ Under 10 seconds

### Runtime Performance

- Page load: < 2 seconds
- API responses: < 1 second
- Database queries: Optimized with proper indexes

## 🐛 **Troubleshooting Guide**

### Common Issues & Solutions

**Port 3000 in use:**

```bash
npm run restart  # Handles automatically
```

**Build failures:**

```bash
npm run build     # Identify issues
npm run lint:fix  # Auto-fix ESLint
```

**Authentication errors:**

- Check Clerk environment variables
- Verify JWT template configuration
- Ensure middleware is properly configured

**Database connection:**

- Verify Supabase URL and keys
- Check RLS policies
- Validate user permissions

**Google Books API 403 errors:**

- Remove HTTP referrer restrictions in Google Cloud Console
- Or add localhost:3000 and authormagic.com to allowed referrers

## 📈 **Integration Patterns**

### Clerk + Supabase

- Clerk handles authentication
- Supabase stores data with RLS referencing auth.uid()
- Sync user data via webhooks or profile creation

### External APIs

- Implement caching with api-cache.ts utilities
- Use rate limiting to prevent API quota exhaustion
- Handle failures gracefully with fallback strategies

### AI Integration (Claude)

- Use for content generation and analysis
- Implement proper error handling
- Cache responses when appropriate

## 📋 **Pre-deployment Checklist**

### Development Complete

- [ ] Feature works in development environment
- [ ] All tests passing (npm run build)
- [ ] Code reviewed for security issues
- [ ] Documentation updated if needed

### User Testing

- [ ] User has tested functionality in dev environment
- [ ] User has explicitly approved deployment
- [ ] No critical bugs identified

### Production Deployment

- [ ] Environment variables configured in Vercel
- [ ] Database migrations applied if needed
- [ ] Monitoring configured for new features

---

**Remember**: This workflow prioritizes safety, quality, and clear communication. Always get approval before deploying, test thoroughly, and maintain high code standards.

_Last updated: January 2025_
