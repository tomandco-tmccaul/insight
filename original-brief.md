Here is the comprehensive brief to build the application, based on all of our design decisions.

-----

### **Project Brief: "Insight" - A Multi-Tenant eCommerce Reporting Dashboard**

#### **1. Project Overview**

You will build a multi-tenant SaaS (Software-as-a-Service) reporting dashboard. This application, built by the eCommerce agency "Tom\&Co," will be used by their clients (e.g., Sanderson Design Group) to get real-time insights into their eCommerce performance.

The application's multi-tenant structure is as follows:

  * An **Admin** (Tom\&Co employee) can log in and see all *Clients*.
  * A **Client** (e.g., Sanderson) can log in and see all their *Websites* (or "Brands," e.g., Harlequin, Sanderson Brand).
  * A "Report" is a dashboard view for a specific **Website** or a **Combined Total** of multiple websites.

#### **2. Core Tech Stack**

  * **Framework:** Next.js 14+ (App Router, Server Components, Route Handlers)
  * **UI Components:** `shadcn/ui` (for core components: buttons, forms, tables, dialogs, tabs).
  * **Data Visualization:** `Tremor` (for all charts, KPI cards, and dashboard-specific layouts).
  * **Animation:** `Framer Motion` (for subtle page transitions and component animations).
  * **Authentication:** Firebase Authentication (Google Auth, Email/Password).
  * **App Database:** Firestore (for all app logic, user data, and configuration).
  * **Deployment:** Firebase App Hosting.
  * **Analytics Database:** Google BigQuery.
  * **AI:** Google Genkit (using the Gemini API).
  * **Async Tasks:** Google Cloud Tasks & Google Cloud Run.

#### **3. Core Architecture & Data Flow**

This is a **read-only analytics app**. All heavy data processing is handled *before* the app queries it.

1.  **ELT Pipeline (Manual):** The "Tom\&Co" team is responsible for manually setting up the data pipeline for each new client.

      * **Extraction/Load:** Airbyte is used to pull raw data from client sources (Magento, GA4, Google Ads, Facebook Ads, Pinterest Ads, Google Search Console) and load it into a client-specific BigQuery dataset. This sync is scheduled to run hourly.
      * **Transformation:** The "Tom\&Co" team will manually create **BigQuery Scheduled Queries** that transform this raw data into a set of clean, fast, aggregated `reporting_tables`.

2.  **Application Data Flow:**

      * The Next.js app **NEVER** queries the raw data.
      * All dashboard components will fetch data from the pre-aggregated `reporting_tables` in BigQuery.
      * All metric calculations (AOV, CVR, ROAS) will be performed *in the Next.js app* (in Route Handlers or Server Components) based on base numbers (sales, orders, sessions) from BigQuery.

3.  **Database Separation of Concerns:**

      * **Google BigQuery:** Stores all analytics and reporting data.
      * **Firebase Firestore:** Stores all application state, configuration, and user-generated content (users, client lists, website mappings, targets, annotations).

#### **4. Authentication & Security Model**

  * **Auth:** Use **Firebase Authentication** for user login.
  * **Authorization:** User roles and permissions are stored in a root `users` collection in Firestore.
      * **`admin` role:** Can see all clients.
      * **`client` role:** Has a `clientId` field. Can only see data associated with their `clientId`.
  * **Security:** Security will be enforced at the **application level**.
      * All Next.js API routes and Server Components must check the user's Firebase token, get their role and `clientId` from Firestore, and inject the appropriate `clientId` and `websiteId` into all BigQuery queries.
      * We will **not** use BigQuery Row-Level Security for this version.

#### **5. Data Models (TypeScript Interfaces)**

You will create `types/firestore.ts` and `types/bigquery.ts` to define all data models.

##### **Firestore Data Model**

The database is structured hierarchically using subcollections.

```typescript
// types/firestore.ts

// Root Collection: /users/{auth_user_id}
export interface AppUser {
  uid: string;
  email: string;
  role: 'admin' | 'client';
  clientId: string | null; // e.g., "sanderson_design_group"
}

// Root Collection: /clients/{client_id}
export interface Client {
  id: string; // "sanderson_design_group"
  clientName: string; // "Sanderson Design Group"
}

// Subcollection: /clients/{client_id}/websites/{website_id}
export interface Website {
  id: string; // "harlequin"
  websiteName: string; // "Harlequin"
  bigQueryWebsiteId: string; // "harlequin_prod" (The ID used in BQ tables)
}

// Subcollection: /clients/{client_id}/targets/{target_id}
export interface Target {
  id: string;
  metric: 'revenue' | 'roas' | 'cpa' | 'sessions';
  granularity: 'monthly' | 'yearly';
  startDate: string; // ISO 8601 Timestamp
  value: number;
  websiteId: string; // "harlequin" or "all_combined"
}

// Subcollection: /clients/{client_id}/annotations/{annotation_id}
export interface Annotation {
  id: string;
  note: string;
  type: 'event' | 'info' | 'issue' | 'insight' | 'test';
  startDate: string; // ISO 8601 Timestamp
  endDate: string; // ISO 8601 Timestamp
  level: 'client' | 'website' | 'report';
  websiteId: string | null; // "harlequin"
  reportId: string | null; // "product_performance"
}

// Subcollection: /clients/{client_id}/customLinks/{link_id}
export interface CustomLink {
  id: string;
  name: string; // "ClickUp Roadmap"
  url: string; // "https://clickup.com/..."
  sortOrder: number;
}
```

##### **BigQuery Data Model (Example)**

The app's data model is a "contract" that mirrors the schemas of the aggregated `reporting_tables`.

```typescript
// types/bigquery.ts

// Represents the schema of the `agg_sales_overview_daily` table
export interface SalesOverviewRow {
  date: string;
  website_id: string;
  total_sales: number;
  total_orders: number;
  total_sessions: number;
  total_media_spend: number;
  total_revenue: number;
}

// ... other interfaces for product, marketing, and website behaviour tables ...
```

#### **6. Application UI & Page Structure**

The app uses a persistent shell layout (`/app/(dashboard)/layout.tsx`) with a resizable sidebar and a static header.

  * **Header Bar:** Contains global context filters:

    1.  **Report Selector:** A `<Select>` component. For Admins, this is a two-step selector (Client, then Website). For Clients, it's a single selector of their allowed websites (e.g., "Harlequin," "Sanderson Brand," "Combined Totals").
    2.  **Global Date Range Picker:** (`shadcn/ui Calendar` with date range).
    3.  **Comparison Picker:** A `<Select>` (e.g., "Previous Period," "Previous Year").
    4.  **User Menu:** (Avatar, Logout).

  * **Client Sidebar Navigation:**

      * `/page.tsx`: **Overview** (The `Sales / Performance Overview` tab)
      * `/product`: **Product** (The `Product Performance` tab)
      * `/marketing`: **Marketing** (The `Digital Marketing Breakdown` tab)
      * `/website`: **Website** (The `Website Behaviour` tab)
      * `/annotations`: **Annotations** (A page to manage all annotations)
      * *(Collapsible Section)* **Resources**: Dynamically populated from `customLinks` in Firestore.

  * **Admin Sidebar Navigation:**

      * `/page.tsx`: **Dashboard** (Same as client view, but with Client Selector in header).
      * `/admin/clients`: **Client Management** (Master list of all clients).
      * `/admin/users`: **User Management** (Master list of all users, with invite/assign capability).

  * **Admin Client Settings Page (`/admin/clients/{client_id}`):**

      * This page will use `shadcn/ui Tabs` to manage all settings for a *single* client.
      * **Tab 1: Websites:** CRUD interface for managing the client's `websites` subcollection.
      * **Tab 2: Targets:** CRUD interface for managing the `targets` subcollection (with bulk CSV upload).
      * **Tab 3: Custom Links:** CRUD interface for managing the `customLinks` subcollection.
      * **Tab 4: Assigned Users:** Interface to view and assign users from the root `users` collection to this client.

#### **7. Feature Breakdown**

##### **Sales / Performance Overview (Page: `/`)**

  * Use `Tremor` `KpiCard` components for key metrics.
  * **Base Metrics (from BigQuery):** Total Sales, No. of Orders, Traffic (Sessions), Total Media Spend.
  * **Calculated Metrics (in-app):** AOV, Conversion Rate, Returns (%), Blended ROAS, CPA.
  * Use `Tremor` `AreaChart` for Sales Trends (with time filter).
  * Use `Tremor` `BarChart` for Revenue vs. Target (Target pulled from Firestore).
  * Use `shadcn/ui` `DataTable` for "Snapshot view of top-selling products."

##### **Product Performance (Page: `/product`)**

  * `DataTable` for Best-selling & Slow-selling products (by £ and quantity).
  * `DataTable` for Highest Stocked Products (data assumed to be in a BigQuery table).
  * `DataTable` for Product Return Rates (calculated in-app).

##### **Digital Marketing Breakdown (Page: `/marketing`)**

  * Overview `BarChart` comparing Spend, Traffic & Revenue by channel.
  * `DataTable` for channel-level CPA & ROAS.
  * `DataTable` for Top Performing Campaigns.
  * **SEO Snapshot:** A dedicated section with `KpiCard`s for Attributed Revenue, Impressions, and CTR. A `DataTable` for Top Keywords & Avg. Ranking. (Data from Google Search Console via BigQuery).

##### **Website Behaviour (Page: `/website`)**

  * `KpiCard`s for Sessions, Session Duration, Pages/Session, Add to Bag Rate, Cart Abandonment.
  * `DataTable` for Pages with highest traffic/bounce rate.
  * `DataTable` for Top Entrance/Exit pages.
  * `DataTable` for Search Insights (most searched keywords).

##### **AI Analysis (Genkit)**

  * **AI Overview:** On each page, an "Analyze" button will trigger a Genkit flow.
  * **Flow:**
    1.  Next.js backend fetches the relevant data from BigQuery for the current view.
    2.  Backend fetches all overlapping `annotations` from Firestore.
    3.  Both data (JSON) and annotations (text) are sent to Genkit with a prompt.
    4.  The AI summary is streamed back to a `Dialog` in the UI.
  * **"Talk to Data":** A chat interface will use Genkit to parse a user's question, formulate a BigQuery query, get the results, and provide a natural language answer.
  * **Cost Control:** No rate-limiting will be implemented in the initial build.

##### **Annotations (Page: `/annotations`)**

  * A full CRUD interface for `client` users to create, view, and delete annotations.
  * The "New Annotation" form will allow setting `note`, `type`, `date range`, and `scope` (Client, Website, or Report).
  * These annotations will be fed to the Genkit AI for context.

##### **Exports (PDF/XLS)**

  * This feature MUST be **asynchronous** to prevent serverless timeouts.
  * **Flow:**
    1.  User clicks "Export to PDF" button.
    2.  Next.js API route receives the request and creates a new job in **Google Cloud Tasks**.
    3.  The API immediately returns a "Success" toast (e.g., "Your export is being generated and will be sent to your email.").
    4.  A **Google Cloud Run** service listens for tasks on the queue, picks up the job, runs the (potentially slow) BigQuery query, generates the file, and emails it to the user.

#### **8. UX/UI & In-Between States**

The app must feel fast and professional.

  * **Loading States:** Use Next.js `loading.tsx` for the main page shell. Use React `Suspense` boundaries for every individual chart and KPI card. While loading, components will display a `shadcn/ui` skeleton loader that mimics the shape of the component.
  * **Error States:** Use Next.js `error.tsx` boundaries. If a single component (e.g., one chart) fails to fetch data, it must not crash the entire page. It should display a "Could not load component" card with a "Try Again" button.
  * **Empty States:** Design specific components for:
      * **New Clients:** A welcome message: "Your data is syncing for the first time. Please check back in an hour."
      * **No Data:** A message: "No data found for the selected date range."

#### **9. Scope (Brilliant Basics)**

  * **IN SCOPE:**

      * All four main tabs (Sales, Product, Marketing, Website).
      * All "Additional Feature Requests" (AI, Annotations, PDF/XLS Exports, Custom Links, Targets).
      * Full Admin and Client roles.

  * **OUT OF SCOPE:**

      * The **'Customer Insights'** tab (New vs. Returning, Demographics, CLV, CAC) is **NOT** needed for this initial version.