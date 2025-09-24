# 🎯 **STREAMLINED MIGRATION PLAN - FBC_masterV5**

## **📋 WHAT WE'RE MIGRATING**

Based on your requirements:
- ✅ **Keep current chat interface** (Week 2 - NOT needed)
- ✅ **AI SDK Tools already exist** (Week 5 - NOT needed)
- 🎯 **Focus on these 3 phases:**

---

## **🚀 MIGRATION PHASES**

### **Phase 1: Intelligence System Foundation**
**Branch:** `intelligence-system`  
**Timeline:** Week 1  
**Status:** Ready to start

**What we're copying:**
```bash
# Core intelligence engine
src/core/intelligence/
src/core/context/
app/api/intelligence/
```

**Files to migrate:**
- `src/core/intelligence/conversational-intelligence.ts`
- `src/core/intelligence/lead-research.ts`
- `src/core/intelligence/role-detector.ts`
- `src/core/intelligence/intent-detector.ts`
- `src/core/intelligence/tool-suggestion-engine.ts`
- `src/core/context/context-storage.ts`
- `src/core/context/context-manager.ts`
- `app/api/intelligence/session-init/route.ts`
- `app/api/intelligence/lead-research/route.ts`
- `app/api/intelligence/intent/route.ts`
- `app/api/intelligence/suggestions/route.ts`
- `app/api/intelligence/context/route.ts`

---

### **Phase 2: PDF Generation System**
**Branch:** `remotes/labv2/cursor/consolidate-pdf-generation-code-and-commit-6dc1`  
**Timeline:** Week 2  
**Status:** After Phase 1 testing

**What we're copying:**
```bash
# PDF generation system
lib/pdf-generator.ts
app/api/send-pdf-summary/
app/api/export-summary/
```

**Files to migrate:**
- `lib/pdf-generator.ts` (850+ lines)
- `app/api/send-pdf-summary/route.ts`
- `app/api/export-summary/route.ts`

---

### **Phase 3: Admin Dashboard**
**Branch:** `remotes/labv2/cursor/analyze-and-test-admin-dashboard-functionality-d20a`  
**Timeline:** Week 3  
**Status:** After Phase 2 testing

**What we're copying:**
```bash
# Admin system
app/admin/
components/admin/
hooks/useAdminAuth.ts
hooks/useAdminChat.ts
```

**Files to migrate:**
- `app/admin/page.tsx`
- `app/admin/login/page.tsx`
- `components/admin/AdminDashboard.tsx`
- `hooks/useAdminAuth.ts`
- `hooks/useAdminChat.ts`
- `app/api/admin/*` (all admin API routes)

---

## **🔧 STEP-BY-STEP MIGRATION PROCESS**

### **Phase 1: Intelligence System (Week 1)**

#### **Step 1.1: Copy Core Intelligence Files**
```bash
# Navigate to your current project
cd /Users/farzad/fbc_lab_v7/multimodal-ai-webapp

# Copy intelligence system
cp -r /Users/farzad/FBC_masterV5/src/core/intelligence src/
cp -r /Users/farzad/FBC_masterV5/src/core/context src/
cp -r /Users/farzad/FBC_masterV5/app/api/intelligence app/api/
```

#### **Step 1.2: Copy Dependencies**
```bash
# Copy required hooks
cp /Users/farzad/FBC_masterV5/hooks/useConversationalIntelligence.ts src/hooks/
cp /Users/farzad/FBC_masterV5/hooks/useIdempotency.ts src/hooks/
```

#### **Step 1.3: Update Dependencies**
```bash
# Add required packages
pnpm add @supabase/supabase-js pgvector puppeteer pdf-lib nodemailer ical-generator recharts date-fns react-hook-form lru-cache crypto-js jsonwebtoken
```

#### **Step 1.4: Test Phase 1**
```bash
# Test the intelligence system
pnpm dev
# Test: /api/intelligence/session-init
# Test: /api/intelligence/lead-research
# Test: /api/intelligence/intent
```

---

### **Phase 2: PDF Generation (Week 2)**

#### **Step 2.1: Copy PDF System**
```bash
# Copy PDF generation
cp /Users/farzad/FBC_masterV5/lib/pdf-generator.ts lib/
cp -r /Users/farzad/FBC_masterV5/app/api/send-pdf-summary app/api/
cp -r /Users/farzad/FBC_masterV5/app/api/export-summary app/api/
```

#### **Step 2.2: Test Phase 2**
```bash
# Test PDF generation
pnpm dev
# Test: /api/send-pdf-summary
# Test: /api/export-summary
```

---

### **Phase 3: Admin Dashboard (Week 3)**

#### **Step 3.1: Copy Admin System**
```bash
# Copy admin dashboard
cp -r /Users/farzad/FBC_masterV5/app/admin app/
cp -r /Users/farzad/FBC_masterV5/components/admin src/components/
cp /Users/farzad/FBC_masterV5/hooks/useAdminAuth.ts src/hooks/
cp /Users/farzad/FBC_masterV5/hooks/useAdminChat.ts src/hooks/
cp -r /Users/farzad/FBC_masterV5/app/api/admin app/api/
```

#### **Step 3.2: Test Phase 3**
```bash
# Test admin dashboard
pnpm dev
# Test: /admin
# Test: /admin/login
# Test: /api/admin/stats
```

---

## **🧪 TESTING STRATEGY**

### **After Each Phase:**

#### **Phase 1 Testing:**
```bash
# Test intelligence endpoints
curl -X POST http://localhost:3000/api/intelligence/session-init \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com", "name": "Test User"}'

# Test lead research
curl -X POST http://localhost:3000/api/intelligence/lead-research \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com"}'

# Test intent detection
curl -X POST http://localhost:3000/api/intelligence/intent \
  -H "Content-Type: application/json" \
  -d '{"text": "I need help with my business"}'
```

#### **Phase 2 Testing:**
```bash
# Test PDF generation
curl -X POST http://localhost:3000/api/send-pdf-summary \
  -H "Content-Type: application/json" \
  -d '{"sessionId": "test-session", "email": "test@example.com"}'

# Test export summary
curl -X POST http://localhost:3000/api/export-summary \
  -H "Content-Type: application/json" \
  -d '{"sessionId": "test-session"}'
```

#### **Phase 3 Testing:**
```bash
# Test admin dashboard
curl http://localhost:3000/admin
curl http://localhost:3000/api/admin/stats
```

---

## **📋 ENVIRONMENT VARIABLES NEEDED**

Add these to your `.env.local`:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Google Search
GOOGLE_SEARCH_API_KEY=your_google_search_key

# PDF Generation
PDF_USE_PUPPETEER=true

# Email
SMTP_HOST=your_smtp_host
SMTP_PORT=587
SMTP_USER=your_smtp_user
SMTP_PASS=your_smtp_pass

# Admin
ADMIN_EMAIL=your_admin_email
ADMIN_PASSWORD=your_admin_password

# Context Management
CONTEXT_CACHE_TTL=3600
EMBEDDINGS_ENABLED=true
```

---

## **🎯 SUCCESS CRITERIA**

### **Phase 1 Success:**
- ✅ Intelligence endpoints respond correctly
- ✅ Lead research works
- ✅ Intent detection works
- ✅ Context management works

### **Phase 2 Success:**
- ✅ PDF generation works
- ✅ Conversation summaries work
- ✅ Email sending works

### **Phase 3 Success:**
- ✅ Admin dashboard loads
- ✅ Admin authentication works
- ✅ Admin analytics work

---

## **🚀 READY TO START?**

**Phase 1 is ready to begin!** 

Would you like me to:
1. **Start Phase 1** (Intelligence System)?
2. **Create the migration scripts** for automated copying?
3. **Set up the testing environment** first?

**Let's begin with Phase 1!** 🎯
