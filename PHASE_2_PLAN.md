# 📋 PHASE 2 PLAN: Error Handling & Input Validation

## 🎯 **MISSION: Harden API Security & Improve User Experience**

**Priority:** HIGH - Fix critical middleware error and standardize error handling  
**Estimated Duration:** 1-2 hours  
**Origin:** Phase 2 of AUT-105 security improvements

---

## 🚨 **CRITICAL FIXES (IMMEDIATE)**

### **Issue 1: Middleware Authentication Error - URGENT**

**Problem:** `auth.protect()` causing `NEXT_HTTP_ERROR_FALLBACK;404` errors
**Impact:** Application middleware is failing on every request
**Root Cause:** Incorrect Clerk middleware implementation pattern

**Solution:**

```typescript
// ❌ CURRENT (BROKEN):
auth.protect();

// ✅ FIXED VERSION:
if (
  req.nextUrl.pathname.startsWith('/dashboard') ||
  req.nextUrl.pathname.startsWith('/profile')
) {
  auth.protect();
}
```

---

## 🔧 **PHASE 2 TASKS BREAKDOWN**

### **Task 1: Fix Critical Middleware Error** ⏱️ 15 mins

- [ ] Fix `auth.protect()` conditional logic
- [ ] Test authentication flows work correctly
- [ ] Verify no 404 errors in middleware

### **Task 2: Standardize API Error Responses** ⏱️ 30 mins

- [ ] Create unified error response schema with Zod
- [ ] Implement standardized HTTP status codes
- [ ] Add error logging and tracking
- [ ] Create error response utility functions

### **Task 3: Implement Input Validation** ⏱️ 45 mins

- [ ] Add Zod validation schemas for all API endpoints
- [ ] Validate request bodies, query params, and path params
- [ ] Add sanitization for user inputs
- [ ] Create validation middleware

### **Task 4: Enhance Error Boundaries** ⏱️ 20 mins

- [ ] Add React error boundaries for graceful UI failures
- [ ] Implement API error recovery patterns
- [ ] Add user-friendly error messages
- [ ] Create fallback UI components

### **Task 5: Security Headers & CORS** ⏱️ 15 mins

- [ ] Add security headers to API responses
- [ ] Configure proper CORS policies
- [ ] Implement request origin validation
- [ ] Add basic rate limiting headers

---

## 🛠️ **TECHNICAL IMPLEMENTATION**

### **1. Error Response Schema**

```typescript
// Standardized API error response
interface ApiErrorResponse {
  success: false;
  error: {
    code: string; // "VALIDATION_ERROR", "AUTH_ERROR", etc.
    message: string; // User-friendly message
    details?: string; // Technical details
    field?: string; // Field that caused validation error
    timestamp: string; // ISO timestamp
    requestId: string; // Unique request identifier
  };
}

interface ApiSuccessResponse<T> {
  success: true;
  data: T;
  message?: string;
  timestamp: string;
  requestId: string;
}
```

### **2. Input Validation Schemas**

```typescript
// Zod schemas for API validation
const BookCreateSchema = z.object({
  book: z.object({
    title: z.string().min(1).max(500),
    authors: z.array(z.string()).min(1),
    isbn: z.string().optional(),
  }),
  allEditionData: z.array(z.object({...})).optional(),
});

const ProfileUpdateSchema = z.object({
  displayName: z.string().min(1).max(100).optional(),
  bio: z.string().max(1000).optional(),
  website: z.string().url().optional(),
  twitter: z.string().regex(/^[A-Za-z0-9_]{1,15}$/).optional(),
});
```

### **3. Enhanced Middleware**

```typescript
export default clerkMiddleware((auth, req) => {
  // Skip API routes - they handle their own auth
  if (req.nextUrl.pathname.startsWith('/api/')) {
    return;
  }

  // Skip public pages
  if (
    req.nextUrl.pathname === '/' ||
    req.nextUrl.pathname.startsWith('/sign-')
  ) {
    return;
  }

  // Only protect authenticated pages
  if (
    req.nextUrl.pathname.startsWith('/dashboard') ||
    req.nextUrl.pathname.startsWith('/profile')
  ) {
    try {
      auth.protect();
    } catch (error) {
      // Graceful error handling - redirect to sign-in
      return NextResponse.redirect(new URL('/sign-in', req.url));
    }
  }
});
```

### **4. API Error Handling Utility**

```typescript
export class ApiErrorHandler {
  static createErrorResponse(
    error: unknown,
    statusCode: number = 500,
    requestId: string = crypto.randomUUID(),
  ): NextResponse {
    const errorResponse: ApiErrorResponse = {
      success: false,
      error: {
        code: this.mapErrorCode(error, statusCode),
        message: this.getUserFriendlyMessage(error),
        details: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
        requestId,
      },
    };

    return NextResponse.json(errorResponse, { status: statusCode });
  }
}
```

---

## 🧪 **TESTING STRATEGY**

### **Validation Testing:**

- [ ] Test all API endpoints with invalid inputs
- [ ] Verify proper error codes and messages
- [ ] Test authentication flows work correctly
- [ ] Verify middleware no longer throws 404 errors

### **Error Recovery Testing:**

- [ ] Test network failure scenarios
- [ ] Verify graceful degradation works
- [ ] Test error boundaries catch UI failures
- [ ] Verify user-friendly error messages display

### **Security Testing:**

- [ ] Test input sanitization prevents XSS
- [ ] Verify CORS policies block unauthorized origins
- [ ] Test rate limiting works correctly
- [ ] Verify security headers are present

---

## 📊 **SUCCESS METRICS**

| Metric                        | Before        | Target After         |
| ----------------------------- | ------------- | -------------------- |
| **Middleware Errors**         | Multiple 404s | 0 errors             |
| **API Error Consistency**     | Mixed formats | 100% standardized    |
| **Input Validation Coverage** | 0%            | 100% of endpoints    |
| **Error Recovery**            | Hard failures | Graceful degradation |
| **Security Headers**          | Missing       | Fully implemented    |

---

## 🚀 **IMPLEMENTATION ORDER**

1. **🚨 CRITICAL FIRST:** Fix middleware `auth.protect()` error
2. **🔧 FOUNDATION:** Create error response utilities and schemas
3. **🔒 VALIDATION:** Add Zod validation to all API endpoints
4. **🛡️ BOUNDARIES:** Implement error boundaries and recovery
5. **🔐 SECURITY:** Add security headers and CORS policies

---

## 🎯 **DELIVERABLES**

- [ ] **Fixed middleware** - No more 404 authentication errors
- [ ] **Standardized API errors** - Consistent error responses
- [ ] **Input validation** - Zod schemas for all endpoints
- [ ] **Error boundaries** - Graceful UI failure handling
- [ ] **Security headers** - CORS and security policies
- [ ] **Comprehensive testing** - Verification suite for all fixes

---

**Ready to proceed with implementation? This will resolve the middleware error and significantly improve application reliability and security.**
