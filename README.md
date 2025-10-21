# F.B/c Lab V7 - AI Assistant

**F.B/c AI Assistant - Multimodal AI Webapp with Gemini 2.5 Flash (Lab Version 7)**

A cutting-edge AI-powered web application featuring real-time conversational AI, intelligent tools, and comprehensive business intelligence capabilities.

## 🚀 Live Demo

- **Production**: [farzadbayat.com](https://farzadbayat.com)
- **GitHub**: [iamfarzad/fbc-lab-v7](https://github.com/iamfarzad/fbc-lab-v7)

## ✨ Key Features

### 🤖 AI-Powered Chat
- **Gemini 2.5 Flash** integration for real-time conversations
- **Google Grounding Search** for accurate, up-to-date information
- **URL Context** for enhanced content understanding
- **WebSocket Voice** integration for audio interactions

### 🛠️ Intelligent Tools
- **Calculator** with advanced mathematical operations
- **ROI Analysis** for business decision making
- **Translation** services with multiple language support
- **Web Preview** for content analysis
- **Lead Research** and market analysis

### 📊 Business Intelligence
- **Admin Dashboard** with comprehensive monitoring
- **Analytics Dashboard** with real-time metrics
- **Meeting Management** and scheduling
- **Contact Management** with lead capture
- **Workshop Platform** for educational content

### 🎨 Modern UI/UX
- **Responsive Design** with mobile-first approach
- **Dark/Light Mode** with brand-compliant theming
- **Component Library** built with shadcn/ui and Radix UI
- **Performance Optimized** with Next.js App Router

## 🛠️ Tech Stack

### Frontend
- **Next.js 14** with App Router
- **React 19** with TypeScript
- **Tailwind CSS** for styling
- **shadcn/ui** component library
- **Framer Motion** for animations

### AI & Backend
- **Google Gemini 2.5 Flash** for AI conversations
- **@ai-sdk/google** for AI integration
- **Supabase** for database and authentication
- **WebSocket** for real-time communication
- **Vercel** for deployment and hosting

### Development Tools
- **TypeScript** for type safety
- **ESLint** for code quality
- **Husky** for Git hooks
- **Commitlint** for conventional commits
- **Commitizen** for better commit experience

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- pnpm (recommended) or npm
- Google Gemini API key
- Supabase account

### Installation

```bash
# Clone the repository
git clone https://github.com/iamfarzad/fbc-lab-v7.git
cd fbc-lab-v7

# Install dependencies
pnpm install

# Set up environment variables
cp .env.example .env.local
# Edit .env.local with your API keys

# Start development server
pnpm dev
```

### Environment Variables

```env
# Gemini API
GEMINI_API_KEY=your_gemini_api_key
GOOGLE_GENERATIVE_AI_API_KEY=your_gemini_api_key

# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# Vercel
BLOB_READ_WRITE_TOKEN=your_vercel_blob_token
```

## 📝 Development

### Available Scripts

```bash
# Development
pnpm dev              # Start Next.js development server
pnpm dev:live         # Start with WebSocket server
pnpm dev:local-ws     # Start WebSocket server only

# Building
pnpm build            # Build for production
pnpm start            # Start production server

# Code Quality
pnpm lint             # Run ESLint
pnpm lint:fix         # Fix ESLint issues
pnpm type-check       # Run TypeScript type checking

# Git & Commits
pnpm commit           # Interactive commit with Commitizen
pnpm commit:retry     # Retry last commit
```

### Commit Convention

This project uses [Conventional Commits](https://www.conventionalcommits.org/) with custom types:

```bash
# Standard types
feat: add new feature
fix: fix bug
docs: update documentation
style: code formatting changes
refactor: code refactoring
perf: performance improvements
test: add or update tests
chore: maintenance tasks

# Custom types for this project
gemini: Gemini API changes
vercel: Vercel deployment changes
admin: Admin dashboard changes
chat: Chat interface changes
ui: UI component changes
api: API changes
db: Database changes
auth: Authentication changes
security: Security improvements
config: Configuration changes
```

### Example Commits

```bash
feat(chat): add voice input support
fix(gemini): resolve API quota issues
docs: update deployment guide
gemini: upgrade to 2.5 Flash model
vercel: configure production environment
admin: add user management dashboard
```

## 🚀 Deployment

### Vercel (Recommended)

1. **Connect Repository**
   ```bash
   vercel --prod
   ```

2. **Set Environment Variables**
   - Add all required environment variables in Vercel dashboard
   - Ensure `GEMINI_API_KEY` is properly configured

3. **Deploy**
   - Automatic deployments on push to main branch
   - Preview deployments for pull requests

### Manual Deployment

```bash
# Build for production
pnpm build

# Start production server
pnpm start
```

## 📊 Project Structure

```
fbc-lab-v7/
├── app/                    # Next.js App Router
│   ├── (chat)/            # Chat interface routes
│   ├── admin/             # Admin dashboard
│   ├── api/               # API routes
│   └── globals.css        # Global styles
├── src/
│   ├── components/        # React components
│   │   ├── ai-elements/   # AI-powered components
│   │   ├── chat/          # Chat components
│   │   ├── ui/            # Reusable UI components
│   │   └── admin/         # Admin components
│   ├── core/              # Core business logic
│   │   ├── intelligence/  # AI intelligence features
│   │   ├── live/          # WebSocket voice integration
│   │   └── admin/         # Admin services
│   ├── hooks/             # Custom React hooks
│   ├── lib/               # Utility libraries
│   └── styles/            # Design system
├── server/                # WebSocket server
├── scripts/               # Development scripts
└── public/                # Static assets
```

## 📚 Documentation Organization

This project maintains organized documentation to prevent root directory clutter.

### Active Documentation (Root Directory)

Essential documents kept in the root for easy access:
- `README.md` - Main project documentation
- `README_FIRST.md` - Quick start guide
- `NEXT_STEPS.md` - Current roadmap and priorities
- `CLEANUP_GUIDE.md` - Project maintenance procedures
- `DOCUMENT_LIFECYCLE.md` - Documentation management rules

### Historical Documentation (docs/)

Completed tasks, analyses, and historical records are archived in `/docs` with date prefixes:
```
docs/
├── 2025-10-21_FEATURE_IMPLEMENTATION_COMPLETE.md
├── 2025-10-17_VOICE_PIPELINE_FIX_COMPLETE.md
├── 2025-10-15_TYPE_SYSTEM_COMPLETE.md
└── ... (164+ archived documents)
```

**Note:** The `/docs` directory is not committed to git (see `.gitignore`). It serves as local historical reference.

### Document Lifecycle States

1. **ACTIVE** - Keep in root while task is ongoing
2. **COMPLETE** - Archive to `/docs` when implemented and tested
3. **ABANDONED** - Archive to `/docs` with status note when no longer pursued
4. **OBSOLETE** - Delete if truly outdated with no historical value

### Organizing Documentation

Use the automated script to organize docs:
```bash
./organize-docs.sh
```

This moves completed/historical markdown files from root to `/docs` with date prefixes based on last modification date.

For detailed rules, see `DOCUMENT_LIFECYCLE.md`.

## 🔧 Configuration

### Commit Rules

The project uses a customized commit system:

- **Husky** for Git hooks
- **Commitlint** for message validation
- **Commitizen** for interactive commits
- **Custom types** for project-specific changes

### Pre-commit Hooks

- API key detection and prevention
- ESLint code quality checks
- TypeScript type checking
- Test execution (if available)

## 🤝 Contributing

1. **Fork the repository**
2. **Create a feature branch**
   ```bash
   git checkout -b feat/your-feature-name
   ```
3. **Make your changes**
4. **Commit using conventional format**
   ```bash
   pnpm commit
   ```
5. **Push and create a Pull Request**

## 📄 License

This project is proprietary software. All rights reserved.

## 🙏 Acknowledgments

- **F.B/c Team** for the vision and requirements
- **Google Gemini** for AI capabilities
- **Vercel** for hosting and deployment
- **Open Source Community** for amazing tools and libraries

---

**Built with ❤️ by the F.B/c Development Team**

*Version: 7.0.1 | Last updated: January 2025*