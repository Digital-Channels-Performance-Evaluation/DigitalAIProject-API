# Clear Session and Test Admin-Only Feature

## Issue
The "Model Training Mode" toggle is showing for product_manager role when it should only show for super_admin.

## Root Cause
Likely old session data cached in browser localStorage before the HTTPOnly cookie changes were deployed.

## Solution: Clear Everything and Re-login

### Option 1: Clear Browser Data (Recommended)
1. Open browser DevTools (F12)
2. Go to **Application** tab (Chrome) or **Storage** tab (Firefox)
3. Under **Local Storage**, click on your site's domain
4. Click "Clear All" or delete the `ahadu-auth` entry
5. Under **Cookies**, delete all cookies for your domain
6. Close DevTools and refresh the page (Ctrl+F5 or Cmd+Shift+R)
7. Login again

### Option 2: Use Browser Console
1. Open browser console (F12)
2. Run this command:
```javascript
localStorage.clear();
document.cookie.split(";").forEach(c => {
  document.cookie = c.trim().split("=")[0] + "=;expires=Thu, 01 Jan 1970 00:00:00 UTC;path=/";
});
location.reload();
```
3. Login again

### Option 3: Incognito/Private Window
1. Open an incognito/private browser window
2. Navigate to your application
3. Login as product_manager
4. Go to Settings page
5. "Model Training Mode" section should NOT be visible

6. Logout and login as super_admin
7. Go to Settings page
8. "Model Training Mode" section SHOULD be visible

## Verify It's Working

### Test 1: Product Manager (Should NOT see toggle)
```
Login as: product_manager
Go to: /dashboard/settings
Expected: Only "Upload KPI Data" section visible
Expected: NO "Model Training Mode" section
```

### Test 2: Super Admin (Should see toggle)
```
Login as: super_admin
Go to: /dashboard/settings
Expected: Both sections visible:
  1. "Model Training Mode" with "ADMIN ONLY" badge
  2. "Upload KPI Data" section
```

## Debug: Check Browser Console

After clearing and re-logging in, open console and check:

1. **Check logged user**:
```javascript
localStorage.getItem('ahadu-auth')
```
Should show user object with correct role

2. **Check cookies**:
```javascript
document.cookie
```
Should show access_token and refresh_token (values won't be visible due to HTTPOnly)

3. **Check user role in Settings page**:
- The console should show debug logs:
  - "Current user: {id, email, role, ...}"
  - "Is admin: false" (for product_manager)
  - "User role: product_manager"

## If Still Not Working

### Backend Check
Verify the backend is returning correct user role:

1. Open Network tab in DevTools
2. Navigate to Settings page
3. Look for `/auth/me` request
4. Check response body - verify `role` field matches your actual role

### Frontend Check
Add temporary debug info to the page:

Open browser console on Settings page and run:
```javascript
// Check auth store state
console.log('Auth Store:', {
  user: window.localStorage.getItem('ahadu-auth'),
  parsed: JSON.parse(window.localStorage.getItem('ahadu-auth') || '{}')
});
```

## Expected Behavior Summary

| User Role | Settings Page Behavior |
|-----------|------------------------|
| product_manager | ❌ NO "Model Training Mode" section |
| data_engineer | ❌ NO "Model Training Mode" section |
| ml_engineer | ❌ NO "Model Training Mode" section |
| risk_team | ❌ NO "Model Training Mode" section |
| compliance_team | ❌ NO "Model Training Mode" section |
| executive_management | ❌ NO "Model Training Mode" section |
| **super_admin** | ✅ YES "Model Training Mode" section with toggle |

## Still Having Issues?

1. Restart the frontend development server
2. Restart the backend server
3. Clear browser cache completely
4. Try a different browser
5. Check console logs for any errors
