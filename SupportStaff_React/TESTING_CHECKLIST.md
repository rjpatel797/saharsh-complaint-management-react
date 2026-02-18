# ✅ Testing Checklist

## 🧪 How to Verify the Implementation

### Test 1: Admin Login - Check Cookies
1. Open browser DevTools (F12)
2. Go to **Application** tab → **Cookies** → `http://localhost:5173`
3. Login as **ADMIN** (username: `admin`)
4. **Expected cookies:**
   ```
   adminToken: eyJhbGci... (admin's JWT)
   userRole: ADMIN
   userType: admin
   ```
5. ✅ **PASS** if all three cookies are present

---

### Test 2: Support Staff Login - Check Cookies
1. Logout from admin
2. Login as **SUPPORTSTAFF** (username: `rushi`)
3. Check cookies again
4. **Expected cookies:**
   ```
   adminToken: eyJhbGci... (support staff's JWT - DIFFERENT value)
   userRole: SUPPORTSTAFF
   userType: supportstaff
   ```
5. ✅ **PASS** if `adminToken` cookie exists with different value
6. ✅ **PASS** if `userRole` changed from "ADMIN" to "SUPPORTSTAFF"

---

### Test 3: Cross-Role Access Prevention (Admin → Support)
1. Login as **ADMIN**
2. In browser address bar, navigate to: `http://localhost:5173/support/dashboard`
3. **Expected behavior:**
   - Should redirect to `/support/login`
   - Should show "Access Denied" message
4. ✅ **PASS** if redirected and denied access

---

### Test 4: Cross-Role Access Prevention (Support → Admin)
1. Login as **SUPPORTSTAFF**
2. In browser address bar, navigate to: `http://localhost:5173/admin/dashboard`
3. **Expected behavior:**
   - Should redirect to `/admin/login`
   - Should show "Access Denied" message
4. ✅ **PASS** if redirected and denied access

---

### Test 5: Logout - Cookie Cleanup
1. Login as any user
2. Check cookies (should see `adminToken`, `userRole`, `userType`)
3. Click **Logout** button
4. Confirm logout in the popup
5. Check cookies again
6. **Expected:**
   - All authentication cookies should be **REMOVED**
   - `adminToken` should be **GONE**
   - `userRole` should be **GONE**
   - `userType` should be **GONE**
7. ✅ **PASS** if all cookies are cleared

---

### Test 6: Page Refresh - Session Persistence
1. Login as **ADMIN**
2. Navigate to `/admin/dashboard`
3. Press **F5** to refresh the page
4. **Expected:**
   - Should stay logged in
   - Should remain on `/admin/dashboard`
   - Should NOT redirect to login
5. ✅ **PASS** if session persists after refresh

---

### Test 7: Direct URL Access (Not Logged In)
1. Make sure you're logged out
2. In browser address bar, navigate to: `http://localhost:5173/admin/dashboard`
3. **Expected:**
   - Should redirect to `/admin/login`
   - Should NOT show dashboard
4. ✅ **PASS** if redirected to login

---

### Test 8: Token in Cookie (Both Roles Use Same Name)
1. Login as **ADMIN**
2. Open DevTools → Application → Cookies
3. Note the value of `adminToken` cookie (copy it)
4. Logout
5. Login as **SUPPORTSTAFF**
6. Check `adminToken` cookie again
7. **Expected:**
   - Cookie name is still `adminToken` ← **SAME NAME**
   - Cookie value is **DIFFERENT** (new JWT)
8. ✅ **PASS** if same cookie name, different value

---

## 📋 Quick Test Commands (Browser Console)

### Check Current Cookies:
```javascript
// View all cookies
document.cookie

// Check specific cookies
Cookies.get('adminToken')  // Should show JWT token
Cookies.get('userRole')    // Should show "ADMIN" or "SUPPORTSTAFF"
Cookies.get('userType')    // Should show "admin" or "supportstaff"
```

### Check localStorage:
```javascript
// View all localStorage
localStorage

// Check specific items
localStorage.getItem('adminToken')
localStorage.getItem('adminUsername')
localStorage.getItem('ssToken')
localStorage.getItem('ssEmployee')
```

---

## 🎯 Expected Results Summary

| Test | Expected Result |
|------|----------------|
| Admin Login | ✅ `adminToken` cookie created |
| Support Login | ✅ `adminToken` cookie updated (same name) |
| Admin → Support Panel | ✅ Redirected with "Access Denied" |
| Support → Admin Panel | ✅ Redirected with "Access Denied" |
| Logout | ✅ All cookies cleared |
| Page Refresh | ✅ Session persists |
| Direct URL (logged out) | ✅ Redirected to login |
| Cookie Name Consistency | ✅ Both roles use `adminToken` |

---

## 🐛 Troubleshooting

### Issue: Cookies not showing up
**Solution:** 
- Make sure you're checking the correct domain (`localhost:5173`)
- Clear browser cache and try again
- Check if `js-cookie` package is installed

### Issue: Getting logged out on refresh
**Solution:**
- Check if cookies are being set with correct expiration
- Verify `AuthContext` is checking cookies on mount
- Check browser console for errors

### Issue: Can access wrong panel
**Solution:**
- Check `userRole` cookie value
- Verify `ProtectedRoute` components are wrapping routes
- Check `App.jsx` for correct route protection

---

## ✅ All Tests Passed?

If all 8 tests pass, your implementation is **100% correct**! 🎉

The unified cookie system is working as expected:
- ✅ Both roles use `adminToken` cookie
- ✅ Role-based access control is working
- ✅ Logout cleans up properly
- ✅ Sessions persist across refreshes
