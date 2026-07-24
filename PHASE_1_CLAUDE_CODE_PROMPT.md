# Phase 1 HeroTime Rebranding — Claude Code Chunked Prompt

This is a step-by-step prompt designed for Claude Code to execute Phase 1 in manageable chunks. Each chunk can be run independently and tested before moving to the next.

---

## CHUNK 1: Frontend Logo & Brand Constants

**Goal:** Update logo component and create brand constants file  
**Duration:** 30 min  
**Files to modify:** 2  
**Risk:** LOW

### Instructions

1. **Create brand constants file:**
   - File: `apps/web/lib/constants.ts`
   - Add the following:
   ```typescript
   export const BRAND_NAME = 'HeroTime';
   export const BRAND_FULL_NAME = 'HeroTime Platform';
   export const BRAND_EMAIL_SENDER = 'HeroTime Team';
   ```

2. **Update Logo Component:**
   - File: `apps/web/components/brand/Logo.tsx`
   - Find the text element that displays "Time|Forge"
   - Change it to "Hero|Time"
   - Update any aria-labels or titles that reference "TimeForge"
   - Ensure the visual proportions still look good

3. **Test:**
   ```bash
   cd apps/web
   npm run dev
   # Navigate to http://localhost:3001
   # Verify logo shows "Hero|Time" text
   # Check that logo is centered and looks good
   ```

4. **Success criteria:**
   - [ ] Logo component renders without errors
   - [ ] "Hero|Time" text displays correctly
   - [ ] No console errors in browser dev tools
   - [ ] Logo is clickable and navigates home

---

## CHUNK 2: Page Titles & Metadata

**Goal:** Update all page titles to show "HeroTime"  
**Duration:** 30 min  
**Files to modify:** 2-5  
**Risk:** LOW

### Instructions

1. **Update main layout title:**
   - File: `apps/web/app/layout.tsx`
   - Find line ~21 with `title: 'TimeForge'`
   - Change to `title: 'HeroTime'`

2. **Find and replace metadata:**
   ```bash
   cd apps/web
   grep -r "TimeForge" --include="*.tsx" | grep -i "title\|metadata\|name"
   ```
   - Update each occurrence to "HeroTime"
   - Common locations: page.tsx files in different routes

3. **Test:**
   ```bash
   npm run dev
   # Navigate to http://localhost:3001
   # Check browser tab title — should say "HeroTime"
   # Visit different pages (dashboard, profile, etc.)
   # Verify all page titles updated
   ```

4. **Success criteria:**
   - [ ] Browser tab shows "HeroTime"
   - [ ] All page titles updated
   - [ ] No console errors
   - [ ] Navigation between pages maintains correct title

---

## CHUNK 3: Frontend UI Text — Bulk Replace

**Goal:** Replace all hardcoded "TimeForge" strings with BRAND_NAME constant  
**Duration:** 2 hours  
**Files to modify:** 50+ files  
**Risk:** MEDIUM (large scope, but repetitive)

### Instructions

1. **Find all TimeForge references:**
   ```bash
   cd apps/web
   grep -r "TimeForge" --include="*.tsx" --include="*.ts" | wc -l
   # Should return ~50-60 results
   ```

2. **Prioritize files (do in this order):**
   - High-priority (user-facing):
     - `apps/web/features/auth/components/AuthAside.tsx`
     - `apps/web/features/auth/components/SupportModal.tsx`
     - `apps/web/app/support/page.tsx`
     - `apps/web/features/admin/components/AiConfigContent.tsx`
   
   - Medium-priority (app-wide):
     - Any component with visible "TimeForge" text
     - Check: dashboard, profile, settings pages

3. **For each file:**
   - Add import at top: `import { BRAND_NAME } from '@/lib/constants';`
   - Find: `"TimeForge"` 
   - Replace with: `{BRAND_NAME}`
   - Save and test

4. **Automated batch replace (optional):**
   ```bash
   # Use VS Code Find & Replace (Ctrl+H):
   # Find: "TimeForge"
   # Replace: {BRAND_NAME}
   # Review each replacement before confirming
   ```

5. **Test:**
   ```bash
   npm run dev
   # Search UI for any visible "TimeForge" text
   # Should find none (except in code comments)
   # Check auth pages, support modal, admin panel
   ```

6. **Success criteria:**
   - [ ] No visible "TimeForge" text in UI
   - [ ] All pages load without errors
   - [ ] BRAND_NAME imported in modified files
   - [ ] No console errors

---

## CHUNK 4: Swagger Documentation (API)

**Goal:** Update Swagger docs title to "HeroTime API"  
**Duration:** 15 min  
**Files to modify:** 1-2  
**Risk:** LOW

### Instructions

1. **Update Swagger title:**
   - File: `apps/api/src/main.ts`
   - Find line ~48: `.setTitle('TimeForge API')`
   - Change to: `.setTitle('HeroTime API')`

2. **Update console logs (optional):**
   - File: `apps/api/src/main.ts` (lines 60-61)
   - Find: `console.log('TimeForge API running...')`
   - Change to: `console.log('HeroTime API running...')`

3. **Test:**
   ```bash
   npm run start:api
   # Navigate to http://localhost:3000/api/docs
   # Verify title shows "HeroTime API"
   # Check that all endpoints are still there (unchanged)
   # Verify "Authentication" section present
   ```

4. **Success criteria:**
   - [ ] Swagger title shows "HeroTime API"
   - [ ] All endpoints present (no deletions)
   - [ ] Authentication scheme unchanged
   - [ ] API starts without errors

---

## CHUNK 5: Email Configuration

**Goal:** Update email sender branding  
**Duration:** 20 min  
**Files to modify:** 2  
**Risk:** LOW

### Instructions

1. **Update .env.example:**
   - File: `.env.example`
   - Find line ~75: `SMTP_FROM=TimeForge Team <...>`
   - Change to: `SMTP_FROM=HeroTime Team <noreply@timeforge.com>`
   - Note: Keep the email address the same (noreply@timeforge.com)

2. **Update configuration defaults:**
   - File: `apps/api/src/config/configuration.ts`
   - Find line ~60: `smtpFrom: 'TimeForge Team <...>'`
   - Change to: `smtpFrom: 'HeroTime Team <noreply@timeforge.com>'`

3. **Test (optional, requires email setup):**
   ```bash
   # If SMTP configured locally, trigger password reset
   # Check email sender name shows "HeroTime Team"
   # Verify email content unchanged
   ```

4. **Success criteria:**
   - [ ] .env.example updated
   - [ ] configuration.ts updated
   - [ ] Email sender name shows "HeroTime Team"
   - [ ] Email address unchanged (noreply@timeforge.com)

---

## CHUNK 6: Backend Build & API Test

**Goal:** Verify API builds and endpoints work correctly  
**Duration:** 45 min  
**Files to modify:** 0 (testing only)  
**Risk:** VERIFICATION

### Instructions

1. **Build backend:**
   ```bash
   cd apps/api
   npm run build
   # Should complete with no errors
   ```

2. **Start API:**
   ```bash
   npm run start:api
   # Should see: "HeroTime API running on http://localhost:3000/api"
   # Should see: "Swagger UI available at http://localhost:3000/api/docs"
   ```

3. **Test API endpoints:**
   ```bash
   # Test authentication
   curl -X POST http://localhost:3000/api/v1/auth/login \
     -H "Content-Type: application/json" \
     -d '{"email":"admin@demo.test","password":"ChangeMe123!"}'
   # Should return JWT token

   # Test user endpoint
   curl http://localhost:3000/api/v1/users/me \
     -H "Authorization: Bearer <YOUR_TOKEN>"
   # Should return user data

   # Test time entries
   curl http://localhost:3000/api/v1/time-entries \
     -H "Authorization: Bearer <YOUR_TOKEN>"
   # Should return entries list
   ```

4. **Verify Swagger:**
   - Navigate to http://localhost:3000/api/docs
   - Verify title: "HeroTime API"
   - Verify endpoints: `/auth/login`, `/users/me`, `/time-entries` (unchanged)
   - Verify response schemas unchanged

5. **Success criteria:**
   - [ ] API builds without errors
   - [ ] API starts with "HeroTime API" message
   - [ ] Swagger docs accessible with correct title
   - [ ] Authentication flow works
   - [ ] Sample endpoints return data
   - [ ] Response formats unchanged

---

## CHUNK 7: Frontend Build & Full Test

**Goal:** Verify frontend builds and all UI changes work  
**Duration:** 45 min  
**Files to modify:** 0 (testing only)  
**Risk:** VERIFICATION

### Instructions

1. **Build frontend:**
   ```bash
   npm --prefix apps/web run build
   # Should complete with no errors
   # Should show: "✓ 50 items compiled successfully"
   ```

2. **Start frontend dev server:**
   ```bash
   npm --prefix apps/web run dev
   # Navigate to http://localhost:3001
   ```

3. **Run verification checklist:**
   - [ ] Logo displays "Hero|Time"
   - [ ] Page title (browser tab) shows "HeroTime"
   - [ ] No visible "TimeForge" text on homepage
   - [ ] Auth pages show new branding
   - [ ] Support modal (if visible) shows new branding
   - [ ] All pages load without 404 errors
   - [ ] No console errors
   - [ ] Navigation between pages works

4. **Test authentication flow:**
   ```bash
   # Use: admin@demo.test / ChangeMe123!
   # - Login succeeds
   # - Redirected to dashboard
   # - User menu shows avatar + name
   # - Logout works
   ```

5. **Success criteria:**
   - [ ] Frontend builds without errors
   - [ ] Logo shows "Hero|Time"
   - [ ] Page title shows "HeroTime"
   - [ ] No "TimeForge" text visible
   - [ ] No console errors
   - [ ] Authentication flow works
   - [ ] All pages accessible

---

## CHUNK 8: Documentation & Seed Data

**Goal:** Update project documentation and seed data  
**Duration:** 30 min  
**Files to modify:** 3  
**Risk:** LOW

### Instructions

1. **Update README:**
   - File: `README.md`
   - Find: `# TimeForge` (line 1)
   - Replace with: `# HeroTime`
   - Find: `TimeForge is a...` (line 3)
   - Replace with: `HeroTime is a...`
   - Search for other "TimeForge" references and update

2. **Update CLAUDE.md:**
   - File: `CLAUDE.md`
   - Find: `# TimeForge — Project Status Snapshot`
   - Replace with: `# HeroTime — Project Status Snapshot`
   - Update any other references to TimeForge in content

3. **Update Seed Data:**
   - File: `prisma/seed.ts`
   - Find line ~289: `name: 'TimeForge Platform'`
   - Replace with: `name: 'HeroTime Platform'`

4. **Reseed database (optional, dev only):**
   ```bash
   npm run db:seed
   # Should complete successfully
   # Check admin panel to verify org name changed
   ```

5. **Success criteria:**
   - [ ] README updated
   - [ ] CLAUDE.md updated
   - [ ] seed.ts updated
   - [ ] No "TimeForge" in primary docs
   - [ ] Seed data regenerated (if applicable)

---

## CHUNK 9: Staging Deployment Test

**Goal:** Deploy all changes to staging and verify end-to-end  
**Duration:** 1 hour  
**Files to modify:** 0 (deployment only)  
**Risk:** FINAL VERIFICATION

### Instructions

1. **Commit all changes:**
   ```bash
   git checkout -b feature/phase-1-rebranding
   git add .
   git commit -m "Phase 1: Rebrand TimeForge to HeroTime"
   git push origin feature/phase-1-rebranding
   ```

2. **Deploy to staging:**
   ```bash
   # Your deployment process (e.g., via CI/CD)
   # Builds API, Worker, Web
   # Deploys to staging environment
   ```

3. **Full staging verification:**
   - Navigate to staging frontend URL
   - [ ] Logo shows "Hero|Time"
   - [ ] Page title shows "HeroTime"
   - [ ] No visible "TimeForge" text
   - [ ] Login works
   - [ ] Dashboard loads
   - [ ] Navigate through app
   - [ ] Check staging Swagger docs at `/api/docs`
   - [ ] Title shows "HeroTime API"
   - [ ] Test 3-5 API endpoints
   - [ ] Check logs for errors
   - [ ] Monitor performance metrics

4. **Browser testing (if applicable):**
   ```bash
   # Test on multiple browsers/devices
   - Chrome/Edge (desktop)
   - Firefox (desktop)
   - Safari (if available)
   - Mobile (responsive design)
   ```

5. **Success criteria:**
   - [ ] Staging deployment successful
   - [ ] Frontend loads correctly
   - [ ] Logo displays properly
   - [ ] No visible "TimeForge" text
   - [ ] API docs show "HeroTime API"
   - [ ] Authentication works
   - [ ] No errors in logs
   - [ ] Performance metrics normal
   - [ ] Team approves changes

---

## CHUNK 10: Production Deployment (Final)

**Goal:** Deploy to production  
**Duration:** 30 min  
**Files to modify:** 0 (deployment only)  
**Risk:** PRODUCTION (low risk, but requires care)

### Instructions

1. **Pre-deployment checklist:**
   - [ ] All staging tests passed
   - [ ] Product team approves
   - [ ] Rollback plan documented
   - [ ] Team notified
   - [ ] Monitoring dashboards open

2. **Production deployment:**
   ```bash
   # Merge to main
   git checkout main
   git merge feature/phase-1-rebranding

   # Tag release
   git tag -a v1.X.X -m "Phase 1: HeroTime Rebranding"
   git push origin main --tags

   # Deploy (your CI/CD)
   # Monitor deployment logs
   ```

3. **Post-deployment verification:**
   - [ ] Frontend loads with new logo
   - [ ] Page title shows "HeroTime"
   - [ ] Swagger docs at `/api/docs` show "HeroTime API"
   - [ ] Authentication works
   - [ ] No 404 errors in logs
   - [ ] No auth errors in logs
   - [ ] API response times normal
   - [ ] Users can log in and use app

4. **Monitor for 1 hour:**
   ```bash
   # Watch logs for any errors
   # Monitor error tracking (if configured)
   # Check user feedback channels
   ```

5. **Rollback procedure (if needed):**
   ```bash
   git revert <merge-commit-hash> --no-edit
   git push origin main
   # Re-deploy (automatic via CI/CD)
   # Time to recover: <5 minutes
   ```

6. **Success criteria:**
   - [ ] Production deployment complete
   - [ ] Frontend shows new branding
   - [ ] API works correctly
   - [ ] No critical errors
   - [ ] Users report no issues
   - [ ] Announce to team/users

---

## Summary Table

| Chunk | Task | Time | Risk | Files |
|-------|------|------|------|-------|
| 1 | Logo & constants | 30 min | LOW | 2 |
| 2 | Page titles | 30 min | LOW | 2-5 |
| 3 | UI text | 2 hrs | MEDIUM | 50+ |
| 4 | Swagger docs | 15 min | LOW | 1-2 |
| 5 | Email config | 20 min | LOW | 2 |
| 6 | API build & test | 45 min | VERIFY | 0 |
| 7 | Frontend build & test | 45 min | VERIFY | 0 |
| 8 | Docs & seed | 30 min | LOW | 3 |
| 9 | Staging deploy | 1 hour | FINAL | 0 |
| 10 | Production deploy | 30 min | PROD | 0 |
| **TOTAL** | | **~7-8 hours** | **LOW** | |

---

## Commands Quick Reference

```bash
# Start development
npm install
npx prisma generate
npm run start:api
npm run start:worker
npm --prefix apps/web run dev

# Build
npm run build
npm --prefix apps/web run build

# Test API
curl http://localhost:3000/api/docs

# Test frontend
# Navigate to http://localhost:3001

# Commit & push
git checkout -b feature/phase-1-rebranding
git add .
git commit -m "Phase 1: Rebrand to HeroTime"
git push origin feature/phase-1-rebranding

# Merge to main
git checkout main
git merge feature/phase-1-rebranding
git tag -a v1.X.X -m "Phase 1: HeroTime Rebranding"
git push origin main --tags
```

---

## Notes

- Each chunk is independent and can be reviewed before moving to the next
- Chunks 6-7 are verification only (no file changes)
- Chunks 9-10 require access to deployment system
- Rollback is always available until production merge
- No database migrations required
- No API contract changes

Ready to start? Begin with **CHUNK 1**.
