# Insight Dashboard - Project Patterns & Rules

## Project Overview
Multi-tenant SaaS eCommerce reporting dashboard built with Next.js 14+, Firebase, and BigQuery.

## Technology Stack

### Core Framework
- **Next.js 14+** with App Router (not Pages Router)
- **TypeScript** for all files
- **Tailwind CSS** for styling
- **React 19** (with legacy peer deps for Tremor compatibility)

### UI Libraries
- **shadcn/ui** - Core UI components (Button, Select, Input, Card, Table, Dialog, etc.)
- **Tremor** - Data visualization (charts, KPI cards)
- **Framer Motion** - Animations
- **Lucide React** - Icons

### Backend Services
- **Firebase Authentication** - Email/Password + Google OAuth
- **Firebase Firestore** - Application data (users, clients, websites, annotations, etc.)
- **Firebase Admin SDK** - Server-side operations
- **Google BigQuery** - Analytics data (read-only)
- **Google Genkit** - AI features with Gemini

## Architecture Patterns

### Multi-Tenant Structure
- Hierarchical Firestore with subcollections
- Client-scoped data isolation
- Role-based access: `admin` (all clients) vs `client` (own clientId only)
- Security enforced at application level, not BigQuery row-level

### Data Flow
1. **Firestore** - App data (users, clients, websites, targets, annotations, custom links)
2. **BigQuery** - Analytics data (sales, products, marketing, website behavior)
3. **Read-only analytics** - Heavy processing done before querying
4. **Pre-aggregated tables** - Daily/hourly aggregations for performance

### Authentication
- **Client-side:** AuthContext with Firebase Auth
- **Server-side:** Token verification via Firebase Admin SDK
- **Protected routes:** ProtectedRoute component
- **API middleware:** requireAuth, requireAdmin, requireClientAccess

## File Structure Conventions

### Route Organization
```
app/
├── (dashboard)/          # Protected dashboard routes
│   ├── layout.tsx        # Dashboard layout with sidebar
│   ├── page.tsx          # Sales Overview
│   ├── customers/        # Customer Insights (GA4)
│   ├── product/
│   ├── marketing/
│   ├── website/          # Website Behavior (GA4)
│   ├── annotations/
│   └── admin/            # Admin-only routes
├── api/                  # API routes
│   ├── customers/
│   │   └── insights/     # Customer Insights API (GA4)
│   └── website/
│       └── behavior/     # Website Behavior API (GA4)
├── login/                # Public auth page
└── layout.tsx            # Root layout
```

### Component Organization
```
components/
├── auth/                 # Authentication components
├── dashboard/            # Dashboard-specific components
└── ui/                   # shadcn/ui components
```

### Library Organization
```
lib/
├── auth/                 # Auth context, middleware, hooks
├── context/              # Global state management
├── firebase/             # Firebase config (client + admin)
├── bigquery/             # BigQuery client
└── utils/                # Utility functions
```

### Type Organization
```
types/
├── firestore.ts          # Firestore data models
├── bigquery.ts           # BigQuery table schemas
└── index.ts              # Shared types
```

## Coding Patterns

### Firebase Configuration
- **Client-side:** `lib/firebase/config.ts` - Uses NEXT_PUBLIC_ env vars
- **Server-side:** `lib/firebase/admin.ts` - Uses service account credentials
- **Graceful degradation:** Both configs handle missing credentials for build time

### API Routes
- Always use `requireAuth` middleware
- Check user role for authorization
- Return `ApiResponse<T>` type
- Handle errors with try/catch

Example:
```typescript
export async function GET(request: NextRequest) {
  return requireAuth(request, async (req, user) => {
    try {
      // Your logic here
      return NextResponse.json({ success: true, data });
    } catch (error: any) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }
  });
}
```

### Protected Pages
- Wrap with `<ProtectedRoute>` for client-only pages
- Use `<ProtectedRoute requireAdmin>` for admin-only pages
- Use `useRequireAuth()` hook for automatic redirects

### Global State
- Use `DashboardContext` for global filters
- Access via `useDashboard()` hook
- State includes: selectedClientId, selectedWebsiteId, dateRange, comparisonPeriod

### Type Safety
- All Firestore documents have TypeScript interfaces
- All BigQuery rows have TypeScript interfaces
- Use `Create` and `Update` helper types for mutations
- Never use `any` - use `unknown` if type is truly unknown

## Environment Variables

### Required Variables
```bash
# Firebase Client (NEXT_PUBLIC_*)
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=

# Firebase Admin (Server-side)
FIREBASE_PROJECT_ID=
FIREBASE_CLIENT_EMAIL=
FIREBASE_PRIVATE_KEY=

# Google Cloud
GOOGLE_CLOUD_PROJECT=
BIGQUERY_DATASET_ID=

# Genkit AI
GOOGLE_GENAI_API_KEY=
```

## Database Patterns

### Firestore Structure
```
/users/{userId}
/clients/{clientId}
  /websites/{websiteId}
  /targets/{targetId}
  /annotations/{annotationId}
  /customLinks/{linkId}
```

### BigQuery Tables

#### Aggregated Tables (Adobe Commerce)
- `agg_sales_overview_daily` - Daily sales aggregations
- `agg_product_performance_daily` - Product metrics
- `agg_marketing_channel_daily` - Marketing performance
- `agg_seo_performance_daily` - SEO metrics
- `agg_website_behavior_daily` - Session metrics

#### GA4 Tables (Google Analytics 4 via Airbyte)
- `ga4_daily_active_users` - Daily active users (column: `active1DayUsers`)
- `ga4_weekly_active_users` - Weekly active users (column: `active7DayUsers`)
- `ga4_four_weekly_active_users` - Monthly active users (column: `active28DayUsers`)
- `ga4_website_overview` - Overall website metrics (sessions, users, pageviews, bounce rate)
- `ga4_pages` - Page-level metrics (pageviews, bounce rate per page)
- `ga4_traffic_sources` - Traffic source breakdown (source, medium, sessions)
- `ga4_devices` - Device category metrics (desktop, mobile, tablet)
- `ga4_locations` - Geographic breakdown (country-level data)

**Important GA4 Schema Notes:**
- Date fields are stored as strings in `YYYYMMDD` format (e.g., "20251102")
- Use `REPLACE(@startDate, '-', '')` to convert ISO dates to GA4 format
- Numeric fields are often strings - use `CAST(field AS INT64)` or `CAST(field AS FLOAT64)`
- All tables include Airbyte metadata: `_airbyte_raw_id`, `_airbyte_extracted_at`, `_airbyte_meta`, `_airbyte_generation_id`
- Column names use camelCase (e.g., `totalUsers`, `newUsers`, `screenPageViews`)

### Calculated Metrics
Computed in-app, not in BigQuery:
- AOV = total_sales / total_orders
- CVR = (total_orders / total_sessions) * 100
- Blended ROAS = total_revenue / total_media_spend
- CPA = total_media_spend / total_orders

## UI Patterns

### shadcn/ui Components
- Use `<Button>` for all buttons
- Use `<Card>` for content containers
- Use `<Select>` for dropdowns
- Use `<Dialog>` for modals
- Use `<Table>` for data tables
- Use `<Skeleton>` for loading states

### Tremor Components
- Use `<Card>` for KPI cards
- Use `<AreaChart>` for trend lines
- Use `<BarChart>` for comparisons
- Use `<LineChart>` for time series

### Styling
- Use Tailwind CSS utility classes
- Follow shadcn/ui color scheme (Neutral)
- Use `text-gray-900` for headings
- Use `text-gray-600` for descriptions
- Use `space-y-6` for vertical spacing


### Animation & Motion
- Prefer Framer Motion for route/page transitions and reveal effects
- Page transitions: Wrap dashboard page content in `<AnimatePresence>` and a keyed `<motion.div>` using `usePathname()`
  - Initial: `{ opacity: 0, y: 6 }`
  - Animate: `{ opacity: 1, y: 0 }`
  - Exit: `{ opacity: 0, y: -6 }`
  - Transition: `{ duration: 0.2, ease: 'easeOut' }`
- Sidebar/Header: Use glassmorphism (`bg-white/70 supports-[backdrop-filter]:bg-white/60 backdrop-blur`) with subtle shadows (`shadow-sm`)
- Buttons: Micro‑interactions by default in `components/ui/button.tsx`
  - Base includes `transition-all will-change-transform hover:shadow-sm active:scale-[0.98]`
- Cards: Lift on hover in `components/ui/card.tsx`
  - Base includes `transition-all hover:shadow-md`
- Nav links: Smooth nudge on hover and click feedback
  - Use `transition-all hover:translate-x-0.5 active:scale-[0.99]`
- Main content background: Subtle gradient `bg-gradient-to-br from-gray-50 via-white to-gray-50` for a modern SaaS feel
- Staggered content reveals for grids/lists
  - Wrap grid in `<motion.div variants={container} initial="hidden" animate="show">`
  - Parent variants: `{ hidden: { opacity: 1 }, show: { opacity: 1, transition: { staggerChildren: 0.08, delayChildren: 0.05 } } }`
  - Wrap each card/item in `<motion.div variants={item}>`
  - Item variants: `{ hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0, transition: { duration: 0.25 } } }`
- Skeleton shimmer loading
  - Utility in globals: `.shimmer` with translating gradient overlay
  - Skeleton base uses `relative overflow-hidden shimmer` alongside `animate-pulse`
- Tables: Subtle row hover
  - Use `transition-all hover:shadow-sm hover:bg-muted/60` on rows where possible


## Build & Deployment

### npm Configuration
- `.npmrc` contains `legacy-peer-deps=true` for React 19 compatibility
- Always use `--legacy-peer-deps` flag when installing new packages

### Build Process
```bash
npm run build    # Production build
npm run dev      # Development server
```

### Firebase Deployment
```bash
firebase deploy --only hosting    # Deploy app
firebase deploy --only firestore  # Deploy rules
```

## Testing Patterns

### Before Committing
1. Run `npm run build` to verify production build
2. Check TypeScript errors
3. Test authentication flow
4. Verify protected routes work

## Common Issues & Solutions

### React 19 Compatibility
- **Issue:** Tremor requires React 18
- **Solution:** Use `legacy-peer-deps=true` in `.npmrc`

### Firebase Build Errors
- **Issue:** Missing credentials during build
- **Solution:** Graceful degradation with default values

### TypeScript Errors
- **Issue:** HeadersInit type conflicts
- **Solution:** Use `Record<string, string>` for headers

## Adobe Commerce Integration

### API Client
- **Location:** `lib/adobe-commerce/client.ts`
- **Endpoints:**
  - `GET /rest/V1/store/storeViews` - List all store views
  - `GET /rest/V1/store/websites` - List all websites
  - `GET /rest/V1/store/storeGroups` - List all store groups
- **Authentication:** Bearer token in Authorization header
- **Configuration:** Stored at **client level** in Firestore
  - `adobeCommerceEndpoint` - Base URL (e.g., https://example.com)
  - `adobeCommerceAccessToken` - Bearer token
  - Shared across all websites for a client

### Sync Stores Feature
- **Endpoint:** `POST /api/admin/clients/[clientId]/sync-stores`
- **Purpose:** Auto-import all active stores from Adobe Commerce as websites
- **Requirements:** Client must have Adobe Commerce credentials configured
- **Process:**
  1. Read credentials from client document
  2. Connect to Adobe Commerce API
  3. Fetch all active store views
  4. Create website documents in Firestore
  5. Skip existing websites (no duplicates)
  6. Set default BigQuery table prefixes
- **UI:**
  - Configure credentials in ClientDialog (Edit Client)
  - Sync Stores button in Admin Clients page (disabled if credentials not set)
  - SyncStoresDialog shows confirmation and progress

## BigQuery Table Management

### Admin BigQuery Page
- **Location:** `app/(dashboard)/admin/bigquery/page.tsx`
- **Features:**
  - View all tables in a client's BigQuery dataset
  - Create aggregation tables with one click
  - Monitor table metadata (rows, size, last modified)
  - Refresh table list

### Aggregation Tables API
- **Endpoint:** `POST /api/admin/bigquery/aggregations`
- **Supported Types:**
  - `sales_overview` - Daily orders, revenue, customer metrics
  - `product_performance` - Daily product sales, quantities, pricing
- **Process:**
  1. Generate SQL based on aggregation type
  2. Execute CREATE OR REPLACE TABLE query
  3. Wait for job completion
  4. Return success/error

### Tables List API
- **Endpoint:** `GET /api/admin/bigquery/tables?dataset_id={id}`
- **Returns:** Array of table metadata
  - Table name, type (TABLE/VIEW)
  - Row count, size in bytes
  - Creation time, last modified time

## Future Development Guidelines

### Adding New Pages
1. Create page in `app/(dashboard)/`
2. Add route to sidebar navigation
3. Wrap with `<ProtectedRoute>` if needed
4. Use `useDashboard()` for global filters

### Adding New API Routes
1. Create route in `app/api/`
2. Use `requireAuth` middleware
3. Return `ApiResponse<T>` type
4. Add TypeScript types for request/response

### Adding New Components
1. Use shadcn/ui as base
2. Follow Tailwind CSS patterns
3. Make components reusable
4. Add TypeScript props interface

### Adding New Features
1. Check Context7 docs for latest library patterns
2. Research solutions with web search
3. Test thoroughly before committing
4. Update augment rules to reflect working code

### Adding New Data Sources
1. Add table prefix field to Website model
2. Create aggregation SQL in `scripts/bigquery/`
3. Add aggregation type to `/api/admin/bigquery/aggregations`
4. Add card to Admin BigQuery page
5. Update dashboard pages to query new tables

