# 🚀 Quick Start - Authentication Fixes

## What Changed?
1. ✅ HTTPOnly cookies (no more localStorage tokens)
2. ✅ 15-minute inactivity auto-logout
3. ✅ Logout on browser/tab close
4. ✅ No session sharing across tabs
5. ✅ Admin-only retrain toggle

## 🏃 Quick Deploy (3 Steps)

### Step 1: Update Backend Environment
Add to `backend/.env`:
```env
ACCESS_TOKEN_EXPIRE_MINUTES=15
SESSION_INACTIVITY_TIMEOUT_MINUTES=15
COOKIE_SECURE=False  # Use True in production with HTTPS
COOKIE_SAMESITE=lax
```

### Step 2: Restart Services
```bash
# Backend
cd backend
# Stop and restart your backend server (uvicorn, gunicorn, etc.)

# Frontend
cd frontend
npm run build  # if production
# Restart your Next.js server
```

### Step 3: Test Login
1. Login to application
2. Check cookies in DevTools (should see `access_token` and `refresh_token` with HTTPOnly flag)
3. Wait 15 min idle → auto-logout ✅
4. Close tab and reopen → requires login ✅

## ✅ Verify Everything Works

**Check 1: Cookies are HTTPOnly**
```
DevTools → Application → Cookies → Check HTTPOnly column
```

**Check 2: Inactivity logout works**
```
Login → Wait 15 minutes → Try to navigate → Should redirect to login
```

**Check 3: Admin-only toggle**
```
Login as admin → Settings page → See "Model Training Mode" section
Login as non-admin → Settings page → Section hidden
```

**Check 4: No cross-tab sharing**
```
Login on Tab A → Open Tab B → Navigate to app → Requires login on Tab B
```

## 🐛 Troubleshooting

**Issue**: "Not authenticated" errors
- **Fix**: Check if `withCredentials: true` in API client
- Verify CORS allows credentials
- Clear browser cookies and login again

**Issue**: Cookies not being set
- **Fix**: Check backend is running and `/auth/login` returns cookies
- Verify response headers include `Set-Cookie`
- Check browser isn't blocking cookies

**Issue**: Admin toggle not showing
- **Fix**: Verify user role is `super_admin` (not `ml_engineer`)
- Check `/auth/me` response includes correct role

## 📞 Need Help?

See full documentation:
- `CHANGES_SUMMARY.md` - Detailed changes and testing guide
- `AUTHENTICATION_FIXES.md` - Complete security documentation

---

**Status**: ✅ All authentication and authorization issues fixed!
