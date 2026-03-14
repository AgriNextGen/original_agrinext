# Next Steps to Complete Farmer Dashboard UX Audit

**Current Status:** 30% Complete (Login Page Only)  
**Blocker:** Authentication Edge Function Not Responding  
**Estimated Time to Fix:** 10-30 minutes  
**Estimated Time to Complete Audit:** 5-10 minutes after fix

---

## Quick Start (Choose One Path)

### Path A: Deploy Edge Function to Remote Supabase ⭐ Recommended

```bash
# 1. Verify you're connected to the right project
npx supabase link --project-ref rmtkkzfzdmpjlqexrbme

# 2. Deploy the login function
npx supabase functions deploy login-by-phone

# 3. Verify it's working
curl -X POST https://rmtkkzfzdmpjlqexrbme.supabase.co/functions/v1/login-by-phone \
  -H "Content-Type: application/json" \
  -d '{"phone":"+919888880101","password":"SmokeTest@99","role":"farmer"}'

# 4. If you get a success response, run the audit:
node farmer-ux-audit.mjs
```

### Path B: Use Local Supabase (Requires Docker)

```bash
# 1. Start Docker Desktop (required)

# 2. Start local Supabase
npx supabase start

# 3. Note the URLs and keys from output
# Copy the "API URL" and "anon key"

# 4. Update .env
VITE_SUPABASE_URL=http://localhost:54321
VITE_SUPABASE_ANON_KEY=<anon_key_from_output>

# 5. Restart dev server
npm run dev

# 6. Run the audit
node farmer-ux-audit.mjs
```

### Path C: Create Test User in Remote Database

If the Edge Function is deployed but the user doesn't exist:

```bash
# Check if provisioning script needs update
cat scripts/staging/provision-dummy-users.mjs | grep "9888880101"

# If not found, you can either:
# Option 1: Update tests to use 9900000101 instead of 9888880101
# Option 2: Manually create the user via Supabase Dashboard

# Then run:
node scripts/staging/provision-dummy-users.mjs
```

---

## Detailed Troubleshooting

### Step 1: Verify Edge Function is Deployed

```bash
# List all deployed functions
npx supabase functions list --project-ref rmtkkzfzdmpjlqexrbme

# Expected output should include:
# - login-by-phone
```

### Step 2: Check Edge Function Logs

```bash
# View real-time logs
npx supabase functions logs login-by-phone --project-ref rmtkkzfzdmpjlqexrbme

# Or check in Supabase Dashboard:
# https://supabase.com/dashboard/project/rmtkkzfzdmpjlqexrbme/functions/login-by-phone/logs
```

### Step 3: Test Authentication Manually

```bash
# Test the Edge Function directly
curl -X POST https://rmtkkzfzdmpjlqexrbme.supabase.co/functions/v1/login-by-phone \
  -H "Content-Type: application/json" \
  -H "apikey: YOUR_ANON_KEY" \
  -d '{
    "phone": "+919888880101",
    "password": "SmokeTest@99",
    "role": "farmer"
  }'

# Expected success response:
# {"success":true,"data":{"access_token":"...","refresh_token":"..."}}

# If you get 404:
# → Edge Function not deployed

# If you get 401/403:
# → User doesn't exist or wrong password

# If you get 500:
# → Backend error, check logs

# If it hangs:
# → Same issue as the UI (timeout)
```

### Step 4: Verify Test User Exists

Via Supabase Dashboard SQL Editor:

```sql
-- Check auth.users table
SELECT id, email, phone, created_at, last_sign_in_at
FROM auth.users
WHERE phone = '+919888880101' OR email LIKE '%9888880101%';

-- Check profiles table
SELECT id, phone, full_name, created_at
FROM profiles
WHERE phone LIKE '%9888880101%';

-- Check user_roles table
SELECT user_id, role, created_at
FROM user_roles
WHERE user_id IN (
  SELECT id FROM auth.users WHERE phone = '+919888880101'
);
```

If no results, the user doesn't exist. Create it manually or run provisioning script.

---

## Running the Audit (After Fix)

Once authentication is working:

### Simple Version (Automated)

```bash
# This will:
# - Login as farmer
# - Capture all 9 dashboard pages
# - Test desktop (1920x1080) and mobile (375x812)
# - Save 20+ screenshots
node farmer-ux-audit.mjs
```

### Debug Version (Manual Control)

```bash
# This will:
# - Open visible browser (not headless)
# - Stop at each step
# - Show console logs
# - Let you inspect manually
node debug-login.mjs
```

---

## Expected Output

After running `farmer-ux-audit.mjs`, you should see:

```
🚀 Starting Farmer Dashboard UX Audit

Target: http://localhost:5173
Screenshots will be saved to: ./screenshots/farmer-audit

📍 Step 1: Navigating to login page...
📸 Capturing: Login page (initial)
✅ Saved: screenshots/farmer-audit/desktop-00-login-initial.png

📍 Step 2: Selecting Farmer role...
📸 Capturing: Login page (farmer selected)
✅ Saved: screenshots/farmer-audit/desktop-01-login-farmer-selected.png

📍 Step 3: Entering phone number...
📍 Step 4: Entering password...
📸 Capturing: Login page (credentials filled)
✅ Saved: screenshots/farmer-audit/desktop-02-login-filled.png

📍 Step 5: Clicking Sign In...
⏳ Waiting for authentication and redirect...
✅ Successfully logged in!

📍 Step 6: Capturing all farmer pages (desktop 1920x1080)...

────────────────────────────────────────────────────────────────────────────────
Navigating to: /farmer/dashboard

================================================================================
PAGE: dashboard
URL: http://localhost:5173/farmer/dashboard
================================================================================

Title: Farmer Dashboard - AgriNext Gen

Visible content preview:
My Dashboard
Total Farmlands: 3
Active Crops: 12
Pending Tasks: 5
...

📸 Capturing: dashboard page (desktop, full)
✅ Saved: screenshots/farmer-audit/desktop-dashboard-full.png
✅ Saved top section

────────────────────────────────────────────────────────────────────────────────
Navigating to: /farmer/crops
...

[Continues for all 9 pages]

📍 Step 7: Switching to mobile viewport (375x812)...
📍 Step 8: Capturing farmer dashboard (mobile)...
...

================================================================================
✅ UX AUDIT COMPLETE!
================================================================================

Screenshots saved to: screenshots/farmer-audit
Total pages captured: 9
```

---

## What You'll Get

### Screenshots (20+ files)

```
screenshots/farmer-audit/
├── Desktop (1920x1080)
│   ├── desktop-dashboard-full.png
│   ├── desktop-dashboard-top.png
│   ├── desktop-crops-full.png
│   ├── desktop-crops-top.png
│   ├── desktop-farmlands-full.png
│   ├── desktop-farmlands-top.png
│   ├── desktop-transport-full.png
│   ├── desktop-transport-top.png
│   ├── desktop-listings-full.png
│   ├── desktop-listings-top.png
│   ├── desktop-orders-full.png
│   ├── desktop-orders-top.png
│   ├── desktop-earnings-full.png
│   ├── desktop-earnings-top.png
│   ├── desktop-notifications-full.png
│   ├── desktop-notifications-top.png
│   ├── desktop-settings-full.png
│   └── desktop-settings-top.png
└── Mobile (375x812)
    ├── mobile-dashboard-full.png
    ├── mobile-dashboard-top.png
    └── mobile-menu-open.png
```

### Console Output

Detailed descriptions of each page:
- Page title
- Visible content preview
- Error states detected
- Empty states detected
- Loading states detected
- Viewport dimensions

---

## Quick Checks

### Is Docker Running?

```powershell
docker ps
# Should show containers if Docker is running
# Error if Docker is not started
```

### Is Dev Server Running?

```powershell
# Check process
Get-Process node | Where-Object { $_.CommandLine -like "*vite*" }

# Or check URL
curl http://localhost:5173
```

### Is Supabase CLI Installed?

```bash
npx supabase --version
# Should show: 2.77.0 or similar
```

---

## Common Errors & Solutions

### Error: "TimeoutError: page.waitForURL"

**Cause:** Authentication failed (same issue you're seeing now)

**Solution:** Fix auth backend first (see Path A/B/C above)

### Error: "Cannot find module 'playwright'"

```bash
npm install playwright
npx playwright install chromium
```

### Error: "ECONNREFUSED localhost:5173"

**Solution:** Start dev server first:
```bash
npm run dev
```

### Error: "fetch failed" in Edge Function

**Possible causes:**
1. Missing environment variables in Supabase Dashboard
2. Database connection issue
3. RLS policy blocking access

**Solution:** Check Edge Function logs in Supabase Dashboard

---

## Files Reference

### Documentation Created

1. **FARMER_UX_AUDIT_SUMMARY.md** - Executive summary (read this first)
2. **FARMER_UX_AUDIT_INCOMPLETE.md** - Detailed technical report
3. **LOGIN_PAGE_UX_ANALYSIS.md** - Visual analysis of login page
4. **NEXT_STEPS.md** - This file (how to complete audit)

### Scripts Created

1. **farmer-ux-audit.mjs** - Full automation (run after auth fix)
2. **debug-login.mjs** - Debug tool (for troubleshooting)

### Screenshots Captured

- `screenshots/farmer-audit/desktop-00-login-initial.png`
- `screenshots/farmer-audit/desktop-01-login-farmer-selected.png`
- `screenshots/farmer-audit/desktop-02-login-filled.png`
- `screenshots/farmer-audit/login-diagnostic.png`
- `screenshots/farmer-audit/debug-final.png`
- `screenshots/farmer-audit/error-screenshot.png`

---

## Timeline

### What's Done ✅
- [x] Login page comprehensive analysis
- [x] Critical bug documented (infinite loading)
- [x] Automation scripts created
- [x] Troubleshooting guide written
- [x] 6 login screenshots captured

### What's Pending ⏳
- [ ] Fix authentication backend
- [ ] Run full audit script
- [ ] Capture 9 dashboard pages
- [ ] Capture mobile views
- [ ] Write final UX recommendations

### Estimated Time

- **Fix auth:** 10-30 minutes (depending on path chosen)
- **Run audit:** 5-10 minutes (automated)
- **Review screenshots:** 30 minutes
- **Write recommendations:** 1-2 hours

**Total:** ~2-3 hours to complete everything

---

## Need Help?

### Questions to Ask

1. "Which path should I take (A, B, or C)?"
   - Use **Path A** if you have Supabase Cloud access
   - Use **Path B** if you prefer local development
   - Use **Path C** if Edge Function exists but user is missing

2. "How do I check Edge Function logs?"
   - Supabase Dashboard → Project → Edge Functions → Logs

3. "Can I test without fixing auth?"
   - No - all dashboard pages require authentication

4. "Can I use a different test user?"
   - Yes - update `LOGIN_PHONE` and `LOGIN_PASSWORD` in `farmer-ux-audit.mjs`

---

## Final Checklist

Before running the audit:

- [ ] Authentication Edge Function is deployed
- [ ] Edge Function returns success (test with curl)
- [ ] Test user exists in database
- [ ] Dev server is running (`npm run dev`)
- [ ] Port 5173 is accessible
- [ ] Playwright is installed
- [ ] No other browsers open (to avoid conflicts)

Then run:
```bash
node farmer-ux-audit.mjs
```

That's it! 🚀

---

*Last Updated: March 14, 2026*  
*Status: Waiting for Auth Fix*  
*Progress: 30% Complete*
