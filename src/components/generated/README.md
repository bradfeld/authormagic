# Generated Components Staging Area

This directory is for **v0.dev generated components** before they're finalized and moved to their appropriate locations.

## Workflow

1. **Generate** component at https://v0.dev
2. **Copy** code to this directory as `ComponentName.tsx`
3. **Adapt** imports and styling to match our design system
4. **Test** thoroughly in development environment
5. **Move** to appropriate directory when ready (`book-management/`, `ui/`, etc.)

## Integration Checklist

- [ ] Uses existing shadcn/ui components (`@/components/ui/...`)
- [ ] Follows icon patterns (Lucide React, `h-4 w-4`)
- [ ] Applies design tokens (see `DESIGN_SYSTEM.md`)
- [ ] Includes proper TypeScript interfaces
- [ ] Supports light/dark mode
- [ ] Has hover states and transitions

## Example v0.dev Prompts

```
"Create a modern book statistics card with sales metrics using shadcn/ui components"

"Design an author profile card with avatar, bio, and book count using Card and Badge components"

"Build a search results grid for books with cover images, titles, and author info"
```

Remember: Always specify shadcn/ui + Tailwind CSS in your v0.dev prompts! 