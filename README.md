# Tava Health: AI-Assisted Treatment Plans

![Tava Health](./public/logo.svg)

A full-stack application that transforms therapy session transcripts into personalized, AI-generated treatment plans with dual views for therapists and clients.

## 🎯 Overview

Tava Health is a digital mental health platform that uses AI to streamline the creation and management of treatment plans. The application:

- **Accepts session transcripts** (text, audio) as input
- **Uses AI** to parse and understand session content
- **Generates dual-view treatment plans**:
  - **Therapist View**: Clinical detail, ICD language, interventions, risk factors
  - **Client View**: Plain-language, strengths-based, motivational content
- **Provides role-based dashboards** for therapists and clients

## ✨ Features

### Core Features
- 📝 Session transcript input (paste or upload)
- 🤖 AI-powered treatment plan generation
- 👥 Dual-view plans (therapist/client)
- 🔐 Role-based authentication
- 📱 Mobile-responsive design

### Advanced Features
- 📊 Treatment plan versioning & history
- 🔄 Plan updates from new sessions
- ⚠️ Crisis language detection
- 📋 Session summaries
- ✅ Homework tracking
- ⚙️ Therapist preferences (modality, style)

## 🛠️ Tech Stack

- **Framework**: [Next.js 14](https://nextjs.org/) (App Router)
- **Language**: [TypeScript](https://www.typescriptlang.org/)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/)
- **Components**: [shadcn/ui](https://ui.shadcn.com/)
- **Database**: [PostgreSQL](https://www.postgresql.org/) with [Prisma](https://www.prisma.io/)
- **Authentication**: [NextAuth.js](https://next-auth.js.org/)
- **AI**: [OpenAI API](https://openai.com/) (GPT-4o)
- **Validation**: [Zod](https://zod.dev/)
- **Forms**: [React Hook Form](https://react-hook-form.com/)

## 📁 Project Structure

```
tava-treatment-plans/
├── app/                    # Next.js App Router pages
│   ├── (auth)/            # Authentication routes
│   ├── (therapist)/       # Therapist dashboard routes
│   ├── (client)/          # Client portal routes
│   └── api/               # API routes
├── components/            # React components
│   ├── ui/               # shadcn/ui components
│   ├── shared/           # Shared components
│   ├── therapist/        # Therapist-specific components
│   └── client/           # Client-specific components
├── lib/                   # Utilities and services
│   ├── ai/               # AI pipeline and prompts
│   ├── auth/             # Authentication utilities
│   ├── db/               # Database queries
│   ├── services/         # Business logic
│   └── utils/            # Helper functions
├── prisma/               # Database schema and migrations
├── types/                # TypeScript type definitions
└── tests/                # Test files
```

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ 
- PostgreSQL database
- OpenAI API key

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd tava-treatment-plans
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env.local
   ```
   Edit `.env.local` with your configuration:
   - `DATABASE_URL`: PostgreSQL connection string
   - `NEXTAUTH_SECRET`: Generate with `openssl rand -base64 32`
   - `OPENAI_API_KEY`: Your OpenAI API key

4. **Set up the database**
   ```bash
   npx prisma migrate dev
   npx prisma db seed
   ```

5. **Start the development server**
   ```bash
   npm run dev
   ```

6. **Open the application**
   Visit [http://localhost:3000](http://localhost:3000)

## 📖 Documentation

- [AI System Design](./docs/AI_DESIGN.md) - Prompting strategies and model choices
- [Architecture](./docs/ARCHITECTURE.md) - System architecture overview
- [API Reference](./docs/API.md) - API endpoint documentation
- [Demo Guide](./docs/DEMO.md) - Walkthrough for demo

## 🧪 Testing

```bash
# Run unit tests
npm run test

# Run integration tests
npm run test:integration

# Run E2E tests
npm run test:e2e

# Run all tests with coverage
npm run test:coverage
```

## 🔒 Privacy & Safety

⚠️ **Important Disclaimers**:

- This is a **demonstration application** and should **not** be used for actual clinical care
- All data shown is **synthetic/mock data** - no real PHI is used
- AI-generated content is **not a substitute for clinical judgment**
- Always follow proper clinical protocols and ethical guidelines

## 📝 License

This project is for demonstration purposes. See [LICENSE](./LICENSE) for details.

---

Built with ❤️ for the Tava Health x Gauntlet AI Engineer Challenge
