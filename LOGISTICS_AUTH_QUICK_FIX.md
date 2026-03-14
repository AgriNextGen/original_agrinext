# QUICK START: Fix Logistics Auth & Re-capture

**Problem:** Logistics user cannot log in → Cannot capture dashboard screenshots  
**Priority:** P0 Blocking  
**Time to fix:** 15-30 minutes (estimated)

---

## 🚀 Quick Fix Steps (3-Step Process)

### Step 1: Verify User Exists (2 minutes)

Open Supabase SQL Editor and run:

```sql
-- Check if logistics user exists
SELECT 
  p.id,
  p.phone,
  p.full_name,
  p.role,
  ur.role as user_role_table
FROM profiles p
LEFT JOIN user_roles ur ON ur.user_id = p.id
WHERE p.phone = '9900000103';
```

**Expected Result:** 1 row showing user with `role = 'logistics'`

**If no results found:**
```sql
-- Create the user
INSERT INTO profiles (phone, full_name, role)
VALUES ('9900000103', 'Test Logistics User', 'logistics')
RETURNING id;

-- Add role
INSERT INTO user_roles (user_id, role)
VALUES (
  (SELECT id FROM profiles WHERE phone = '9900000103'),
  'logistics'
);
```

---

### Step 2: Test Login Manually (5 minutes)

#### Option A: Browser Test
1. Open http://localhost:5173/login
2. Open DevTools (F12) → Console tab
3. Select "Logistics" role
4. Enter phone: `9900000103`
5. Enter password: `Dummy@12345`
6. Click "Sign In"
7. **Watch console for errors**
8. **Check Network tab for `/login-by-phone` request**

#### Option B: Edge Function Test
```bash
# In terminal, test Edge Function directly
curl -X POST http://localhost:54321/functions/v1/login-by-phone \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -d '{
    "phone": "9900000103",
    "password": "Dummy@12345",
    "role": "logistics"
  }'
```

**Expected:** `{"success": true, "data": {...session...}}`  
**If error:** Note the error code and message

---

### Step 3: Common Fixes (5-10 minutes each)

#### Fix A: User Doesn't Exist
→ Already handled in Step 1 (create user)

#### Fix B: Edge Function Not Deployed
```bash
# Deploy login function
supabase functions deploy login-by-phone

# Verify it's running
supabase functions list
```

#### Fix C: Wrong Password Format
```sql
-- Check if password is hashed in auth.users
SELECT id, email, encrypted_password
FROM auth.users
WHERE email = '919900000103@agrinext.local';

-- If user doesn't exist in auth.users, signup didn't complete
-- Need to run signup-by-phone first
```

#### Fix D: Rate Limited
```sql
-- Clear rate limits
DELETE FROM rate_limits WHERE identifier = '9900000103';
```

#### Fix E: Frontend Error Handling Missing
Check `src/pages/Auth/Login.tsx` and ensure error handling:
```tsx
const { mutate: login, isLoading, error } = useMutation({
  onError: (error) => {
    toast.error(error.message || 'Login failed');
    console.error('Login error:', error);
  }
});
```

---

## ✅ Verify Fix Works (3 minutes)

1. Open http://localhost:5173/login in **private/incognito window**
2. Select "Logistics"
3. Enter `9900000103` / `Dummy@12345`
4. Click "Sign In"
5. **Should redirect to** `/logistics/dashboard`
6. **Should see dashboard content** (not login page)
7. Navigate to `/logistics/loads` → should work
8. Navigate to `/logistics/trips` → should work

**If this works, proceed to Step 4.**

---

## 🎬 Step 4: Re-run Screenshot Capture (10 minutes)

```bash
# In project root
cd "c:\Users\shiva basavesh a s\Downloads\GitHub\og_agri2_with github_clone\original_agrinext"

# Run the capture script
node capture-logistics-audit.mjs
```

**Expected Output:**
```
🚀 Starting logistics dashboard screenshot capture...

📍 Step 1: Login Page
  ✓ Screenshot 01-login-desktop.png
  ✓ Screenshot 02-login-logistics-selected.png
  ✓ Screenshot 03-login-filled.png
  ✓ Screenshot 04-after-login.png

📍 Step 2: Dashboard Desktop
  ✓ Screenshot 05-dashboard-desktop.png (SHOULD SHOW DASHBOARD NOW)
  ✓ Screenshot 06-dashboard-scrolled.png

... (all steps complete)

✅ All screenshots captured successfully!
```

**Check Results:**
```bash
# List captured screenshots
ls logistics-screenshots/

# Verify they show dashboard content (not login page)
# Open a few screenshots to spot-check
```

---

## 🆘 If Still Not Working

### Check Console Logs
1. Open browser DevTools (F12)
2. Console tab
3. Look for red errors
4. Copy error messages

### Check Network Tab
1. Network tab in DevTools
2. Filter: "Fetch/XHR"
3. Click "Sign In"
4. Find `login-by-phone` request
5. Check Status Code:
   - 200 = Success (but check response body)
   - 400 = Bad request (check request body)
   - 404 = Function not found (redeploy)
   - 500 = Server error (check function logs)

### Check Supabase Logs
```bash
# Watch Edge Function logs in real-time
supabase functions logs login-by-phone --tail

# In another terminal, attempt login
# Check logs for errors
```

### Check Database Directly
```sql
-- Verify auth.users entry exists
SELECT * FROM auth.users WHERE email LIKE '%9900000103%';

-- If not found, user was never created properly
-- Need to run signup-by-phone first
```

---

## 📋 Full Debugging (If Quick Fixes Don't Work)

**Use the comprehensive checklist:**
→ Open `LOGISTICS_AUTH_DEBUG_CHECKLIST.md`
→ Follow all 10 investigation steps
→ Document findings

---

## 🎯 Success Checklist

After fixing, verify all of these:

- [ ] Login succeeds (no form reset)
- [ ] Redirected to `/logistics/dashboard`
- [ ] Dashboard shows content (not login page)
- [ ] Navigation to `/logistics/loads` works
- [ ] Navigation to `/logistics/trips` works
- [ ] Navigation to `/logistics/vehicles` works
- [ ] Navigation to `/logistics/profile` works
- [ ] Mobile viewport shows dashboard correctly
- [ ] All 17 screenshots captured
- [ ] No screenshots show login page (except 01-03)
- [ ] No timeout errors
- [ ] No error screenshots generated

**When all items are checked, auth is working! 🎉**

---

## 📞 Need Help?

**Check these files:**
1. `LOGISTICS_SCREENSHOT_SUMMARY.md` - Overview and context
2. `LOGISTICS_AUTH_DEBUG_CHECKLIST.md` - Systematic debugging guide
3. `LOGISTICS_SCREENSHOT_AUDIT_REPORT.md` - Detailed technical analysis
4. `LOGISTICS_SCREENSHOT_GALLERY.md` - What was captured vs. expected

**Common issues:**
- User doesn't exist → Create with SQL
- Function not deployed → `supabase functions deploy login-by-phone`
- Rate limited → Clear rate_limits table
- Wrong credentials → Verify in database
- Frontend error handling → Add toast notifications

---

**Quick Start Guide Created:** March 14, 2026  
**Estimated Time to Fix:** 15-30 minutes  
**Priority:** P0 - Blocking Issue
