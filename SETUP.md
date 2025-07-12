# AuthorMagic Setup Guide

## 🚀 Phase 1: Foundation Complete!

Congratulations! The foundation of AuthorMagic has been successfully implemented. Here's what's been built:

### ✅ What's Been Implemented

1. **Next.js 15 + TypeScript** - Modern web framework with strict typing
2. **Tailwind CSS + shadcn/ui** - Professional UI components and styling
3. **Clerk Authentication** - Complete auth flow with sign-in/sign-up
4. **Supabase Integration** - Database client and type-safe queries
5. **Claude AI Integration** - AI-powered content generation
6. **Database Schema** - Complete SQL schema for all features
7. **Landing Page** - Professional marketing page with auth flow
8. **Dashboard** - Basic dashboard with placeholder sections

### 🔧 Required Environment Variables

Create a `.env.local` file in your project root with these variables:

```env
# Clerk Authentication
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=your_clerk_publishable_key
CLERK_SECRET_KEY=your_clerk_secret_key
CLERK_WEBHOOK_SECRET=your_clerk_webhook_secret

# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_key

# Claude AI
ANTHROPIC_API_KEY=your_claude_api_key

# Platform APIs (for later phases)
AMAZON_API_KEY=your_amazon_api_key
KOBO_API_KEY=your_kobo_api_key
APPLE_BOOKS_API_KEY=your_apple_books_api_key
```

## 🗄️ Database Setup

### 1. Create Supabase Project
1. Go to [Supabase](https://supabase.com) and create a new project
2. Copy your Project URL and anon key to your `.env.local` file

### 2. Run Database Migration
Execute the SQL in `supabase/migrations/001_initial_schema.sql` in your Supabase SQL editor:

```sql
-- The complete schema is in the migration file
-- This creates all tables: authors, books, sales_data, marketing_campaigns, etc.
```

### 3. Configure Clerk + Supabase Integration
1. In your Clerk Dashboard, go to JWT Templates
2. Create a new template named "supabase"
3. Use this configuration:
   ```json
   {
     "aud": "authenticated",
     "exp": "{{exp}}",
     "iat": "{{iat}}",
     "iss": "{{iss}}",
     "sub": "{{user.id}}",
     "email": "{{user.primary_email_address.email_address}}",
     "role": "authenticated"
   }
   ```
4. Set signing algorithm to HS256
5. Use your Supabase JWT secret

## 🔐 Authentication Setup

### 1. Clerk Configuration
1. Create a [Clerk](https://clerk.com) account
2. Create a new application
3. Copy the publishable key and secret key to your `.env.local`
4. Configure sign-in/sign-up settings in Clerk Dashboard

### 2. Authentication Flow
- Landing page redirects authenticated users to dashboard
- Sign-in/sign-up pages are fully configured
- Dashboard requires authentication
- User profile integration is ready

## 🤖 AI Integration Setup

### 1. Claude API Key
1. Get your API key from [Anthropic](https://console.anthropic.com)
2. Add it to your `.env.local` file
3. The integration supports:
   - Content generation (social posts, emails, blog posts)
   - Book performance analysis
   - Author website generation
   - Marketing recommendations

## 🏃‍♂️ Running the Project

### 1. Install Dependencies
```bash
npm install
```

### 2. Start Development Server
```bash
npm run dev
```

### 3. Access the Application
- Landing page: `http://localhost:3000`
- Dashboard: `http://localhost:3000/dashboard` (after sign-in)
- Sign-in: `http://localhost:3000/sign-in`
- Sign-up: `http://localhost:3000/sign-up`

## 📁 Project Structure

```
src/
├── app/
│   ├── (auth)/
│   │   ├── sign-in/
│   │   └── sign-up/
│   ├── (dashboard)/
│   │   └── dashboard/
│   ├── api/
│   └── page.tsx (landing page)
├── components/
│   └── ui/ (shadcn/ui components)
├── lib/
│   ├── supabase/
│   ├── claude.ts
│   └── database.types.ts
└── middleware.ts
```

## 🚧 Next Steps - Phase 2

Ready to continue with Phase 2? Here's what's coming:

1. **Sales Analytics Dashboard** - Real-time sales tracking
2. **Multi-platform Integration** - Amazon, Apple Books, Kobo APIs
3. **Advanced Charts** - Performance visualization
4. **Revenue Attribution** - Track marketing ROI
5. **User Profile Management** - Complete author profiles

## 🐛 Troubleshooting

### Common Issues

1. **Authentication Errors**
   - Check Clerk environment variables
   - Verify JWT template configuration
   - Ensure middleware is properly configured

2. **Database Connection Issues**
   - Verify Supabase URL and keys
   - Check if database schema is created
   - Ensure RLS policies are configured

3. **AI Generation Errors**
   - Verify Claude API key
   - Check API usage limits
   - Ensure proper error handling

### Getting Help

If you encounter issues:
1. Check the browser console for errors
2. Verify all environment variables are set
3. Ensure database migrations are complete
4. Check that all services are properly configured

## 🎉 Success!

You now have a fully functional AuthorMagic foundation! The app includes:
- ✅ Professional landing page
- ✅ Complete authentication flow
- ✅ Protected dashboard
- ✅ Database integration
- ✅ AI capabilities
- ✅ Modern UI components

Ready to proceed to Phase 2 and build out the advanced features! 