# Agent Dashboard Screenshot Capture - Manual Intervention Required

## Issue Encountered

The automated login process is not working. When the script tries to log in using:
- Phone: `9900000102`
- Password: `Dummy@12345`  
- Role: Agent

The login button gets stuck on "Signing in..." and never completes. This indicates one of the following issues:

1. **Edge Function Issue**: The `login-by-phone` Edge Function may not be deployed or functioning
2. **Test User Issue**: The test user may not exist or have different credentials
3. **Network/CORS Issue**: There may be a connection problem with the Supabase backend

## Current Status

✅ **Completed Screenshots** (from previous session):
- `01-login-page-initial.png` - Login page initial state
- `02-login-page-filled.png` - Login form filled
- `03-agent-dashboard-full.png` - Full agent dashboard
- `03-agent-dashboard-top.png` - Dashboard top section
- `04-agent-today.png` - Today view
- `05-agent-tasks.png` - Tasks view

❌ **Missing Screenshots** (still needed):
- `06-agent-farmers-crops.png` - Farmers & Crops page
- `08-agent-transport-actual.png` - Transport page
- `09-agent-service-area-actual.png` - Service Area page
- `10-agent-profile-actual.png` - Profile page
- `12-agent-mobile-dashboard.png` - Mobile dashboard view (375x812)
- `13-agent-mobile-sidebar.png` - Mobile sidebar open
- `14-agent-notifications.png` - Notification dropdown

## Manual Solution

I've created a script that will open the browser and wait for you to manually log in, then it will automatically capture all the remaining screenshots.

### How to Use

1. **Make sure the dev server is running**:
   ```powershell
   npm run dev
   ```
   (This is already running - I started it for you)

2. **Run the manual capture script**:
   ```powershell
   node capture-agent-manual.mjs
   ```

3. **Follow the on-screen instructions**:
   - The browser will open to the login page
   - Manually log in as an Agent:
     - Click "Agent" role
     - Enter phone: `9900000102`
     - Enter password: `Dummy@12345`
     - Click "Sign In"
   - Wait for the dashboard to fully load
   - Press ENTER in the terminal

4. **The script will then automatically**:
   - Navigate to each required page
   - Capture full-page screenshots
   - Switch between desktop and mobile viewports
   - Try to click interactive elements (menu, notifications)
   - Save all screenshots to `agent-screenshots/`

## Alternative: Fix the Login Issue

If you want to fix the login issue first, check:

1. **Verify Edge Function is deployed**:
   ```bash
   supabase functions list
   ```

2. **Check if the test user exists**:
   ```bash
   npm run staging:verify-login
   ```

3. **Create/repair test users**:
   ```bash
   npm run staging:provision-dummy-users
   ```

4. **Check browser console** in the manual test for any error messages

## Files Created

- `capture-agent-manual.mjs` - Interactive script that waits for manual login
- `test-login.mjs` - Diagnostic script to debug login issues
- `capture-agent-remaining.mjs` - Fully automated script (not working due to login)

## Next Steps

Run the manual capture script to get all remaining screenshots:
```powershell
node capture-agent-manual.mjs
```

Then follow the prompts to complete the screenshot capture process.
