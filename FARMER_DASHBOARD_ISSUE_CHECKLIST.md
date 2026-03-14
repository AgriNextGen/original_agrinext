# AgriNext Farmer Dashboard - Issue Resolution Checklist

**Generated:** March 14, 2026  
**Total Issues:** 9  
**Critical (P0):** 3  
**High Priority (P1):** 2  
**Medium Priority (P2):** 4

---

## 🚨 CRITICAL ISSUES (P0) - LAUNCH BLOCKERS

### Issue #1: Farmlands Page Completely Blank
**Priority:** 🔴 P0 - CRITICAL  
**Impact:** Blocks entire farmer onboarding flow  
**Estimated Fix Time:** 2-4 hours

**Symptoms:**
- Page renders as nearly blank/white
- Screenshot file size only 10KB (vs 50-200KB for other pages)
- Navigation to `/farmer/farmlands` appears to load but shows no content

**Debug Steps:**
- [ ] Open `/farmer/farmlands` in browser
- [ ] Check browser console for JavaScript errors
- [ ] Check Network tab for failed API calls
- [ ] Verify RLS policies on `farmlands` table
- [ ] Check if component is crashing silently
- [ ] Verify useQuery hook for farmlands data
- [ ] Test with different user accounts

**Likely Causes:**
1. Component crash (check ErrorBoundary logs)
2. RLS policy blocking data fetch
3. Undefined variable in component (strictNullChecks is off)
4. Missing import or broken dependency

**Files to Check:**
- `src/pages/farmer/Farmlands.tsx` or similar
- `src/hooks/useFarmlands.tsx` (if exists)
- `supabase/migrations/*farmlands*.sql` (RLS policies)
- Browser console errors

**Test Plan:**
- [ ] Fix identified issue
- [ ] Verify page loads with empty state
- [ ] Test "Add Farmland" button works
- [ ] Test with existing farmland data
- [ ] Verify mobile view works
- [ ] Rerun screenshot automation

---

### Issue #2: Mandi Prices Widget Completely Empty
**Priority:** 🔴 P0 - CRITICAL  
**Impact:** Core feature not working, reduces platform value  
**Estimated Fix Time:** 4-8 hours

**Symptoms:**
- Widget renders but shows "0 crops • No price data available"
- "No price data available" message across Dashboard and My Day pages
- Refresh button does nothing

**Debug Steps:**
- [ ] Check if market prices API endpoint exists
- [ ] Verify Edge Function `get-market-prices` or similar
- [ ] Check database table for market price data
- [ ] Verify RLS policies on market data tables
- [ ] Check if user's district/crops are set (required for filtering)
- [ ] Test API call directly via Postman/curl
- [ ] Check for CORS or auth issues

**Likely Causes:**
1. Market price data not seeded in database
2. RLS policy blocking data access
3. API endpoint missing or broken
4. User profile missing required fields (district, preferred crops)
5. Frontend fetch logic incorrect

**Files to Check:**
- `src/components/farmer/MarketPricesWidget.tsx` or similar
- `src/hooks/useMarketData.tsx` (if exists)
- `supabase/functions/get-market-prices/` (Edge Function)
- `supabase/migrations/*market*.sql` (tables, RLS)
- Database: `market_prices` or similar table

**Test Plan:**
- [ ] Fix identified issue
- [ ] Seed sample market price data
- [ ] Verify widget loads data for test user
- [ ] Test refresh button functionality
- [ ] Test with different districts
- [ ] Verify mobile view works
- [ ] Rerun screenshot automation

---

### Issue #3: Weather Widget Showing Partial/Loading Data
**Priority:** 🔴 P0 - MEDIUM-HIGH  
**Impact:** Feature partially working, may confuse users  
**Estimated Fix Time:** 2-4 hours

**Symptoms:**
- Widget shows temperature (25°C) and condition ("Partly cloudy")
- Widget appears to be in loading state
- "More" link may not work
- No detailed weather data shown

**Debug Steps:**
- [ ] Check weather API integration
- [ ] Verify Edge Function `get-weather` is working
- [ ] Check if GPS coordinates are available
- [ ] Test weather API endpoint directly
- [ ] Check API rate limits or quota
- [ ] Verify loading state logic in component
- [ ] Check if "More" link navigates correctly

**Likely Causes:**
1. Weather API timeout or slow response
2. Missing GPS coordinates for user location
3. Loading state not clearing properly
4. Incomplete data handling in frontend
5. API key expired or rate limited

**Files to Check:**
- `src/components/farmer/WeatherWidget.tsx` or similar
- `src/hooks/useWeather.tsx` (if exists)
- `supabase/functions/get-weather/` (Edge Function)
- Weather API integration code
- User profile: village/district location data

**Test Plan:**
- [ ] Fix identified issue
- [ ] Verify complete weather data loads
- [ ] Test "More" link navigation
- [ ] Test with different locations
- [ ] Add loading skeleton for better UX
- [ ] Add error state handling
- [ ] Rerun screenshot automation

---

## 🔧 HIGH PRIORITY ISSUES (P1) - FIX BEFORE RELEASE

### Issue #4: Transport Page Shows Translation Key
**Priority:** 🟠 P1 - HIGH  
**Impact:** Poor UX, shows developer key instead of text  
**Estimated Fix Time:** 30 minutes

**Symptoms:**
- Empty state shows "noRequestsYet" instead of translated text
- Should show: "No transport requests yet" (English) or equivalent in Kannada

**Fix Steps:**
- [ ] Open `src/i18n/en.ts`
- [ ] Find or add key: `transport.noRequestsYet` with value: "No transport requests yet"
- [ ] Open `src/i18n/kn.ts`
- [ ] Add same key with Kannada translation
- [ ] Verify component is using `t('transport.noRequestsYet')`
- [ ] Test language switcher to verify both languages work

**Files to Edit:**
```typescript
// src/i18n/en.ts
export const en = {
  // ... existing keys
  transport: {
    // ... existing transport keys
    noRequestsYet: "No transport requests yet",
    emptyStateDescription: "Your transport requests will appear here once created"
  }
};

// src/i18n/kn.ts
export const kn = {
  // ... existing keys
  transport: {
    // ... existing transport keys
    noRequestsYet: "ಇನ್ನೂ ಯಾವುದೇ ಸಾರಿಗೆ ವಿನಂತಿಗಳಿಲ್ಲ",
    emptyStateDescription: "ನಿಮ್ಮ ಸಾರಿಗೆ ವಿನಂತಿಗಳು ರಚಿಸಿದ ನಂತರ ಇಲ್ಲಿ ಕಾಣಿಸುತ್ತವೆ"
  }
};
```

**Test Plan:**
- [ ] Verify English text shows correctly
- [ ] Switch to Kannada, verify translation
- [ ] Check all other transport page strings
- [ ] Rerun screenshot automation

---

### Issue #5: Mobile My Day Page Not Loading
**Priority:** 🟠 P1 - HIGH  
**Impact:** Mobile navigation may be broken  
**Estimated Fix Time:** 1-2 hours (investigation + fix)

**Symptoms:**
- Screenshot capture failed/timed out
- File size only 2.5KB (indicates failure)
- May redirect to login or error page
- Possibly mobile-specific issue

**Debug Steps:**
- [ ] Open app on mobile device or Chrome DevTools mobile emulation
- [ ] Navigate to My Day page
- [ ] Check if page loads correctly
- [ ] Check browser console for errors
- [ ] Verify auth session persists
- [ ] Check if issue is viewport-specific
- [ ] Test on different mobile viewports (375, 390, 412px widths)

**Likely Causes:**
1. Auth session expiring on mobile
2. Responsive CSS breaking layout
3. Component crash on mobile viewport
4. Route guard redirecting incorrectly

**Files to Check:**
- `src/pages/farmer/MyDay.tsx` or similar
- Mobile responsive CSS
- Auth context/hooks
- Route protection logic

**Test Plan:**
- [ ] Fix identified issue
- [ ] Test page loads on mobile
- [ ] Verify all widgets render
- [ ] Test bottom tab navigation to/from My Day
- [ ] Rerun mobile screenshot automation

---

## 📋 MEDIUM PRIORITY ISSUES (P2) - FIX SOON

### Issue #6: Orders Page Duplicate Text
**Priority:** 🟡 P2 - MEDIUM  
**Impact:** Minor UX issue, text repeated  
**Estimated Fix Time:** 5 minutes

**Symptoms:**
- Empty state shows "You haven't received any orders yet." twice
- Heading and subtitle are identical

**Fix:**
```typescript
// Before:
<EmptyState
  title="You haven't received any orders yet."
  description="You haven't received any orders yet."
  action={<Button>Add Listing</Button>}
/>

// After:
<EmptyState
  title="You haven't received any orders yet."
  description="Create a listing to start receiving buyer orders."
  action={<Button>Add Listing</Button>}
/>
```

**Files to Check:**
- `src/pages/farmer/Orders.tsx` or similar
- Orders empty state component

**Test Plan:**
- [ ] Update description text
- [ ] Verify both English and Kannada
- [ ] Take screenshot to confirm

---

### Issue #7: Settings Dropdowns Not Populated
**Priority:** 🟡 P2 - MEDIUM  
**Impact:** Users can't select state/district  
**Estimated Fix Time:** 1-2 hours

**Symptoms:**
- State dropdown shows "Select state" placeholder
- District dropdown shows "Select district" placeholder
- No options available in dropdowns

**Fix Steps:**
- [ ] Check if geo data is seeded in database
- [ ] Verify `geo_states` and `geo_districts` tables exist and have data
- [ ] Check component is fetching options correctly
- [ ] Add Karnataka districts (Bengaluru, Mysuru, Mangaluru, etc.)
- [ ] Verify cascade: selecting state loads districts for that state
- [ ] Test save functionality

**Files to Check:**
- `src/pages/farmer/Settings.tsx` or similar
- `src/components/geo/GeoStateSelect.tsx`
- `src/components/geo/GeoDistrictSelect.tsx`
- Database: `geo_states`, `geo_districts`, or similar tables
- Possibly: `supabase/migrations/*geo*.sql`

**Test Plan:**
- [ ] Seed Karnataka + districts data
- [ ] Verify dropdowns populate
- [ ] Test state → district cascade
- [ ] Test save functionality
- [ ] Verify saved values persist

---

### Issue #8: Agent Notes Shows Generic Message
**Priority:** 🟡 P2 - LOW-MEDIUM  
**Impact:** Widget not providing value  
**Estimated Fix Time:** 2-3 hours (feature enhancement)

**Symptoms:**
- Agent Notes widget shows "Welcome back! You have successfully signed in"
- Not useful or contextual

**Enhancement Ideas:**
1. Show "No agent assigned yet" if farmer has no agent
2. Show agent's latest note if available
3. Show "Request agent support" CTA if no agent
4. Show placeholder tips if no notes

**Implementation:**
- [ ] Check if farmer has assigned agent (from `agent_farmer_assignments`)
- [ ] If agent exists, fetch latest note from agent
- [ ] If no agent, show "Request agent" CTA
- [ ] If agent but no notes, show placeholder message
- [ ] Add i18n strings for all states

**Files to Check:**
- `src/components/farmer/MyAgentWidget.tsx` or `AgentNotesWidget.tsx`
- Database: `agent_farmer_assignments`, `agent_notes` or similar
- Edge Function for fetching agent notes (if needed)

**Test Plan:**
- [ ] Test with no agent assigned
- [ ] Test with agent but no notes
- [ ] Test with agent and notes
- [ ] Verify all states show appropriate content

---

### Issue #9: Mobile Sidebar/Drawer Not Tested
**Priority:** 🟡 P2 - MEDIUM  
**Impact:** Unknown - needs manual testing  
**Estimated Fix Time:** 1 hour (manual testing)

**Symptoms:**
- Screenshot automation timed out trying to capture
- "More" tab click didn't open sidebar
- Functionality not verified

**Manual Test Plan:**
- [ ] Open app on mobile (375x812 viewport)
- [ ] Navigate to any page
- [ ] Click "More" tab in bottom tab bar
- [ ] Verify sidebar/drawer opens
- [ ] Check animation is smooth
- [ ] Verify all nav links are present
- [ ] Test each nav link navigates correctly
- [ ] Verify "Sign Out" button works
- [ ] Check sidebar closes properly
- [ ] Test swipe gesture (if implemented)

**Expected Behavior:**
- More tab opens side drawer from right
- Drawer shows full navigation menu
- Overlay dims main content
- Tapping outside drawer closes it
- Links navigate and close drawer

**Files to Check:**
- `src/components/dashboard/DashboardSidebar.tsx`
- `src/components/dashboard/BottomTabBar.tsx`
- Mobile sidebar open/close logic
- CSS for drawer animation

**Test Plan:**
- [ ] Complete manual test on mobile
- [ ] Document any issues found
- [ ] Take screenshot of open sidebar
- [ ] Verify all functionality works

---

## 📊 ISSUE TRACKING

### By Priority:
- 🔴 **P0 (Critical):** 3 issues - **MUST FIX FOR LAUNCH**
- 🟠 **P1 (High):** 2 issues - **FIX BEFORE RELEASE**
- 🟡 **P2 (Medium):** 4 issues - **FIX SOON AFTER LAUNCH**

### By Category:
- **Data/API Issues:** 3 (Farmlands, Market Prices, Weather)
- **i18n/Translation:** 1 (Transport page)
- **Component/Rendering:** 1 (Mobile My Day)
- **UX Polish:** 3 (Orders text, Settings dropdowns, Agent Notes)
- **Testing Needed:** 1 (Mobile sidebar)

### Estimated Total Fix Time:
- **P0 issues:** 8-16 hours
- **P1 issues:** 1.5-3.5 hours
- **P2 issues:** 4.5-7 hours
- **TOTAL:** 14-26.5 hours (2-3 working days)

---

## ✅ COMPLETION CHECKLIST

### Day 1 - Critical Fixes:
- [ ] **Issue #1:** Fix Farmlands page rendering
- [ ] **Issue #2:** Fix Mandi Prices widget
- [ ] **Issue #3:** Fix Weather widget
- [ ] Run full regression test
- [ ] Rerun screenshot automation

### Day 2 - High Priority + Polish:
- [ ] **Issue #4:** Fix Transport i18n bug
- [ ] **Issue #5:** Debug/fix Mobile My Day
- [ ] **Issue #6:** Fix Orders duplicate text
- [ ] **Issue #7:** Populate Settings dropdowns
- [ ] Run mobile-specific tests

### Day 3 - Final Polish + QA:
- [ ] **Issue #8:** Enhance Agent Notes widget
- [ ] **Issue #9:** Manual test mobile sidebar
- [ ] Full UAT with stakeholders
- [ ] Final screenshot capture
- [ ] Update documentation

### Production Readiness:
- [ ] All P0 issues resolved ✅
- [ ] All P1 issues resolved ✅
- [ ] At least 75% of P2 issues resolved
- [ ] Full regression test passed
- [ ] Mobile testing completed
- [ ] Stakeholder approval obtained
- [ ] Deploy to staging
- [ ] Final QA on staging
- [ ] **READY TO DEPLOY** 🚀

---

## 🎯 SUCCESS CRITERIA

**Before marking an issue as resolved:**
1. ✅ Fix implemented and tested locally
2. ✅ No new errors in console
3. ✅ Feature works in both English and Kannada
4. ✅ Feature works on desktop and mobile
5. ✅ Screenshot automation captures successfully
6. ✅ Code reviewed (if team process requires)
7. ✅ Committed with descriptive commit message

**Format for commit messages:**
```
fix(farmlands): resolve page rendering issue

- Added null check for farmland data
- Fixed RLS policy blocking data fetch
- Added loading skeleton
- Tested with empty state and populated data

Closes #1 from UX audit
```

---

## 📞 ESCALATION

**If stuck on any issue for > 2 hours:**
1. Document what you've tried
2. Note any error messages
3. Share relevant code snippets
4. Ask for team support

**If issue is more complex than estimated:**
1. Update time estimate
2. Communicate to PM/lead
3. Consider breaking into smaller tasks
4. Document blockers

---

**Checklist Created:** March 14, 2026  
**Last Updated:** March 14, 2026  
**Owner:** Development Team  
**Reviewer:** QA Team  
**Approver:** Product Manager

---

_Print this checklist and track progress with checkboxes. Update estimates as you work through issues._
