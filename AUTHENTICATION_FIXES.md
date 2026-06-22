# Authentication & Authorization Fixes

## Summary of Changes

This document outlines the security improvements made to the authentication and authorization system.

## 🔒 Security Improvements Implemented

### 1. HTTPOnly Cookies (XSS Protection)
**Problem**: Tokens were stored in localStorage, making them vulnerable to XSS attacks.

**Solution**: 
- Switched to HTTPOnly cookies for both access and refresh tokens
- Cookies are now inaccessible to JavaScript, preventing XSS token theft
- Backend sets cookies with `httponly=True`, `secure` (in production), and `samesite` settings

**Files Changed**:
- `backend/app/api/v1/auth.py` - Login endpoint now sets HTTPOnly cookies
- `backend/app/core/deps.py` - Updated to read tokens from cookies
- `backend/app/core/config.py` - Added cookie configuration settings
- `frontend/lib/api.ts` - Enabled `withCredentials: true` for cookie transmission
- `frontend/lib/auth-store.ts` - Removed localStorage token management

### 2. Session Timeout (15 Minutes Inactivity)
**Problem**: Users could stay logged in indefinitely with no inactivity detection.

**Solution**:
- Reduced access token expiry from 30 to 15 minutes
- Implemented client-side activity tracking
- Auto-logout after 15 minutes of inactivity
- Activity tracked via mouse, keyboard, scroll, touch, and click events

**Files Changed**:
- `backend/app/core/config.py` - Changed `ACCESS_TOKEN_EXPIRE_MINUTES` to 15
- `frontend/lib/auth-store.ts` - Added `lastActivity` tracking and inactivity checker

### 3. Browser/Tab Close Logout
**Problem**: Sessions persisted after closing browser/tab.

**Solution**:
- Added `beforeunload` event listener to logout on tab/browser close
- Uses `navigator.sendBeacon()` for reliable logout signal before page unload

**Files Changed**:
- `frontend/lib/auth-store.ts` - Added `beforeunload` event handler

### 4. No Shared Sessions Across Tabs
**Problem**: Users could log in on one tab and access the system on another tab without credentials.

**Solution**:
- HTTPOnly cookies with proper expiry prevent unauthorized session sharing
- Each tab must have valid cookies; opening new tabs requires authentication
- Session validation on every protected route via `checkAuth()`

**Files Changed**:
- `backend/app/core/deps.py` - Cookie-based authentication ensures proper session control
- `frontend/lib/auth-store.ts` - Validates session on hydration and route access

### 5. Admin-Only Retrain Controls
**Problem**: Both super_admin and ml_engineer could toggle auto-train settings.

**Solution**:
- Auto-train toggle now visible only to `super_admin` users
- Backend endpoint already protected with `require_roles("super_admin")`
- Frontend conditionally renders the control based on user role

**Files Changed**:
- `frontend/app/dashboard/settings/page.tsx` - Added `isAdmin` check to show/hide toggle
- `backend/app/api/v1/ml.py` - POST endpoint already requires super_admin

## 📋 Configuration Changes

### Backend Environment Variables (.env)
```env
# Session settings (add these if not present)
ACCESS_TOKEN_EXPIRE_MINUTES=15
SESSION_INACTIVITY_TIMEOUT_MINUTES=15
COOKIE_SECURE=False  # Set to True in production with HTTPS
COOKIE_SAMESITE=lax  # Options: 'lax', 'strict', or 'none'
```

### Cookie Security Settings
- **Development**: `COOKIE_SECURE=False` (HTTP allowed)
- **Production**: `COOKIE_SECURE=True` (HTTPS required)
- **SameSite**: `lax` (allows navigation from external sites but blocks CSRF)

## 🧪 Testing Checklist

- [ ] Login works and sets HTTPOnly cookies in browser DevTools
- [ ] Access token expires after 15 minutes
- [ ] User auto-logout after 15 minutes of no activity
- [ ] User logout when closing browser/tab
- [ ] Cannot access authenticated pages in new tab without login
- [ ] Only super_admin sees the "Model Training Mode" toggle
- [ ] Non-admin users see upload section only
- [ ] Refresh token automatically refreshes expired access token
- [ ] CORS allows credentials from frontend domain

## 🚀 Deployment Notes

1. **Update .env file** with the new session configuration variables
2. **Enable HTTPS in production** and set `COOKIE_SECURE=True`
3. **Test cookie transmission** - ensure frontend and backend domains allow credentials
4. **Monitor session expiry** - 15 minutes may need adjustment based on usage patterns
5. **Restart backend** after updating environment variables

## 🔄 Migration Steps

For existing users already logged in:

1. Deploy backend changes first
2. Clear all existing localStorage tokens (users will be logged out once)
3. Deploy frontend changes
4. Users will need to log in again (one-time)
5. New sessions will use HTTPOnly cookies automatically

## 📝 API Changes

### Login Response
**Before**: Returns tokens in JSON body
```json
{
  "access_token": "...",
  "refresh_token": "...",
  "user_id": 1,
  ...
}
```

**After**: Returns user info only, tokens in HTTPOnly cookies
```json
{
  "user_id": 1,
  "email": "user@example.com",
  "role": "super_admin",
  "full_name": "...",
  "message": "Login successful"
}
```

### Refresh Token Endpoint
**Before**: 
- POST `/auth/refresh` with `{ "refresh_token": "..." }` in body
- Returns `{ "access_token": "..." }`

**After**:
- POST `/auth/refresh` with refresh_token cookie
- Returns `{ "message": "Token refreshed" }` and sets new access_token cookie

### Logout Endpoint
**Before**: Returns success message only

**After**: Returns success message and clears both cookies

## 🔍 Security Audit

| Security Issue | Status | Solution |
|---------------|--------|----------|
| XSS token theft via localStorage | ✅ Fixed | HTTPOnly cookies |
| Indefinite session persistence | ✅ Fixed | 15-min inactivity timeout |
| Session sharing across tabs | ✅ Fixed | Proper cookie-based auth |
| No logout on browser close | ✅ Fixed | beforeunload event |
| Non-admin ML retraining | ✅ Fixed | Admin-only UI controls |
| CSRF protection | ✅ Implemented | SameSite cookie attribute |

## 📚 Additional Recommendations

1. **Consider implementing session tracking** - Store active sessions in Redis with unique session IDs
2. **Add rate limiting** - Prevent brute force login attempts
3. **Implement MFA for all admins** - Already partially supported, make mandatory
4. **Add session management UI** - Allow users to view and revoke active sessions
5. **Audit logging** - Already implemented, ensure it captures all auth events
6. **Regular security reviews** - Test auth flow quarterly

## 🐛 Known Limitations

1. **Tab close detection**: `beforeunload` may not fire reliably in all browsers (mobile browsers especially)
2. **Inactivity in background tabs**: Browser may throttle timers in background tabs
3. **Clock synchronization**: Token expiry depends on server/client clock sync

## 📞 Support

For questions or issues with these changes:
1. Check browser console for authentication errors
2. Verify cookies are being set (DevTools → Application → Cookies)
3. Confirm `withCredentials: true` in all API requests
4. Ensure backend CORS settings allow credentials from frontend domain
