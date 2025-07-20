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
9. **Book Data Management** - Hierarchical book system with API integration

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

# Book Data APIs
ISBNDB_API_KEY=your_isbndb_api_key
GOOGLE_BOOKS_API_KEY=your_google_books_api_key

# Platform APIs (for later phases)
AMAZON_API_KEY=your_amazon_api_key
KOBO_API_KEY=your_kobo_api_key
APPLE_BOOKS_API_KEY=your_apple_books_api_key
```

## 📚 Book Data System

### 🔧 API Integration Setup

#### ISBNDB API

1. Sign up at [ISBNDB](https://isbndb.com/api)
2. Get your API key from the dashboard
3. Add it to your `.env.local` file

#### Google Books API

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing
3. Enable the **Books API**
4. Create credentials (API key)
5. **IMPORTANT**: Configure API key restrictions properly

### 🚨 **Google Books API Troubleshooting**

**If you get `403 Forbidden` or `API_KEY_HTTP_REFERRER_BLOCKED` errors:**

#### Problem

Your API key has HTTP referrer restrictions that block server-side requests.

#### Solution Options

**Option 1: Remove Restrictions (Recommended for Development)**

1. Go to [Google Cloud Console - Credentials](https://console.cloud.google.com/apis/credentials)
2. Find your API key and click Edit
3. Under "Application restrictions", select **"None"**
4. Click Save

**Option 2: Add Specific Referrers**

1. Go to [Google Cloud Console - Credentials](https://console.cloud.google.com/apis/credentials)
2. Find your API key and click Edit
3. Under "Application restrictions", keep "HTTP referrers (web sites)"
4. Add these referrers:
   - `https://authormagic.com/*`
   - `http://localhost:3000/*`
   - `https://localhost:3000/*`
5. Click Save

**Option 3: Create Separate Keys**

- **Web key**: With referrer restrictions for client-side use
- **Server key**: Without restrictions for server-side use

#### Testing Your Fix

```bash
# Run the API test after making changes
node test-api.js
```

**Expected output after fix:**

```
✅ Google Books API Connection successful
📚 Total items: 1
📖 First book: [Book Title]
```

## 🗄️ Database Setup

### 1. Create Supabase Project

1. Go to [Supabase](https://supabase.com) and create a new project
2. Copy your Project URL and anon key to your `.env.local` file

### 2. Run Database Migrations

Execute both SQL files in your Supabase SQL editor:

1. **Initial Schema**: `supabase/migrations/001_initial_schema.sql`
2. **Book Management**: `supabase/migrations/002_author_management_schema.sql`

### 3. Configure Clerk + Supabase Integration

**✨ Using New First-Class Integration (March 2025):**

#### **Step 1: Configure Supabase Dashboard**

1. Go to your Supabase project at [app.supabase.com](https://app.supabase.com)
2. Navigate to **Auth → Third-Party Auth**
3. Click **"Add integration"** → Select **"Clerk"**
4. Enter your Clerk domain: `certain-herring-4.clerk.accounts.dev`
5. Save the integration

#### **Step 2: Configure Clerk Dashboard**

1. Go to [dashboard.clerk.com](https://dashboard.clerk.com)
2. Navigate to **Integrations** → Find **"Supabase"**
3. Click **"Connect"** and follow the guided setup
4. Enter your Supabase project URL
5. Complete the connection

#### **Benefits of New Integration:**

- ✅ **No JWT template needed** - Supabase natively verifies Clerk tokens
- ✅ **Better security** - No JWT secret sharing required
- ✅ **Improved performance** - Direct token verification
- ✅ **Official support** - First-class integration with full support

---

**⚠️ Legacy JWT Template Method (Deprecated):**

<details>
<summary>Old method (click to expand) - only use if new integration unavailable</summary>

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

**Note:** This method is deprecated as of April 1, 2025 and receives limited support.

</details>

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

### 3. Test API Connections

```bash
# Test both ISBNDB and Google Books APIs
node test-api.js
```

### 4. Access the Application

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

lib/
├── constants/
│   └── api-config.ts
├── services/
│   ├── book-data.service.ts
│   ├── google-books.service.ts
│   └── isbn-db.service.ts
├── types/
│   ├── api.ts
│   └── book.ts
└── utils/
    ├── api-cache.ts
    └── rate-limiter.ts
```

## 🚧 Next Steps - Phase 2

Ready to continue with Phase 2? Here's what's coming:

1. **Book Import Dashboard** - UI for importing book data
2. **Sales Analytics Dashboard** - Real-time sales tracking
3. **Multi-platform Integration** - Amazon, Apple Books, Kobo APIs
4. **Advanced Charts** - Performance visualization
5. **Revenue Attribution** - Track marketing ROI
6. **User Profile Management** - Complete author profiles

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

4. **Book API Issues**
   - **ISBNDB**: Check API key and rate limits
   - **Google Books**: See detailed troubleshooting section above
   - Test with: `node test-api.js`

### Getting Help

If you encounter issues:

1. Check the browser console for errors
2. Verify all environment variables are set
3. Ensure database migrations are complete
4. Check that all services are properly configured
5. Run `node test-api.js` to test API connections

## 🎉 Success!

You now have a fully functional AuthorMagic foundation! The app includes:

- ✅ Professional landing page
- ✅ Complete authentication flow
- ✅ Protected dashboard
- ✅ Database integration
- ✅ AI capabilities
- ✅ Modern UI components
- ✅ Book data management system
- ✅ Dual-API book search (ISBNDB + Google Books)

Ready to proceed to Phase 2 and build out the advanced features!
