# Insight - Multi-Tenant eCommerce Reporting Dashboard

A comprehensive SaaS reporting dashboard built for Tom&Co's eCommerce clients. This application provides real-time insights into eCommerce performance with support for multiple clients and websites.

## 🚀 Tech Stack

- **Framework:** Next.js 14+ (App Router, Server Components)
- **UI Components:** shadcn/ui + Tremor
- **Animation:** Framer Motion
- **Authentication:** Firebase Authentication
- **Database:** Firebase Firestore
- **Analytics:** Google BigQuery
- **AI:** Google Genkit (Gemini API)
- **Deployment:** Firebase App Hosting
- **Async Tasks:** Google Cloud Tasks + Cloud Run

## 📋 Features

### Core Functionality
- ✅ Multi-tenant architecture (Admin & Client roles)
- ✅ Real-time eCommerce analytics dashboard
- ✅ Four main reporting tabs:
  - Sales / Performance Overview
  - Product Performance
  - Digital Marketing Breakdown
  - Website Behaviour
- ✅ AI-powered insights and analysis
- ✅ Custom annotations system
- ✅ Async PDF/XLS export generation
- ✅ Custom resource links per client

### User Roles
- **Admin (Tom&Co):** Access all clients and their data
- **Client:** Access only their assigned websites and data

## 🛠️ Setup Instructions

### Prerequisites
- Node.js 18+ and npm
- Firebase project with Firestore and Authentication enabled
- Google Cloud project with BigQuery API enabled
- Service account with appropriate permissions

### 1. Clone and Install

```bash
git clone <repository-url>
cd tco-client-reports-augment
npm install
```

### 2. Environment Variables

Copy `.env.local.example` to `.env.local` and fill in your credentials:

```bash
cp .env.local.example .env.local
```

Required environment variables:
- Firebase client configuration (public)
- Firebase Admin SDK credentials (server-side)
- Google Cloud project details
- BigQuery dataset ID
- Google Genkit API key

### 3. Firebase Setup

1. Create a Firebase project at https://console.firebase.google.com
2. Enable Authentication (Email/Password and Google providers)
3. Create a Firestore database
4. Download service account key from Project Settings > Service Accounts
5. Add the credentials to `.env.local`

### 4. Firestore Database Structure

The database uses a hierarchical structure. See `docs/database-schema.md` for details.

Initial collections to create:
```
/users/{user_id}
/clients/{client_id}
  /websites/{website_id}
  /targets/{target_id}
  /annotations/{annotation_id}
  /customLinks/{link_id}
```

### 5. BigQuery Setup

1. Create a BigQuery dataset for your analytics data
2. Set up Airbyte to sync data from client sources (Magento, GA4, Google Ads, etc.)
3. Create scheduled queries to transform raw data into aggregated reporting tables
4. Update `BIGQUERY_DATASET_ID` in `.env.local`

### 6. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the application.

## 📁 Project Structure

```
├── app/
│   ├── (dashboard)/          # Protected dashboard routes
│   │   ├── layout.tsx        # Dashboard layout with sidebar
│   │   ├── page.tsx          # Sales overview
│   │   ├── product/          # Product performance
│   │   ├── marketing/        # Marketing breakdown
│   │   ├── website/          # Website behaviour
│   │   ├── annotations/      # Annotations management
│   │   └── admin/            # Admin-only routes
│   ├── login/                # Login page
│   └── layout.tsx            # Root layout
├── components/
│   ├── ui/                   # shadcn/ui components
│   ├── dashboard/            # Dashboard-specific components
│   └── auth/                 # Authentication components
├── lib/
│   ├── auth/                 # Authentication logic
│   ├── firebase/             # Firebase configuration
│   ├── bigquery/             # BigQuery client
│   └── context/              # React contexts
├── types/                    # TypeScript type definitions
└── docs/                     # Documentation

```

## 🔐 Security

- Authentication enforced at application level
- Role-based access control (Admin vs Client)
- Server-side token verification for all API routes
- Client data isolation via `clientId` filtering

## 🚢 Deployment

### Firebase App Hosting

1. Install Firebase CLI: `npm install -g firebase-tools`
2. Login: `firebase login`
3. Initialize: `firebase init hosting`
4. Deploy: `firebase deploy`

## 📊 Data Flow

1. **ELT Pipeline:** Airbyte → BigQuery (raw data)
2. **Transformation:** BigQuery Scheduled Queries → Aggregated tables
3. **Application:** Next.js → BigQuery (read-only queries)
4. **Calculations:** Metrics (AOV, CVR, ROAS) calculated in-app

## 🤝 Contributing

This is a private project for Tom&Co clients. For questions or support, contact the development team.

## 📝 License

Proprietary - Tom&Co © 2024
