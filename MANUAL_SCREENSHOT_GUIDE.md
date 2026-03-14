# Manual Screenshot Capture Guide - AgriNext Logistics

This guide provides step-by-step instructions to manually capture screenshots of the AgriNext Logistics Dashboard for UI/UX audit purposes.

## Prerequisites

- Dev server running: `npm run dev` (should be on http://localhost:5173)
- Browser: Chrome, Firefox, or Edge recommended
- Screen resolution: 1920x1080 for desktop screenshots
- Test credentials: Phone: `9900000103`, Password: `Dummy@12345`

---

## Part 1: Desktop Screenshots (1920x1080)

### Setup
1. Open your browser in a new window
2. Resize browser window to full screen or set resolution to 1920x1080
3. Open Developer Tools (F12)
4. Go to Device Toolbar (Ctrl+Shift+M or Cmd+Shift+M)
5. Select "Responsive" and set to 1920x1080

### Screenshot Tool Options

**Option A: Browser Built-in**
- Press F12 → Device Toolbar → Three-dot menu → "Capture screenshot" (full page)

**Option B: Windows Snipping Tool**
- Windows + Shift + S → Select area → Save

**Option C: Browser Extension**
- Install "GoFullPage" or "Fireshot" extension → Click extension icon → Full page screenshot

### Screenshots to Capture

#### 1. Dashboard Page
1. Navigate to: http://localhost:5173/login
2. Login with credentials (role: Logistics)
3. Wait for dashboard to load fully
4. **Screenshot 1:** Save as `05-desktop-dashboard.png`
5. Scroll down if page is long
6. **Screenshot 2:** Save as `05-desktop-dashboard-scrolled.png` (if applicable)

**What to capture:**
- Page header with navigation
- Sidebar menu (if present)
- Main dashboard content area
- Metrics/stats cards
- Charts/graphs
- Recent activity widgets
- Footer

#### 2. Available Loads Page
1. Click "Available Loads" in sidebar OR navigate to: http://localhost:5173/logistics/loads
2. Wait for page to load
3. **Screenshot 3:** Save as `05-desktop-loads.png`

**What to capture:**
- Page header and breadcrumbs
- Filters/search bar
- Load listings (cards or table)
- Action buttons (Accept Load, View Details)
- Empty state (if no loads)
- Pagination (if present)

#### 3. Active Trips Page
1. Click "Active Trips" OR navigate to: http://localhost:5173/logistics/trips
2. **Screenshot 4:** Save as `05-desktop-trips.png`

**What to capture:**
- Active trip cards/list
- Status indicators (In Progress, Pickup Pending, etc.)
- Action buttons (Start Trip, Complete, View Details)
- GPS/map view (if visible)
- Empty state (if no trips)

#### 4. Completed Trips Page
1. Click "Completed Trips" OR navigate to: http://localhost:5173/logistics/completed
2. **Screenshot 5:** Save as `05-desktop-completed.png`

**What to capture:**
- Historical trip list
- Date filters
- Payment status indicators
- Ratings/feedback
- View details option
- Empty state message

#### 5. My Vehicles Page
1. Click "My Vehicles" OR navigate to: http://localhost:5173/logistics/vehicles
2. **Screenshot 6:** Save as `05-desktop-vehicles.png`

**What to capture:**
- Vehicle cards or table
- Add Vehicle button
- Vehicle details (type, capacity, registration)
- Edit/Delete actions
- Empty state with CTA to add first vehicle

#### 6. Service Area Page
1. Click "Service Area" OR navigate to: http://localhost:5173/logistics/service-area
2. Wait for map to load
3. **Screenshot 7:** Save as `05-desktop-service-area.png`

**What to capture:**
- Map view (Google Maps)
- Service area markers/boundaries
- Add/Edit service area controls
- District/Taluk selector
- Save changes button

#### 7. Profile Page
1. Click "Profile" OR navigate to: http://localhost:5173/logistics/profile
2. **Screenshot 8:** Save as `05-desktop-profile.png`

**What to capture:**
- Profile header with avatar
- Personal information fields
- Contact details
- Bank account info (masked)
- Document uploads section
- Language selector
- Logout button

### Bonus Desktop Screenshots (Important!)

#### 8. Load Details Modal
1. On Available Loads page, click "View Details" on any load
2. **Screenshot 9:** Save as `05-desktop-load-details-modal.png`

#### 9. Accept Load Confirmation
1. On Available Loads page, click "Accept Load"
2. **Screenshot 10:** Save as `05-desktop-accept-load-dialog.png`

#### 10. Trip Start Flow
1. On Active Trips, click "Start Trip"
2. **Screenshot 11:** Save as `05-desktop-trip-start-flow.png`

#### 11. Empty State Examples
1. If you can clear data or use a fresh account, capture:
2. **Screenshot 12:** `05-desktop-empty-loads.png`
3. **Screenshot 13:** `05-desktop-empty-trips.png`
4. **Screenshot 14:** `05-desktop-empty-vehicles.png`

---

## Part 2: Mobile Screenshots (375x812 - iPhone X)

### Setup
1. Open browser Developer Tools (F12)
2. Enable Device Toolbar (Ctrl+Shift+M)
3. Select "iPhone X" from device dropdown OR set custom 375x812
4. Ensure "Show device frame" is unchecked (for clean screenshots)
5. Rotate orientation to Portrait

### Screenshots to Capture

#### 1. Mobile Dashboard
1. Navigate to: http://localhost:5173/login
2. Login with credentials
3. Wait for dashboard to load
4. **Screenshot 15:** Save as `06-mobile-dashboard.png`

**What to capture:**
- Mobile header (logo, menu icon)
- Main content (stacked vertically)
- Metrics cards
- Bottom navigation (if present)
- Pull-to-refresh indicator (if visible)

#### 2. Mobile Available Loads
1. Navigate to loads page
2. **Screenshot 16:** Save as `06-mobile-loads.png`

**What to capture:**
- Mobile header
- Filter button/sheet
- Load cards (stacked)
- Action buttons
- Bottom sheet interactions

#### 3. Mobile Active Trips
1. Navigate to trips page
2. **Screenshot 17:** Save as `06-mobile-trips.png`

#### 4. Mobile Menu - Closed
1. Go back to dashboard
2. **Screenshot 18:** Save as `06-mobile-menu-closed.png`

**What to capture:**
- Hamburger menu icon (☰) in header
- Main content

#### 5. Mobile Menu - Open
1. Click hamburger menu icon
2. Wait for drawer/menu to slide open
3. **Screenshot 19:** Save as `06-mobile-menu-open.png`

**What to capture:**
- Sidebar/drawer with navigation links
- User profile info in drawer
- Menu items
- Logout option
- Overlay behind drawer (if visible)

#### 6. Mobile Load Details
1. Navigate to loads page
2. Click on a load card
3. **Screenshot 20:** Save as `06-mobile-load-details.png`

**What to capture:**
- Full-screen detail view or bottom sheet
- Load information
- Accept button (sticky footer?)
- Back navigation

#### 7. Mobile Trip Details
1. Navigate to trips page
2. Click on a trip
3. **Screenshot 21:** Save as `06-mobile-trip-details.png`

### Mobile Interaction Tests

#### 8. Keyboard Overlap Test
1. On mobile view, go to profile page
2. Tap on a text input field (e.g., phone number)
3. Wait for on-screen keyboard to appear
4. **Screenshot 22:** Save as `06-mobile-keyboard-overlap.png`

**What to capture:**
- Input field still visible above keyboard
- Submit button still accessible (or sticky)
- Page doesn't scroll in weird ways

#### 9. Landscape Orientation
1. Rotate device to landscape (812x375)
2. Go to dashboard
3. **Screenshot 23:** Save as `06-mobile-landscape-dashboard.png`

**What to capture:**
- Layout adaptation
- Navigation bar behavior
- Content readability

---

## Part 3: Interactive State Screenshots

### Error States

#### 10. Form Validation Errors
1. On login page, enter invalid phone number (e.g., "123")
2. Click Sign In
3. **Screenshot 24:** Save as `07-error-invalid-phone.png`

#### 11. Network Error
1. Open DevTools → Network tab → Throttle to "Offline"
2. Try to load a page
3. **Screenshot 25:** Save as `07-error-network-offline.png`

#### 12. No Data / Empty State
(If not already captured above)
- **Screenshot 26:** `07-empty-state-no-loads.png`
- **Screenshot 27:** `07-empty-state-no-vehicles.png`

### Loading States

#### 13. Data Loading Skeleton
1. Throttle network to "Slow 3G"
2. Navigate to a page with data
3. Quickly capture the skeleton/loading state
4. **Screenshot 28:** Save as `07-loading-skeleton.png`

### Success States

#### 14. Success Toast/Notification
1. Complete an action (e.g., accept a load)
2. Capture the success message
3. **Screenshot 29:** Save as `07-success-toast.png`

### Hover States (Desktop Only)

#### 15. Button Hover
1. Hover over primary action button
2. **Screenshot 30:** Save as `07-hover-button.png`

#### 16. Card Hover
1. Hover over a load/trip card
2. **Screenshot 31:** Save as `07-hover-card.png`

---

## Part 4: Accessibility Testing Screenshots

### Focus States

#### 17. Keyboard Navigation
1. Press Tab key multiple times to navigate through page
2. Capture focused element (should have visible outline)
3. **Screenshot 32:** Save as `08-accessibility-focus-state.png`

### Color Contrast

#### 18. High Contrast Mode
1. Enable Windows High Contrast mode (if on Windows)
2. Capture dashboard
3. **Screenshot 33:** Save as `08-accessibility-high-contrast.png`

### Screen Reader View
(Optional - requires screen reader software)
1. Enable NVDA or JAWS
2. Capture element inspection showing ARIA labels
3. **Screenshot 34:** Save as `08-accessibility-aria-labels.png`

---

## Part 5: Performance Screenshots

### Network Tab

#### 19. Initial Load Performance
1. Open DevTools → Network tab
2. Hard refresh page (Ctrl+Shift+R)
3. Once loaded, capture Network tab showing:
   - Total requests
   - Total transfer size
   - DOMContentLoaded time
   - Load time
4. **Screenshot 35:** Save as `09-performance-network.png`

### Lighthouse Audit

#### 20. Lighthouse Report
1. Open DevTools → Lighthouse tab
2. Select:
   - ✅ Performance
   - ✅ Accessibility
   - ✅ Best Practices
   - ✅ SEO
   - Device: Mobile
3. Click "Analyze page load"
4. Once complete, capture full report
5. **Screenshot 36:** Save as `09-performance-lighthouse-mobile.png`

6. Repeat for Desktop
7. **Screenshot 37:** Save as `09-performance-lighthouse-desktop.png`

---

## Organizing Screenshots

### Folder Structure

Create this structure in the project:

```
screenshots/
└── logistics-audit/
    ├── desktop/
    │   ├── 05-desktop-dashboard.png
    │   ├── 05-desktop-loads.png
    │   ├── 05-desktop-trips.png
    │   └── ...
    ├── mobile/
    │   ├── 06-mobile-dashboard.png
    │   ├── 06-mobile-loads.png
    │   └── ...
    ├── interactions/
    │   ├── 07-error-*.png
    │   ├── 07-loading-*.png
    │   └── ...
    ├── accessibility/
    │   └── 08-accessibility-*.png
    ├── performance/
    │   └── 09-performance-*.png
    └── INDEX.md (generated summary)
```

### Screenshot Naming Convention

Format: `[number]-[category]-[description].png`

Examples:
- `05-desktop-dashboard.png`
- `06-mobile-loads.png`
- `07-error-network-offline.png`
- `08-accessibility-focus-state.png`

---

## Annotating Screenshots (Optional but Recommended)

After capturing, consider adding annotations:

**Tools:**
- Snagit (Windows/Mac)
- Skitch (Mac)
- Paint.NET (Windows - free)
- GIMP (Cross-platform - free)

**What to annotate:**
- ✅ Good design choices (green checkmark)
- ❌ Issues found (red X)
- ⚠️ Concerns (yellow warning)
- 📏 Spacing/alignment issues (rulers/guides)
- 🔤 Typography hierarchy (labels)
- 🎨 Color contrast issues (circles)

---

## Completion Checklist

### Login Flow (Already Captured ✅)
- [x] 01-login-initial.png
- [x] 02-login-logistics-selected.png
- [x] 03-login-filled.png
- [x] 04-after-login.png

### Desktop Pages (Pending)
- [ ] 05-desktop-dashboard.png
- [ ] 05-desktop-dashboard-scrolled.png
- [ ] 05-desktop-loads.png
- [ ] 05-desktop-trips.png
- [ ] 05-desktop-completed.png
- [ ] 05-desktop-vehicles.png
- [ ] 05-desktop-service-area.png
- [ ] 05-desktop-profile.png

### Mobile Pages (Pending)
- [ ] 06-mobile-dashboard.png
- [ ] 06-mobile-loads.png
- [ ] 06-mobile-trips.png
- [ ] 06-mobile-menu-closed.png
- [ ] 06-mobile-menu-open.png

### Interactions (Pending)
- [ ] Modal/dialog screenshots
- [ ] Error state screenshots
- [ ] Loading state screenshots
- [ ] Success state screenshots
- [ ] Hover state screenshots

### Accessibility (Pending)
- [ ] Focus state screenshots
- [ ] High contrast screenshots

### Performance (Pending)
- [ ] Network tab screenshot
- [ ] Lighthouse reports (mobile + desktop)

---

## Tips for High-Quality Screenshots

1. **Wait for page to fully load** - No half-loaded images or content
2. **Clean up test data** - Remove console errors, unnecessary browser tabs
3. **Disable browser extensions** - They can add UI elements to screenshots
4. **Use incognito/private mode** - Clean session without cached states
5. **Full page screenshots** - Capture entire scrollable area when relevant
6. **Consistent viewport** - Stick to 1920x1080 desktop, 375x812 mobile
7. **High resolution** - PNG format, no compression
8. **Descriptive filenames** - Follow naming convention strictly
9. **Document as you go** - Note any issues or observations immediately
10. **Capture interactions** - Don't just capture static pages

---

## After Completion

1. Move all screenshots to appropriate folders
2. Review completeness against checklist
3. Generate INDEX.md with descriptions
4. Share screenshot folder location
5. Review screenshots with team
6. Create annotated versions for key findings
7. Update LOGISTICS_UI_UX_AUDIT_REPORT.md with observations

---

## Troubleshooting

### Issue: Page not loading
**Solution:** Check dev server is running (`npm run dev`), verify URL

### Issue: Login failing
**Solution:** Verify credentials are correct, check browser console for errors

### Issue: Empty pages / No data
**Solution:** May need to seed test data or use staging environment

### Issue: Screenshots too large
**Solution:** Use PNG compression tool after capture (TinyPNG, Squoosh)

### Issue: Can't capture mobile view
**Solution:** Use browser DevTools device emulator, not actual mobile device

### Issue: Map not loading
**Solution:** Check Google Maps API key in .env file

---

## Questions or Issues?

If you encounter any problems during screenshot capture:

1. Check browser console for JavaScript errors
2. Verify dev server terminal for backend errors
3. Test with different browser (Chrome, Firefox, Edge)
4. Clear browser cache and cookies
5. Restart dev server
6. Check network connectivity

---

**Happy screenshotting!** 📸

This comprehensive audit will provide valuable insights into the AgriNext Logistics UI/UX quality.
