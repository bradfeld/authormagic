# 🔧 Credential Management System

## Overview

This system prevents environment variable issues like the recent `SUPABASE_SERVICE_KEY` vs `SUPABASE_SERVICE_ROLE_KEY` mismatch that caused runtime errors.

## 🛡️ Protection Features

### 1. **Automatic Validation**
- Runs before every `npm run dev` and `npm run build`
- Validates all required environment variables
- Checks for common naming mistakes
- Validates format patterns (JWT tokens, API keys, etc.)

### 2. **Backup & Restore**
- Automatic timestamped backups
- Safe restore operations with pre-restore backups
- Multiple environment file support (.env.local, .env.production)

### 3. **Error Prevention**
- Catches common mistakes like:
  - `SUPABASE_SERVICE_KEY` → `SUPABASE_SERVICE_ROLE_KEY`
  - `CLERK_PUBLISHABLE_KEY` → `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
  - Missing or malformed API keys

## 📋 Available Commands

### Validation
```bash
npm run env:validate              # Validate current environment
npm run env:validate -- --file .env.production  # Validate specific file
```

### Backup & Restore
```bash
npm run env:backup                # Create backup of all env files
npm run env:list                  # List all available backups
npm run env:restore <backup-name> # Restore from specific backup
```

### Setup & Help
```bash
npm run env:setup                 # Create .env.local from template
npm run env:guide                 # Show help and usage guide
```

## 🔍 Required Environment Variables

| Variable | Description | Pattern |
|----------|-------------|---------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL | `https://[id].supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anonymous key | JWT token |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key | JWT token |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Clerk publishable key | `pk_test_...` or `pk_live_...` |
| `CLERK_SECRET_KEY` | Clerk secret key | `sk_test_...` or `sk_live_...` |
| `ISBNDB_API_KEY` | ISBNDB API key | `[number]_[hex]` |
| `GOOGLE_BOOKS_API_KEY` | Google Books API key | `AIza[string]` |
| `ANTHROPIC_API_KEY` | Anthropic API key | `sk-ant-[string]` |

## 🚨 Common Issues & Solutions

### Issue: "SUPABASE_SERVICE_KEY vs SUPABASE_SERVICE_ROLE_KEY"
**Solution**: The validation system catches this and provides clear error messages.

### Issue: "Missing environment variables"
**Solution**: Run `npm run env:validate` to see exactly which variables are missing.

### Issue: "Malformed API keys"
**Solution**: The system validates patterns and will tell you if a key doesn't match the expected format.

## 🔄 Workflow Integration

### Before Development
```bash
npm run dev  # Automatically validates environment before starting
```

### Before Deployment
```bash
npm run build  # Automatically validates environment before building
```

### After Changes
```bash
npm run env:backup    # Create backup before making changes
# Make your changes
npm run env:validate  # Verify changes are correct
```

## 📦 Backup Strategy

### Automatic Backups
- Created before every restore operation
- Timestamped for easy identification
- Stored in `backups/env/` directory

### Manual Backups
- Run `npm run env:backup` before risky operations
- Before environment file editing
- Before switching between environments

## 🛠️ Development Workflow

1. **Start Development**: `npm run dev` (auto-validates)
2. **Make Changes**: Edit environment files
3. **Validate**: `npm run env:validate`
4. **Backup**: `npm run env:backup` (if needed)
5. **Deploy**: `npm run build` (auto-validates)

## 🔧 Troubleshooting

### Validation Fails
1. Check the specific error message
2. Verify variable names match exactly
3. Check value formats against patterns
4. Use `npm run env:guide` for help

### Need to Restore
1. `npm run env:list` to see available backups
2. `npm run env:restore <backup-name>` to restore
3. `npm run env:validate` to verify restoration

### Starting Fresh
1. `npm run env:setup` to create from template
2. Fill in actual values
3. `npm run env:validate` to verify

## 📈 Benefits

- **Prevents Runtime Errors**: Catches environment issues before they cause crashes
- **Saves Development Time**: No more debugging environment variable problems
- **Secure**: Provides backup/restore without exposing sensitive values
- **Automated**: Integrates seamlessly into development workflow
- **Clear Feedback**: Detailed error messages with suggestions

## 🎯 Future Enhancements

- Git hooks for pre-commit validation
- Encrypted backup storage
- Environment variable rotation helpers
- Integration with CI/CD pipelines 