# Logistics Auth Debug Checklist

**Issue:** User `9900000103` cannot log in as Logistics role  
**Symptom:** Silent authentication failure, form resets, no error message  
**Impact:** Blocking - cannot access logistics dashboard

---

## 🔍 Investigation Steps

### 1. Verify User Exists in Database

```sql
-- Check if user profile exists
SELECT id, phone, full_name, role, created_at
FROM profiles
WHERE phone = '9900000103';

-- Check user roles
SELECT ur.*, p.phone, p.full_name
FROM user_roles ur
JOIN profiles p ON ur.user_id = p.id
WHERE p.phone = '9900000103';

-- Check if user has logistics role
SELECT *
FROM user_roles
WHERE role = 'logistics'
  AND user_id = (SELECT id FROM profiles WHERE phone = '9900000103');
```

**Expected Results:**
- User should exist in `profiles` table
- User should have `role = 'logistics'` in `user_roles` table
- User ID should be valid UUID

**If user doesn't exist:**
- Create test user with script:
  ```sql
  -- Create logistics test user
  INSERT INTO profiles (phone, full_name, role)
  VALUES ('9900000103', 'Test Logistics', 'logistics');
  
  INSERT INTO user_roles (user_id, role)
  VALUES (
    (SELECT id FROM profiles WHERE phone = '9900000103'),
    'logistics'
  );
  ```

---

### 2. Check Rate Limiting

```sql
-- Check if phone number is rate limited
SELECT *
FROM rate_limits
WHERE identifier = '9900000103'
  AND created_at > NOW() - INTERVAL '1 hour'
ORDER BY created_at DESC;

-- Check if IP is rate limited (if available)
SELECT *
FROM rate_limits
WHERE identifier LIKE '%127.0.0.1%'
  AND created_at > NOW() - INTERVAL '1 hour'
ORDER BY created_at DESC;

-- Clear rate limits for testing (if needed)
DELETE FROM rate_limits
WHERE identifier = '9900000103';
```

**Expected Results:**
- Should not be rate limited (no recent rows)
- If rate limited, delete rows for testing

---

### 3. Test Edge Function `login-by-phone`

**Check if function is deployed:**
```bash
supabase functions list
```

**Check function logs:**
```bash
supabase functions logs login-by-phone --tail
```

**Manual test with curl:**
```bash
curl -X POST https://YOUR_PROJECT.supabase.co/functions/v1/login-by-phone \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -d '{
    "phone": "9900000103",
    "password": "Dummy@12345",
    "role": "logistics"
  }'
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "user": { "id": "...", "phone": "9900000103" },
    "session": { "access_token": "...", "refresh_token": "..." }
  }
}
```

**Error Response Examples:**
```json
{ "success": false, "error": { "code": "INVALID_CREDENTIALS", "message": "..." } }
{ "success": false, "error": { "code": "USER_NOT_FOUND", "message": "..." } }
{ "success": false, "error": { "code": "RATE_LIMITED", "message": "..." } }
```

---

### 4. Check Browser Console Logs

**Open browser DevTools:**
- Press F12 or right-click → Inspect
- Go to Console tab
- Clear console
- Attempt login
- Look for errors

**Common Errors:**
```
POST http://localhost:5173/functions/v1/login-by-phone 404 Not Found
POST http://localhost:5173/functions/v1/login-by-phone 500 Internal Server Error
TypeError: Cannot read property 'session' of undefined
Error: Network request failed
```

**Check Network Tab:**
- Go to Network tab
- Filter by "Fetch/XHR"
- Attempt login
- Look for `login-by-phone` request
- Check status code, request body, response body

---

### 5. Check Frontend Login Handler

**File:** `src/pages/Auth/Login.tsx` (or similar)

**Look for:**
```tsx
// Login mutation handler
const { mutate: login, isLoading, error } = useMutation({
  mutationFn: async (credentials) => {
    // Check: Is this calling the correct Edge Function?
    const response = await fetch(`${SUPABASE_URL}/functions/v1/login-by-phone`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(credentials)
    });
    
    // Check: Is error handling present?
    if (!response.ok) {
      throw new Error('Login failed');
    }
    
    return response.json();
  },
  onSuccess: (data) => {
    // Check: Is session being stored?
    // Check: Is redirect happening?
  },
  onError: (error) => {
    // Check: Is error being displayed to user?
    console.error('Login error:', error);
    toast.error(error.message); // Is this present?
  }
});
```

**Common Issues:**
- Missing error handling
- Not displaying errors to user
- Not storing session after successful login
- Not redirecting after login
- Calling wrong endpoint
- Missing auth headers

---

### 6. Check Supabase Auth Configuration

**File:** `src/integrations/supabase/client.ts`

```tsx
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY, // Make sure this is anon key, not service_role
  {
    auth: {
      // Check: Is autoRefreshToken enabled?
      autoRefreshToken: true,
      // Check: Is persistSession enabled?
      persistSession: true,
      // Check: Is detectSessionInUrl enabled?
      detectSessionInUrl: false,
    }
  }
);
```

---

### 7. Check Environment Variables

**File:** `.env` or `.env.local`

```bash
VITE_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
VITE_SUPABASE_PUBLISHABLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Make sure these are set correctly
# Make sure anon key is not the service_role key
# Make sure URL has no trailing slash
```

**Verify in browser:**
```js
console.log(import.meta.env.VITE_SUPABASE_URL);
console.log(import.meta.env.VITE_SUPABASE_ANON_KEY);
```

---

### 8. Test with Known Good User

**Try logging in with a different role:**
- Farmer: `9900000101` / `Dummy@12345`
- Agent: `9900000102` / `Dummy@12345`
- Buyer: `9900000104` / `Dummy@12345`

**If other roles work:**
- Issue is specific to logistics user or logistics role
- Check user_roles table for logistics user
- Check RLS policies on relevant tables

**If no roles work:**
- Issue is with login Edge Function or frontend handler
- Check Edge Function is deployed
- Check network requests are reaching Supabase

---

### 9. Check RLS Policies

**Tables to check:**
```sql
-- Check profiles RLS
SELECT * FROM pg_policies WHERE tablename = 'profiles';

-- Check user_roles RLS
SELECT * FROM pg_policies WHERE tablename = 'user_roles';

-- Test if logistics user can query their own profile
SET request.jwt.claims.sub = (SELECT id::text FROM profiles WHERE phone = '9900000103');
SELECT * FROM profiles WHERE id = (SELECT id FROM profiles WHERE phone = '9900000103');
```

---

### 10. Check Edge Function Code

**File:** `supabase/functions/login-by-phone/index.ts`

**Verify:**
- Function exists and is not corrupted
- Function handles phone auth correctly
- Function returns proper response format
- Function creates Supabase auth session
- Function checks user role
- Error handling is present

**Common issues:**
```ts
// BAD: Using service_role to query, but returning to frontend
const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

// GOOD: Using service_role only for auth, then switching to user session
const adminClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
const userClient = createClient(SUPABASE_URL, ANON_KEY);
```

---

## ✅ Success Criteria

After fixes, verify:
1. [ ] User `9900000103` can log in successfully
2. [ ] User is redirected to `/logistics/dashboard`
3. [ ] Dashboard loads without errors
4. [ ] Navigation between dashboard pages works
5. [ ] Mobile layout works correctly
6. [ ] Error messages display for invalid credentials
7. [ ] Loading state shows during login
8. [ ] Form validation works

---

## 🔄 Re-test After Fixes

Once authentication is working, re-run screenshot capture:

```bash
node capture-logistics-audit.mjs
```

Expected outcome:
- Login succeeds
- All 17 dashboard screenshots captured successfully
- No screenshots show login page
- All pages load within 8 seconds
- Mobile and desktop views captured

---

## 📝 Document Findings

After investigation, document:
1. Root cause of auth failure
2. Fix applied
3. Test results (before/after)
4. Any related issues discovered
5. Preventive measures for future

---

**Checklist Created:** March 14, 2026  
**Related Reports:**
- `LOGISTICS_SCREENSHOT_AUDIT_REPORT.md` (detailed analysis)
- `LOGISTICS_SCREENSHOT_GALLERY.md` (visual gallery)
