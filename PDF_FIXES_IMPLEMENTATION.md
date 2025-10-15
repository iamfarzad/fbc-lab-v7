# PDF Generator - Quick Implementation Guide
## Critical Fixes for F.B/c Branding

---

## 🎨 Fix #1: Correct Brand Colors (URGENT)

### File: `src/core/pdf-generator-puppeteer.ts`

#### Location 1: HTML Template Colors (Line 412)

**REPLACE THIS:**
```typescript
const palette = {
  background: '#0b0b0b',
  surface: '#121212',
  border: '#1d1d1d',
  text: '#e6e6e6',
  heading: '#f5f5f5',
  muted: '#a0a0a0',
  accent: '#f2f2f2',
  accentText: '#111111',
  highlight: '#161616'
} as const
```

**WITH THIS:**
```typescript
const palette = {
  background: '#ffffff',      // White background
  surface: '#f8f9fa',         // Light gray surface
  border: '#e5e7eb',          // Border gray
  text: '#111827',            // Dark text
  heading: '#0f172a',         // Darker heading
  muted: '#6b7280',           // Muted gray
  accent: '#ff5b04',          // F.B/c ORANGE!
  accentText: '#ffffff',      // White on orange
  highlight: '#fff7ed'        // Orange tint background
} as const
```

#### Location 2: PDF-lib Colors (Line 138)

**REPLACE THIS:**
```typescript
const writeLine = (text: string, size = 11, bold = false) => {
  page.drawText(text, {
    x: marginX,
    y: cursorY,
    size,
    font: bold ? boldFont : regularFont,
    color: rgb(0.1, 0.1, 0.1)  // ❌ Dark gray
  })
  cursorY -= lineHeight * 1.2
  ensureRoom()
}
```

**WITH THIS:**
```typescript
const writeLine = (text: string, size = 11, bold = false, isOrange = false) => {
  const textColor = isOrange 
    ? rgb(1.0, 0.356, 0.016)    // ✅ F.B/c Orange (#ff5b04)
    : rgb(0.067, 0.094, 0.157)  // ✅ Dark slate
    
  page.drawText(text, {
    x: marginX,
    y: cursorY,
    size,
    font: bold ? boldFont : regularFont,
    color: textColor
  })
  cursorY -= lineHeight * 1.2
  ensureRoom()
}
```

#### Location 3: Footer Link (Lines 256-262)

**REPLACE THIS:**
```typescript
page.drawText('www.farzadbayat.com', {
  x: marginX,
  y: 36,
  size: 10,
  font: regularFont,
  color: rgb(0.98, 0.75, 0.14)  // ❌ Wrong yellow
})
```

**WITH THIS:**
```typescript
page.drawText('www.farzadbayat.com', {
  x: marginX,
  y: 36,
  size: 10,
  font: regularFont,
  color: rgb(1.0, 0.356, 0.016)  // ✅ F.B/c Orange
})
```

#### Location 4: Update Header to Use Orange (Line 158)

**REPLACE THIS:**
```typescript
writeLine('F.B/c AI Consulting', 20, true)
writeLine('AI-Powered Lead Summary', 12)
```

**WITH THIS:**
```typescript
writeLine('F.B/c AI Consulting', 20, true, true)  // Orange title!
writeLine('AI-Powered Lead Summary', 12, false, false)
```

---

## 🖼️ Fix #2: Add F.B/c Logo to PDFs

### Step 1: Add Logo Asset

Create or copy: `public/fbc-logo.png` (recommended size: 200x60px)

### Step 2: Update PDF-lib Generator

**Add after line 120 (after font embedding):**

```typescript
// Embed F.B/c logo
let logoImage: PDFImage | null = null
try {
  const logoPath = resolveAssetPath('../../public/fbc-logo.png')
  const logoBytes = await fs.promises.readFile(logoPath)
  logoImage = await pdfDoc.embedPng(logoBytes)
} catch (error) {
  console.warn('Logo not found, skipping:', error)
}

// Add logo to first page header
if (logoImage) {
  const logoScale = 0.5
  const logoDims = logoImage.scale(logoScale)
  page.drawImage(logoImage, {
    x: marginX,
    y: cursorY,
    width: logoDims.width,
    height: logoDims.height,
  })
  cursorY -= logoDims.height + 20
}
```

### Step 3: Update HTML Template (for Puppeteer)

**Add after line 461 in `generateHtmlContent()`:**

```html
<header class="header">
  <img src="/fbc-logo.png" alt="F.B/c Logo" style="max-width: 200px; margin-bottom: 16px;" />
  <div class="badge">Personalized AI Strategy</div>
  <h1>Summary for ${leadName}</h1>
  <p>Prepared by Farzad Bayat • Session ${summaryData.sessionId}</p>
</header>
```

---

## 📧 Fix #3: Update Email Template Design

### File: `src/core/workflows/finalizeLeadSession.ts`

**REPLACE palette (Line 216):**

```typescript
const palette = {
  background: '#ffffff',        // ✅ White
  surface: '#f8f9fa',          // ✅ Light gray
  border: '#e5e7eb',           // ✅ Border
  text: '#111827',             // ✅ Dark text
  muted: '#6b7280',            // ✅ Muted
  accent: '#ff5b04',           // ✅ F.B/c ORANGE!
  accentText: '#ffffff',       // ✅ White on orange
  highlight: '#fff7ed'         // ✅ Orange tint
} as const
```

**Update header gradient (Line 241):**

```css
.header { 
  background: linear-gradient(135deg, #ff5b04 0%, #ff8040 100%); 
  color: white; 
  padding: 30px; 
  text-align: center; 
  border-radius: 12px 12px 0 0; 
}
```

**Update CTA button (Line 245):**

```css
.btn { 
  display: inline-block; 
  background: #ff5b04;        /* ✅ Orange */
  color: #ffffff; 
  padding: 12px 24px; 
  text-decoration: none; 
  border-radius: 6px; 
  margin: 20px 0; 
  font-weight: 600; 
}
.btn:hover {
  background: #e65200;        /* ✅ Darker orange on hover */
}
```

---

## 🔧 Fix #4: Add Section Dividers with Orange Accent

### In PDF-lib Generator

**Add helper function after `ensureRoom()` (around line 131):**

```typescript
const drawOrangeDivider = () => {
  page.drawLine({
    start: { x: marginX, y: cursorY },
    end: { x: 595.28 - marginX, y: cursorY },
    thickness: 2,
    color: rgb(1.0, 0.356, 0.016),  // F.B/c Orange
  })
  cursorY -= 12
  ensureRoom()
}
```

**Use between sections:**

```typescript
// After Lead Information section (around line 169)
cursorY -= 6
drawOrangeDivider()

// After Executive Summary (around line 174)
cursorY -= 4
drawOrangeDivider()

// After Consultant Brief (around line 180)
cursorY -= 4
drawOrangeDivider()
```

---

## 📊 Fix #5: Improve Typography Hierarchy

### Update Section Headers

**REPLACE:**
```typescript
writeLine('Executive Summary', 14, true)
```

**WITH:**
```typescript
writeLine('EXECUTIVE SUMMARY', 14, true, true)  // Uppercase + Orange
```

**REPLACE:**
```typescript
writeLine('Lead Information', 14, true)
writeLine('Research Highlights', 14, true)
writeLine('Generated Artifacts', 14, true)
```

**WITH:**
```typescript
writeLine('LEAD INFORMATION', 14, true, true)    // Orange headers
writeLine('RESEARCH HIGHLIGHTS', 14, true, true)
writeLine('GENERATED ARTIFACTS', 14, true, true)
```

---

## 🎨 Fix #6: Professional HTML Template Styles

### Update CSS in `generateHtmlContent()` (Line 442+)

**ADD TO STYLES:**

```css
/* F.B/c Brand Enhancements */
.header { 
  background: linear-gradient(135deg, #ff5b04 0%, #ff8040 100%); 
  color: white; 
  padding: 40px; 
  border-radius: 16px; 
  text-align: center;
  box-shadow: 0 4px 6px rgba(255, 91, 4, 0.1);
}

.badge { 
  display: inline-block; 
  padding: 8px 16px; 
  border-radius: 999px; 
  background: rgba(255, 255, 255, 0.2); 
  color: white; 
  font-weight: 600; 
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-bottom: 16px;
}

.section { 
  margin-top: 24px; 
  padding: 24px; 
  border-radius: 12px; 
  background: white; 
  border: 1px solid #e5e7eb; 
  border-left: 4px solid #ff5b04;  /* Orange accent */
}

h2 { 
  margin: 0 0 16px; 
  font-size: 20px; 
  color: #ff5b04;  /* Orange headings */
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.03em;
}

h3 { 
  color: #ff5b04;  /* Orange subheadings */
  font-weight: 600;
}

a { 
  color: #ff5b04;  /* Orange links */
  text-decoration: none;
  font-weight: 500;
}
a:hover {
  text-decoration: underline;
}

strong { 
  color: #ff5b04;  /* Orange emphasis */
}

.footer {
  margin-top: 32px;
  text-align: center;
  padding: 24px;
  background: #f8f9fa;
  border-radius: 12px;
  font-size: 14px;
  color: #6b7280;
}
```

---

## 🚀 Testing Checklist

After implementing fixes:

### Visual Tests

- [ ] **PDF Header:** Logo appears, title is orange
- [ ] **Section Headers:** All uppercase, orange color
- [ ] **Dividers:** Orange lines between sections
- [ ] **Footer:** Website URL in orange
- [ ] **Email:** Orange gradient header, orange CTA button
- [ ] **Overall:** Light background, dark text, orange accents

### Functional Tests

- [ ] **Puppeteer Mode:** HTML → PDF with colors
- [ ] **PDF-lib Fallback:** Text-based with colors
- [ ] **Email Delivery:** Resend sends with attachment
- [ ] **Download:** Browser downloads PDF correctly
- [ ] **Mobile:** Responsive email on mobile devices

### Quality Tests

- [ ] **Print:** PDF prints correctly (no dark backgrounds)
- [ ] **Accessibility:** Sufficient color contrast
- [ ] **Branding:** Consistent with website design
- [ ] **Professional:** Looks polished and ready for clients

---

## 📋 Quick Command Reference

```bash
# Test PDF generation locally
curl -X POST http://localhost:3000/api/export-summary \
  -H "Content-Type: application/json" \
  -d '{"sessionId": "test-session-id"}' \
  --output test-summary.pdf

# Test email sending
curl -X POST http://localhost:3000/api/send-pdf-summary \
  -H "Content-Type: application/json" \
  -d '{"sessionId": "test-session-id", "toEmail": "test@example.com", "leadName": "Test User"}'

# Check PDF file size
ls -lh test-summary.pdf

# Open PDF in default viewer (macOS)
open test-summary.pdf
```

---

## 🎯 Priority Order

1. **Fix #1: Brand Colors** → 30 mins → CRITICAL
2. **Fix #2: Add Logo** → 45 mins → CRITICAL  
3. **Fix #3: Email Template** → 30 mins → HIGH
4. **Fix #4: Section Dividers** → 20 mins → MEDIUM
5. **Fix #5: Typography** → 15 mins → MEDIUM
6. **Fix #6: HTML Styles** → 30 mins → MEDIUM

**Total Estimated Time: ~3 hours**

---

## 🔗 Related Files

```
src/core/pdf-generator-puppeteer.ts      # Main generator
src/core/workflows/finalizeLeadSession.ts  # Email template
src/core/email-service.ts                 # Email delivery
app/api/export-summary/route.ts          # Download API
app/api/send-pdf-summary/route.ts        # Email API
app/globals.css                          # Brand colors reference
```

---

## 💡 Pro Tips

1. **Test both modes:** Puppeteer AND pdf-lib fallback
2. **Use Vercel preview:** Deploy to preview URL before main
3. **Real data:** Test with actual lead session IDs
4. **Compare:** Side-by-side with earlier versions
5. **Mobile:** Check email on iPhone/Android
6. **Print:** Actually print a PDF to verify colors

---

**Ready to implement? Start with Fix #1 (brand colors) - it's the most visible impact!**

