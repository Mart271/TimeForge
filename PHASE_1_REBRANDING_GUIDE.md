# HeroTime Rebranding — Phase 1 Implementation Guide

**Duration:** 2-3 days | **Risk:** LOW | **Rollback Time:** <5 minutes

This guide covers the safe, UI-only rebranding from "TimeForge" to "HeroTime". No database changes, no API changes, no infrastructure changes.

---

## Overview

### What's Being Changed
- Frontend UI text and branding
- Page titles and metadata
- Logo and favicon
- Swagger documentation title (backend-only, no API changes)
- Email template branding text

### What's NOT Being Changed (Critical)
- Database name (`timeforge` stays as-is)
- Database roles (`timeforge_owner`, `timeforge_app` unchanged)
- API endpoints (`/api/v1` unchanged)
- API response schemas (unchanged)
- JWT/Authentication structure (unchanged)
- Environment variable names (unchanged)
- Storage bucket names (unchanged)

---

## Implementation Checklist

### STEP 1: Frontend Logo & Assets (1 day)

#### 1.1 Replace Logo Component
**File:** `apps/web/components/brand/Logo.tsx`

```typescript
// UPDATE: Change wordmark from "Time|Forge" to "Hero|Time"
// Line 51-52: Change text content
// Line 59-60: Update aria-label and title

// Current (example):
<text x="85" y="20">Time|Forge</text>

// New:
<text x="85" y="20">Hero|Time</text>
```

**Action:** Update the SVG text content to display "Hero|Time" instead of "Time|Forge"

---

#### 1.2 Update Favicon
**File:** `apps/web/app/favicon.ico`

**Action:** Replace with new HeroTime favicon (if you have one). If not, skip this for now.

---

#### 1.3 Update App Icon
**File:** `apps/web/app/icon.svg`

**Action:** Replace SVG logo asset with HeroTime branding

---

#### 1.4 Create Brand Constants File (if doesn't exist)
**File:** `apps/web/lib/constants.ts`

**Add this:**
```typescript
export const BRAND_NAME = 'HeroTime';
export const BRAND_FULL_NAME = 'HeroTime Platform';
export const BRAND_EMAIL_SENDER = 'HeroTime Team';
```

---

### STEP 2: Page Titles & Metadata (0.5 day)

#### 2.1 Main Layout Title
**File:** `apps/web/app/layout.tsx`

**Find (around line 21):**
```typescript
title: 'TimeForge',
```

**Replace with:**
```typescript
title: 'HeroTime',
```

---

#### 2.2 Search for All Hardcoded Page Titles
**Terminal command:**
```bash
cd apps/web
grep -r "TimeForge" --include="*.tsx" --include="*.ts" | grep -i "title\|metadata\|name"
```

**Expected results:** 5-10 instances in page files. Update each to "HeroTime"

---

### STEP 3: Frontend UI Text Replacement (1 day)

#### 3.1 Centralize Brand References
**All hardcoded "TimeForge" strings should be replaced with `BRAND_NAME` constant**

**Files to update (52 files identified in repo):**

**High-Priority (user-facing):**
- `apps/web/features/auth/components/AuthAside.tsx` — Auth page branding
- `apps/web/features/auth/components/SupportModal.tsx` — Help/support text
- `apps/web/app/support/page.tsx` — Support page messaging
- `apps/web/features/admin/components/AiConfigContent.tsx` — Admin panel text

**Medium-Priority (app-wide):**
- All components with `"TimeForge"` hardcoded strings
- Email template text (if any in frontend)

**Action:**
```bash
# Find all TimeForge references in frontend
cd apps/web
grep -r "TimeForge" --include="*.tsx" --include="*.ts" | head -30

# Replace systematically:
# 1. Import BRAND_NAME in file
import { BRAND_NAME } from '@/lib/constants';

# 2. Replace hardcoded string with variable
// Before:
<h1>Welcome to TimeForge</h1>

// After:
<h1>Welcome to {BRAND_NAME}</h1>
```

**Batch Replace (if your editor supports it):**
- Use VS Code Find & Replace (Ctrl+H)
- Find: `"TimeForge"`
- Replace with: `{BRAND_NAME}`
- Review each replacement

---

### STEP 4: Swagger Documentation (Backend) (0.5 day)

#### 4.1 Update Swagger Title
**File:** `apps/api/src/main.ts`

**Find (around line 48):**
```typescript
.setTitle('TimeForge API')
```

**Replace with:**
```typescript
.setTitle('HeroTime API')
```

---

#### 4.2 Update Console Logs (Optional)
**File:** `apps/api/src/main.ts` (lines 60-61)

**Find:**
```typescript
console.log(`TimeForge API running on http://localhost:${port}/api`);
```

**Replace with:**
```typescript
console.log(`HeroTime API running on http://localhost:${port}/api`);
```

---

### STEP 5: Email Branding (0.5 day)

#### 5.1 Update Email Configuration
**File:** `.env.example`

**Find (line ~75):**
```
SMTP_FROM=TimeForge Team <noreply@timeforge.com>
```

**Replace with:**
```
SMTP_FROM=HeroTime Team <noreply@timeforge.com>
```

---

#### 5.2 Update Configuration Reference
**File:** `apps/api/src/config/configuration.ts`

**Find (line ~60):**
```typescript
smtpFrom: process.env.SMTP_FROM || 'TimeForge Team <noreply@timeforge.com>',
```

**Replace with:**
```typescript
smtpFrom: process.env.SMTP_FROM || 'HeroTime Team <noreply@timeforge.com>',
```

---

#### 5.3 Update Email Templates (if any hardcoded)
**Search for files:**
```bash
grep -r "TimeForge Team" apps/api/src --include="*.html" --include="*.ts"
```

**Replace template text with constant reference if possible**

---

### STEP 6: Documentation & Seed Data (0.5 day)

#### 6.1 Update README
**File:** `README.md`

**Find:**
```markdown
# TimeForge
TimeForge is a...
```

**Replace with:**
```markdown
# HeroTime
HeroTime is a...
```

---

#### 6.2 Update CLAUDE.md
**File:** `CLAUDE.md`

**Find:**
```markdown
# TimeForge — Project Status Snapshot
```

**Replace with:**
```markdown
# HeroTime — Project Status Snapshot
```

**Also update any references in the content to HeroTime**

---

#### 6.3 Update Seed Data
**File:** `prisma/seed.ts`

**Find (line ~289):**
```typescript
name: 'TimeForge Platform'
```

**Replace with:**
```typescript
name: 'HeroTime Platform'
```

**Action:** After making this change, reseed the database:
```bash
npm run db:seed
```

---

### STEP 7: Verification

#### 7.1 Build & Test
```bash
# Install dependencies
npm install

# Generate Prisma client
npx prisma generate

# Build API
npm run build

# Build Web
npm --prefix apps/web run build

# Check for any build errors related to missing imports or typos
```

---

#### 7.2 Start Development Servers
```bash
# Terminal 1
npm run start:api

# Terminal 2 (new terminal)
npm run start:worker

# Terminal 3 (new terminal)
npm --prefix apps/web run dev
```

---

#### 7.3 Verification Checklist

- [ ] **Frontend Logo**
  - [ ] Navigate to `http://localhost:3001`
  - [ ] Logo displays "Hero|Time" text
  - [ ] Logo is clickable and navigates home

- [ ] **Page Titles**
  - [ ] Browser tab title shows "HeroTime"
  - [ ] Check multiple pages (dashboard, profile, etc.)
  - [ ] Metadata SEO tags updated

- [ ] **UI Text**
  - [ ] No visible "TimeForge" text in UI
  - [ ] Check auth pages, support modal, admin panel
  - [ ] Check all tooltips and help text

- [ ] **Swagger Documentation**
  - [ ] Navigate to `http://localhost:3000/api/docs`
  - [ ] Title shows "HeroTime API"
  - [ ] All endpoints still present and unchanged
  - [ ] Authentication section unchanged

- [ ] **Authentication Flow**
  - [ ] Login with `admin@demo.test` / `ChangeMe123!`
  - [ ] Token generated successfully
  - [ ] JWT structure unchanged
  - [ ] Token refresh works

- [ ] **API Endpoints (Sample)**
  - [ ] GET `/api/v1/users/me` → responds with user data
  - [ ] GET `/api/v1/time-entries` → returns entries
  - [ ] POST `/api/v1/time-entries` → creates entry
  - [ ] Response schemas unchanged

- [ ] **Email Branding**
  - [ ] Trigger a password reset (if auth supports it)
  - [ ] Check email sender shows "HeroTime Team"
  - [ ] Email content unchanged

- [ ] **Worker Jobs**
  - [ ] Trigger an async job (export, report, etc.)
  - [ ] Job appears in Redis queue
  - [ ] Job completes without errors

- [ ] **Console Logs**
  - [ ] API startup log shows "HeroTime API running..."
  - [ ] No errors in browser console
  - [ ] No warnings related to missing imports

---

## Deployment Checklist

### Pre-Deployment

- [ ] All files committed to git branch `feature/phase-1-rebranding`
- [ ] All tests pass (if applicable)
- [ ] Staging environment deployed successfully
- [ ] All verification checks passed in staging
- [ ] Product team approves branding changes
- [ ] Rollback plan documented (revert commit + redeploy)

### Production Deployment

- [ ] Database backup taken (standard pre-deploy procedure)
- [ ] Team notified of deployment window
- [ ] Monitoring dashboards open
- [ ] Slack notification ready

**Deployment Steps:**
```bash
# 1. Merge branch to main
git checkout main
git merge feature/phase-1-rebranding

# 2. Tag release
git tag -a v1.X.X -m "Phase 1: HeroTime Rebranding"
git push origin main --tags

# 3. Deploy to production (your CI/CD process)
# Example (adjust for your setup):
# - Docker build
# - Push to container registry
# - Restart services

# 4. Verify in production
# - Check frontend at https://your-domain.com
# - Check API docs at https://your-domain.com/api/docs
# - Test login flow
# - Monitor logs for errors
```

### Post-Deployment

- [ ] Frontend loads with new logo
- [ ] Page titles show "HeroTime"
- [ ] Swagger docs show "HeroTime API"
- [ ] No 404 errors in logs
- [ ] No auth errors in logs
- [ ] API response times normal
- [ ] Users report no issues

---

## Rollback Procedure (if needed)

**If anything breaks in production:**

```bash
# 1. Identify the problematic commit
git log --oneline | head -5

# 2. Revert all Phase 1 changes
git revert <commit-hash> --no-edit

# 3. Redeploy to production
# (your CI/CD pipeline)

# Time to recover: <5 minutes
```

**After rollback:**
- System is back to "TimeForge" branding
- All data preserved
- No schema changes to revert
- No environment variables to fix

---

## File Summary

### Files Modified (Frontend)
- `apps/web/components/brand/Logo.tsx`
- `apps/web/app/layout.tsx`
- `apps/web/app/icon.svg`
- `apps/web/app/favicon.ico` (optional)
- `apps/web/lib/constants.ts` (create if needed)
- ~50 component files with hardcoded "TimeForge" strings

### Files Modified (Backend)
- `apps/api/src/main.ts`
- `apps/api/src/config/configuration.ts`
- `.env.example`
- `prisma/seed.ts`

### Files Modified (Documentation)
- `README.md`
- `CLAUDE.md`

### Files NOT Modified (Critical)
- Database schema (no changes)
- API routes (no changes)
- JWT structure (no changes)
- Environment variable names (no changes)
- Storage configuration (no changes)

---

## Estimated Timeline

| Task | Duration | Notes |
|------|----------|-------|
| Logo & assets | 4 hours | Update SVG text + assets |
| UI text replacement | 4 hours | Batch find-and-replace |
| Page titles | 1 hour | Search + replace |
| Backend branding | 1 hour | Swagger + config |
| Email templates | 1 hour | SMTP sender name |
| Documentation | 1 hour | README + CLAUDE.md |
| Testing | 2 hours | Verify checklist |
| Staging deployment | 1 hour | Build + test in staging |
| Production deployment | 1 hour | Build + deploy + monitor |
| **Total** | **~15-16 hours** | Spread over 2-3 days |

---

## Notes

- **No database downtime required** — Schema unchanged
- **No client updates needed** — API contracts preserved
- **Safe to merge on Friday** — Low risk, easy rollback if issues emerge over weekend
- **Monitor for 1 hour post-deploy** — Unlikely issues but standard practice
- **Announce to users:** "We're excited to introduce HeroTime! The platform has been rebranded for clarity and impact. No action required. All your accounts, data, and integrations remain unchanged."

---

## Questions?

If anything is unclear:
1. Check the verification checklist — step-by-step validation
2. Refer back to the original rebranding plan (PHASE_1_REBRANDING_GUIDE.md)
3. Rollback is always available (revert commit + redeploy)

Good luck! 🚀
