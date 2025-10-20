# Privacy Policy

**Effective Date:** October 17, 2025  
**Last Updated:** October 17, 2025

F.B/c AI Consulting ("we," "us," or "our") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, store, and protect your personal information.

---

## 1. Information We Collect

### 1.1 Personal Information

- **Contact Details:** Name, work email, company name, job title
- **Conversation Data:** Text messages, questions, and responses
- **Voice Data:** Audio recordings and transcripts of voice conversations
- **Visual Context:** Screen share analyses, webcam captures (analyzed, not permanently stored)
- **Documents:** Files and images you voluntarily upload

### 1.2 Technical Information

- **Session Data:** Session IDs, timestamps, modalities used
- **Device Information:** Browser type, operating system, screen resolution
- **Usage Analytics:** Features used, interaction patterns, session duration
- **Performance Metrics:** Response times, error rates, connection quality

### 1.3 Automatically Collected Data

- **IP Address:** For security and fraud prevention (hashed for privacy)
- **Cookies:** Essential cookies only (no third-party tracking)
- **WebSocket Connection:** For real-time voice communication

---

## 2. How We Use Your Information

We use your data for the following purposes:

### 2.1 Primary Services

- Provide AI-powered business consulting
- Generate personalized recommendations and insights
- Research public information about your company (Google search, LinkedIn, company websites)
- Create conversation summaries and PDF reports
- Enable multimodal interactions (voice, screen share, file analysis)

### 2.2 Service Improvement

- Improve AI model accuracy (using anonymized data only)
- Optimize platform performance
- Develop new features based on usage patterns
- Quality assurance and testing

### 2.3 Legal and Security

- Comply with legal obligations
- Prevent fraud and abuse
- Enforce our Terms and Conditions
- Respond to legal requests

---

## 3. Data Storage and Security

### 3.1 Storage Infrastructure

| Data Type | Storage Location | Duration | Security |
|-----------|------------------|----------|----------|
| **Active Session** | Redis (Upstash) - EU | 1 hour | Encrypted (TLS 1.3) |
| **Conversation Archive** | Supabase - EU Central | 7-90 days | Encrypted (AES-256) |
| **PDF Summaries** | Supabase Storage - EU | 90 days | Encrypted, Access-controlled |
| **Audit Logs** | Supabase - EU Central | 90 days | Encrypted, Immutable |
| **Voice Audio** | Fly.io - US East | Real-time only | Not stored permanently |

### 3.2 Security Measures

- **Encryption in Transit:** All data encrypted using TLS 1.3
- **Encryption at Rest:** Database encrypted with AES-256
- **Write-Ahead Logging:** 99.9% data reliability guarantee
- **PII Detection:** Automatic detection and optional redaction
- **Access Control:** Role-based access with Row-Level Security (RLS)
- **Audit Trail:** Complete log of all data operations
- **Regular Backups:** Daily automated backups (30-day retention)

### 3.3 Data Processing Locations

- **Primary Region:** EU Central (Frankfurt) - Supabase
- **Caching:** Global - Vercel CDN
- **Voice Processing:** US East (IAD) - Fly.io WebSocket
- **AI Processing:** Google Cloud (regional based on availability)

---

## 4. Data Retention Timeline

### 4.1 Active Session Data

**Duration:** Up to 1 hour  
**Includes:** Real-time conversation context, voice transcripts, screen analyses  
**Storage:** Redis (Upstash)  
**Deletion:** Automatic on session end or timeout

### 4.2 Archived Conversation Data

**Duration:** 7 days  
**Includes:** Voice transcripts, visual analyses, uploaded files, raw messages  
**Storage:** Supabase database  
**Deletion:** Automatic after 7 days via scheduled cleanup

### 4.3 PDF Summaries

**Duration:** 90 days  
**Includes:** Conversation highlights, key insights, recommendations  
**Storage:** Supabase Storage bucket  
**Deletion:** Automatic after 90 days

### 4.4 Audit Logs

**Duration:** 90 days  
**Includes:** PII detections, context archival, PDF generations, data deletions  
**Storage:** Supabase database  
**Deletion:** Automatic after 90 days

### 4.5 Permanent Retention

We do NOT permanently retain:
- ❌ Voice recordings or transcripts
- ❌ Screen share captures
- ❌ Webcam images
- ❌ Original uploaded files
- ❌ Raw chat message content

---

## 5. Your Rights Under GDPR

### 5.1 Right to Access

You can request a copy of all personal data we hold about you.

**How to request:**
Email privacy@farzadbayat.com with subject "Data Access Request"

### 5.2 Right to Deletion ("Right to be Forgotten")

You can request immediate deletion of all your data at any time.

**How to request:**
- Email privacy@farzadbayat.com with subject "Delete My Data"
- We will delete all data within 48 hours
- Confirmation email sent upon completion

**API Endpoint (for developers):**
```bash
POST /api/data-deletion
{
  "email": "your@email.com"
}
```

### 5.3 Right to Data Portability

Download your conversation summary as a PDF at any time.

**How to request:**
Click "Download Summary" button in the chat interface

### 5.4 Right to Rectification

Request correction of any inaccurate personal data.

**How to request:**
Email privacy@farzadbayat.com with corrections

### 5.5 Right to Object

Object to processing of your personal data for specific purposes.

**How to request:**
Email privacy@farzadbayat.com with your objection

### 5.6 Response Time

We will respond to all requests within **30 days** as required by GDPR.

---

## 6. Data Sharing and Disclosure

### 6.1 We DO Share Data With:

- **Google Gemini API:** For AI processing (anonymized where possible)
- **Third-party Infrastructure:** Vercel, Supabase, Fly.io, Upstash (all GDPR-compliant)

### 6.2 We DO NOT Share Data With:

- ❌ Advertisers or marketing companies
- ❌ Data brokers
- ❌ Social media platforms
- ❌ Analytics trackers (beyond essential Google Analytics)
- ❌ Any party for purposes other than providing our service

### 6.3 Legal Disclosure

We may disclose data if required by law:
- Court orders or subpoenas
- Law enforcement requests
- Protection of our legal rights
- Prevention of fraud or illegal activity

---

## 7. Cookies and Tracking

### 7.1 Essential Cookies Only

We use minimal cookies for:
- **Session Management:** Keep you logged in
- **Security:** CSRF protection, authentication
- **Preferences:** Remember your settings

### 7.2 No Third-Party Tracking

We do NOT use:
- ❌ Advertising cookies
- ❌ Social media pixels
- ❌ Cross-site tracking
- ❌ Behavioral analytics (beyond basic usage stats)

### 7.3 Cookie Control

You can disable cookies in your browser, but this may affect functionality.

---

## 8. Children's Privacy

Our service is NOT intended for children under 16. We do not knowingly collect data from children.

If you believe a child has provided us with personal information, contact us immediately at privacy@farzadbayat.com.

---

## 9. International Data Transfers

### 9.1 Primary Storage: EU

Your data is primarily stored in the European Union (Frankfurt, Germany) via Supabase.

### 9.2 US Processing

Some data may be processed in the United States:
- Voice audio streams (Fly.io - US East)
- AI processing (Google Cloud)

### 9.3 Safeguards

All international transfers are protected by:
- Standard Contractual Clauses (SCCs)
- Privacy Shield frameworks where applicable
- Encryption in transit and at rest

---

## 10. Your Responsibilities

### 10.1 Confidentiality

Do not share:
- Confidential company information you're not authorized to disclose
- Personal information of others without consent
- Proprietary or trade secret information

### 10.2 Accurate Information

Provide accurate contact information for correspondence.

### 10.3 Secure Access

Keep your session links private. Do not share with unauthorized parties.

---

## 11. Data Breach Notification

In the unlikely event of a data breach:

1. **Detection:** We monitor continuously
2. **Assessment:** Within 24 hours
3. **Notification:** Within 72 hours (GDPR requirement)
4. **Mitigation:** Immediate security patches
5. **Follow-up:** Detailed incident report

You will be notified via email if your data is affected.

---

## 12. Changes to Privacy Policy

We may update this policy to reflect:
- Changes in legal requirements
- New features or services
- Industry best practices

### 12.1 Notification

Significant changes will be communicated via:
- Email notification to registered users
- In-app banner notification
- Updated "Last Updated" date at top of policy

### 12.2 Acceptance

Continued use of our service after changes constitutes acceptance.

---

## 13. Contact Us

### 13.1 Privacy Officer

**Email:** privacy@farzadbayat.com  
**Subject Line:** Use "Privacy Policy" for general inquiries

### 13.2 Data Protection Officer (GDPR)

**Email:** dpo@farzadbayat.com (forwards to privacy@)

### 13.3 General Support

**Website:** https://farzadbayat.com  
**Support Email:** support@farzadbayat.com

### 13.4 Supervisory Authority

If you're in the EU and have concerns about our data handling, you can contact your national data protection authority.

---

## 14. Technical Implementation

For transparency, here's how we technically implement data privacy:

### 14.1 Data Flow

```
Your Interaction
  ↓
1. Write-Ahead Log (Redis) ← Immediate, reliable
  ↓
2. In-Memory Cache ← Fast access during session
  ↓
3. Redis Active Session (1h) ← Survives restarts
  ↓
4. Supabase Archive (on session end) ← Long-term
  ↓
5. Automatic Deletion (7-90 days) ← Compliance
```

### 14.2 PII Detection

We automatically detect:
- Email addresses (expected in contact form)
- Phone numbers (redacted if unexpected)
- Credit card numbers (always redacted)
- Social Security Numbers (always redacted)
- Passport numbers (always redacted)

### 14.3 Audit Trail

Every security-relevant event is logged:
- PII detection events
- Context archival
- PDF generation
- Data deletion requests
- Access violations

---

## 15. Acknowledgment

By using F.B/c AI Consulting, you acknowledge that you have read and understood this Privacy Policy and agree to its terms.

---

**F.B/c AI Consulting**  
Farzad Bayat  
privacy@farzadbayat.com  
https://farzadbayat.com

**Last Updated:** October 17, 2025

