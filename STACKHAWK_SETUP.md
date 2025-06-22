# StackHawk Security Testing Setup for AuthorMagic

## 🔒 Why StackHawk Testing is Critical Right Now

**URGENT:** Recent Next.js vulnerabilities make security testing essential:
- **CVE-2025-29927**: Critical middleware authorization bypass (CVSS 9.1)
- **CVE-2025-3248**: RCE vulnerabilities in web frameworks
- Your AuthorMagic app just implemented security fixes - validate they're working!

## 📋 Prerequisites

1. **StackHawk Account**: Sign up at [app.stackhawk.com](https://app.stackhawk.com)
2. **Test User Account**: Create a test user in your AuthorMagic app for authenticated scanning
3. **GitHub Secrets**: You'll need to configure API keys and credentials

## 🚀 Quick Setup (5 Minutes)

### Step 1: Create StackHawk Application
1. Log into [StackHawk Platform](https://app.stackhawk.com)
2. Click "Add Application"
3. Name: "AuthorMagic"
4. URL: `https://authormagic-7dok8apkt-bradfelds-projects.vercel.app`
5. Copy the **Application ID** (you'll need this)

### Step 2: Update Configuration
1. Edit `stackhawk.yml` in your project root
2. Replace `REPLACE_WITH_YOUR_STACKHAWK_APP_ID` with your actual Application ID

### Step 3: Configure GitHub Secrets
Go to GitHub → Settings → Secrets and variables → Actions, add:

```
HAWK_API_KEY=hawk.xxxxxxxxxxxxxxxxxxxxx.xxxxxxxxxxxxxxxxxxxxx
SCAN_USERNAME=your-test-user@example.com
SCAN_PASSWORD=your-test-password
```

### Step 4: Create Test User
1. Register a test user in your AuthorMagic app
2. Use credentials that are safe for automated testing
3. **Don't use real personal data** - this is for security testing

## 🎯 What StackHawk Will Test

### ✅ Critical Security Areas
- **API Authentication Bypass** (tests your recent security fixes!)
- **SQL Injection** in user profile endpoints
- **Cross-Site Scripting (XSS)** in form inputs
- **CSRF Protection** on state-changing operations
- **Authorization Flaws** in user data access
- **Next.js Middleware Vulnerabilities** (CVE-2025-29927 protection)

### 🔍 Specific AuthorMagic Tests
- `/api/user/profile` - User data protection
- `/api/waitlist` - Input validation
- Authentication flows - Session management
- Rate limiting - API abuse prevention

## 🏃‍♂️ Running Your First Scan

### Option 1: GitHub Actions (Recommended)
- Push any change to `main` branch
- Check Actions tab for "StackHawk Security Scan"
- Results appear in GitHub Security tab

### Option 2: Manual Scan
```bash
# Install StackHawk CLI
npm install -g @stackhawk/cli

# Run scan locally
hawk scan
```

### Option 3: StackHawk Platform
- Go to your StackHawk dashboard
- Click "Run Scan" on AuthorMagic app
- Monitor progress in real-time

## 📊 Understanding Results

### 🚨 Severity Levels
- **High**: Immediate action required (RCE, Auth Bypass)
- **Medium**: Important fixes (XSS, CSRF)
- **Low**: Best practice improvements

### 📈 Key Metrics to Watch
- **Zero High/Critical**: Your security fixes are working!
- **Authenticated vs Unauthenticated**: Ensure auth is properly enforced
- **API Endpoints**: Special focus on your recent security improvements

## 🛠 Troubleshooting

### Common Issues

**Authentication Failing:**
```yaml
# Update stackhawk.yml with correct login path
authentication:
  usernamePassword:
    loginPath: /api/auth/signin  # Verify this matches your app
```

**Scan Timeout:**
```yaml
# Increase scan duration
hawk:
  scan:
    maxDurationMinutes: 15  # Increase from 10
```

**Missing Vulnerabilities:**
```yaml
# Enable more aggressive scanning
hawk:
  scan:
    failureThreshold: low  # Catch more issues
```

## 🔄 Automation & CI/CD

### Scan Triggers
- **Every Push**: Catch issues immediately
- **Pull Requests**: Prevent vulnerable code from merging
- **Weekly Schedule**: Regular security health checks
- **Manual**: On-demand testing

### Integration Benefits
- **GitHub Security Tab**: Centralized vulnerability tracking
- **PR Comments**: Immediate feedback on security status
- **Artifact Storage**: Historical scan results
- **Fail Fast**: Block deployments with critical vulnerabilities

## 🎯 Next Steps

### 1. Validate Your Security Fixes
Run your first scan to confirm your recent authentication security improvements are working.

### 2. Set Up Monitoring
- Enable email alerts for high-severity findings
- Set up Slack notifications for your team
- Schedule regular scans

### 3. Expand Testing
- Add more authenticated user roles
- Test different user permission levels
- Include API fuzzing for edge cases

## 🚨 Critical Next.js Vulnerability Testing

Your StackHawk configuration specifically tests for:

### CVE-2025-29927 Protection
- **Middleware Bypass Attempts**: Tests `x-middleware-subrequest` header manipulation
- **Authentication Enforcement**: Validates your `withAuthentication` wrapper
- **Route Protection**: Confirms protected routes require proper auth

### Recent Security Improvements
- **Rate Limiting**: Tests your new rate limiting implementation
- **Session Validation**: Validates server-side session checks
- **User Isolation**: Confirms users can only access their own data

## 📞 Support

- **StackHawk Docs**: [docs.stackhawk.com](https://docs.stackhawk.com)
- **Community**: [Discord](https://discord.gg/stackhawk)
- **GitHub Issues**: Report problems with scan configuration

---

## 🎉 Ready to Scan!

Your AuthorMagic app is configured for comprehensive security testing. The recent security fixes you implemented will be thoroughly validated.

**Start your first scan now** and ensure your authentication improvements are bulletproof! 🔒 