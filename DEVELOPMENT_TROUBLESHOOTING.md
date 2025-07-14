# Development Troubleshooting Guide

## Common Development-to-Production Issues

### 1. **Clerk Component Validation Errors**

#### Error: "UserButton can only accept UserButton.UserProfilePage, UserButton.UserProfileLink and UserButton.MenuItems as children"

**Cause**: UserButton with custom MenuItems must be in a client component, not server component.

**Solution**:

- Create a dedicated client component for custom UserButton implementations
- Use `'use client'` directive at the top of the component file
- Import and use the client component in your server components

#### Error: "UserButton.MenuItems can only accept UserButton.Action and UserButton.Link as children"

**Cause**: Incorrect child component type used inside UserButton.MenuItems.

**Solution**:

- Use `UserButton.Link` instead of `UserButton.UserProfileLink`
- Use `UserButton.Action` for custom actions
- Reference Clerk documentation for exact component hierarchy

### 2. **ESLint Production Build Failures**

#### Error: "'variable' is assigned a value but never used"

**Cause**: Development mode is more permissive than production build.

**Solution**:

- Remove unused variable assignments
- Use direct function calls for side effects: `await someFunction()` instead of `const result = await someFunction()`
- Enable stricter ESLint rules in development

#### Prevention:

- Run `npm run validate-production` before commits
- Use pre-commit hooks (configured in this project)
- Enable ESLint auto-fix in your IDE

### 3. **TypeScript Type Mismatches**

#### Error: Type 'string | null' is not assignable to type 'string'

**Cause**: Database fields may be nullable but TypeScript interfaces expect non-null.

**Solution**:

- Use proper null checks and fallbacks: `value || ''` for strings
- Update TypeScript interfaces to match database schema exactly
- Use optional chaining: `user?.email || ''`

#### Error: Property 'propertyName' does not exist on type 'InterfaceName'

**Cause**: Interface property names don't match database field names.

**Solution**:

- Check actual database schema in migration files
- Update TypeScript interfaces to match exact field names
- Use `scripts/validate-schema.js` to verify alignment

### 4. **Database Schema Mismatches**

#### Error: Column 'field_name' does not exist

**Cause**: TypeScript interfaces don't match actual database schema.

**Solution**:

1. Check migration files in `supabase/migrations/`
2. Update TypeScript interfaces to match exact field names
3. Regenerate types: `supabase gen types typescript --local`
4. Run schema validation script

### 5. **Environment Variable Issues**

#### Error: Missing required environment variables

**Cause**: Environment variables not properly configured for deployment.

**Solution**:

- Use `npm run env:validate` to check all required variables
- Ensure all variables are configured in Vercel dashboard
- Use correct variable names (e.g., `SUPABASE_SERVICE_ROLE_KEY` not `SUPABASE_SERVICE_KEY`)

## Development Workflow

### 1. **Pre-commit Validation**

```bash
# Automatically runs on git commit
npm run validate-production
```

### 2. **Manual Testing Before Deployment**

```bash
# Check types
npm run type-check

# Lint code
npm run lint

# Run full production build
npm run build

# Start production server locally
npm run start
```

### 3. **Common Debug Commands**

```bash
# Fix ESLint issues automatically
npm run lint:fix

# Check TypeScript compilation without emitting
npm run type-check

# Validate environment variables
npm run env:validate

# Run complete production validation
npm run validate-production
```

## Best Practices

### 1. **Component Architecture**

- Use Server Components by default
- Only add `'use client'` when absolutely necessary
- Keep client components minimal and focused
- Separate client-specific logic from server logic

### 2. **Type Safety**

- Always define interfaces for external API responses
- Use strict TypeScript configuration
- Validate data at component boundaries
- Use proper null/undefined checks

### 3. **Error Handling**

- Implement proper error boundaries
- Use try/catch for async operations
- Provide meaningful error messages
- Log errors appropriately for debugging

### 4. **Testing Strategy**

- Test locally with production build before deployment
- Use development server for feature development
- Test authentication flows thoroughly
- Validate all form submissions and API calls

## Quick Fixes

### Fix Common TypeScript Errors

```typescript
// ❌ Wrong: nullable field assignment
const email = user.email || null;

// ✅ Correct: string fallback
const email = user.email || '';

// ❌ Wrong: property name mismatch
interface User {
  website: string;
}

// ✅ Correct: match database field name
interface User {
  website_url: string;
}
```

### Fix Clerk Component Issues

```tsx
// ❌ Wrong: server component with custom UserButton
export default function Dashboard() {
  return (
    <UserButton>
      <UserButton.MenuItems>
        <UserButton.UserProfileLink label="Profile" />
      </UserButton.MenuItems>
    </UserButton>
  );
}

// ✅ Correct: client component with proper structure
('use client');

export default function CustomUserButton() {
  return (
    <UserButton>
      <UserButton.MenuItems>
        <UserButton.Link label="Profile" href="/profile" />
      </UserButton.MenuItems>
    </UserButton>
  );
}
```

## When to Run Full Validation

- Before creating pull requests
- After making significant changes
- When encountering deployment issues
- Before merging to main branch
- After resolving merge conflicts

## Getting Help

1. Check this troubleshooting guide first
2. Run `npm run validate-production` to identify issues
3. Check recent git commits for similar issues
4. Review Clerk and Next.js documentation
5. Use the development session documentation in Notion

Remember: Local development (`npm run dev`) is more permissive than production builds. Always validate with production build before deployment!
