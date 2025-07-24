# AuthorMagic.com

A Next.js application for author book management with Clerk authentication and Supabase database.

## Tech Stack

- **Framework**: Next.js 15 (App Router)
- **Authentication**: Clerk
- **Database**: Supabase
- **Styling**: Tailwind CSS
- **Deployment**: Vercel
- **Language**: TypeScript

## Development Setup

### Prerequisites

1. Node.js 18+ installed
2. Git configured
3. Environment variables configured (see [SETUP.md](SETUP.md))

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd authormagic.com

# Install dependencies
npm install

# Set up environment variables
npm run env:setup

# Validate environment
npm run env:validate

# Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the application.

## Development Workflow

### 1. **Enhanced Pre-commit Validation**

This project includes automatic validation to prevent production deployment issues:

```bash
# Automatic validation on git commit
git commit -m "Your commit message"

# Manual validation before deployment
npm run validate-production
```

### 2. **Available Scripts**

```bash
# Development
npm run dev              # Start development server
npm run build           # Build for production
npm run start           # Start production server

# Code Quality
npm run lint            # Run ESLint
npm run lint:fix        # Fix ESLint issues automatically
npm run type-check      # Check TypeScript types
npm run validate-production  # Full production validation

# Environment Management
npm run env:validate    # Validate environment variables
npm run env:backup      # Backup environment variables
npm run env:restore     # Restore environment variables
npm run env:guide       # Show environment help
```

### 3. **Pre-commit Hooks**

Automatically configured to run on every commit:

- **Lint-staged**: Formats and lints staged files
- **Type checking**: Validates TypeScript types
- **ESLint**: Catches potential errors and style issues
- **Production build**: Ensures code builds successfully

### 4. **Stricter Development Environment**

This project uses stricter TypeScript and ESLint configurations to match production requirements:

- **TypeScript**: Strict mode with additional safety checks
- **ESLint**: Production-matching rules to catch issues early
- **Prettier**: Consistent code formatting

## Common Issues & Troubleshooting

### Quick Fixes

```bash
# Fix common linting issues
npm run lint:fix

# Check for type errors
npm run type-check

# Validate environment setup
npm run env:validate

# Run full production validation
npm run validate-production
```

### Detailed Troubleshooting

For comprehensive troubleshooting guidance, see:

- [DEVELOPMENT_TROUBLESHOOTING.md](DEVELOPMENT_TROUBLESHOOTING.md)
- [SETUP.md](SETUP.md)

## Documentation

- **[Setup Guide](SETUP.md)** - Complete environment setup and configuration
- **[Development Troubleshooting](DEVELOPMENT_TROUBLESHOOTING.md)** - Common issues and solutions
- **[Design System](DESIGN_SYSTEM.md)** - UI components and styling guidelines
- **[Menu & Navigation Rules](MENU_NAVIGATION_RULES.md)** - Navigation standards and patterns
- **[Development Session Summary](DEVELOPMENT_SESSION_SUMMARY.md)** - Project progress tracking
- **[Linear Task Template](LINEAR_TASK_TEMPLATE.md)** - Task management templates

## Project Structure

```
src/
├── app/                    # Next.js App Router pages
│   ├── (auth)/            # Authentication pages
│   ├── (dashboard)/       # Dashboard pages
│   └── api/               # API routes
├── components/            # Reusable UI components
├── lib/                   # Utilities and services
│   ├── services/          # Business logic services
│   ├── supabase/         # Database clients
│   └── types/            # TypeScript type definitions
└── middleware.ts          # Next.js middleware
```

## Environment Variables

Required environment variables are documented in [SETUP.md](SETUP.md).

Use the environment management scripts:

```bash
npm run env:guide    # Show all required variables
npm run env:validate # Validate current setup
```

## Deployment

### Production Deployment

1. **Validate locally first**:

   ```bash
   npm run validate-production
   ```

2. **Deploy to Vercel**:

   ```bash
   git push origin main
   ```

3. **Manual deployment**:
   ```bash
   vercel --prod
   ```

### Pre-deployment Checklist

- [ ] All tests pass locally
- [ ] Production build succeeds
- [ ] Environment variables configured in Vercel
- [ ] Database migrations applied
- [ ] Authentication providers configured

## Features

- **User Authentication**: Clerk integration with custom UI
- **Book Management**: Add, edit, and organize books
- **Author Profiles**: Enhanced user profiles with book tracking
- **Search Integration**: Multiple book data sources (ISBN DB, Google Books)
- **Responsive Design**: Mobile-first UI with Tailwind CSS

## API Integration

- **Clerk**: Authentication and user management
- **Supabase**: Database and real-time features
- **ISBN DB**: Book metadata lookup
- **Google Books**: Additional book information
- **AI (Vercel AI SDK)**: Unified provider API for OpenAI, Anthropic, and future models (see `src/lib/services/ai.service.ts`)

## Contributing

1. Create a feature branch
2. Make your changes
3. Run `npm run validate-production` to ensure quality
4. Create a pull request
5. Wait for pre-commit hooks to validate

## Support

- Check [DEVELOPMENT_TROUBLESHOOTING.md](DEVELOPMENT_TROUBLESHOOTING.md) for common issues
- Review recent git commits for similar problems
- Consult Notion development documentation
- Run `npm run env:guide` for environment help

## License

Private repository - All rights reserved.
