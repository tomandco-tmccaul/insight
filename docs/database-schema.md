# Firestore Database Schema

This document describes the hierarchical structure of the Firestore database for the Insight multi-tenant eCommerce reporting dashboard.

## Database Structure

The database uses a hierarchical structure with subcollections to organize data by client.

```
/users/{user_id}
/clients/{client_id}
  /websites/{website_id}
  /targets/{target_id}
  /annotations/{annotation_id}
  /customLinks/{link_id}
```

## Collections

### Root Collection: `/users/{user_id}`

Stores user authentication and authorization data.

**Document ID**: Firebase Auth UID

**Fields**:
- `uid` (string): Firebase Auth UID
- `email` (string): User's email address
- `role` (string): User role - either "admin" or "client"
- `clientId` (string | null): Client ID for client users, null for admins
- `createdAt` (timestamp): Document creation timestamp
- `updatedAt` (timestamp): Last update timestamp

**Example**:
```json
{
  "uid": "abc123xyz",
  "email": "john@sanderson.com",
  "role": "client",
  "clientId": "sanderson_design_group",
  "createdAt": "2024-01-15T10:00:00Z",
  "updatedAt": "2024-01-15T10:00:00Z"
}
```

---

### Root Collection: `/clients/{client_id}`

Stores client organization data.

**Document ID**: Client slug (e.g., "sanderson_design_group")

**Fields**:
- `id` (string): Client ID (same as document ID)
- `clientName` (string): Display name of the client
- `bigQueryDatasetId` (string): The BigQuery dataset ID for this client (e.g., "sanderson_design_group")
- `createdAt` (timestamp): Document creation timestamp
- `updatedAt` (timestamp): Last update timestamp

**Example**:
```json
{
  "id": "sanderson_design_group",
  "clientName": "Sanderson Design Group",
  "bigQueryDatasetId": "sanderson_design_group",
  "createdAt": "2024-01-01T00:00:00Z",
  "updatedAt": "2024-01-01T00:00:00Z"
}
```

---

### Subcollection: `/clients/{client_id}/websites/{website_id}`

Stores website/brand data for each client.

**Document ID**: Website slug (e.g., "harlequin")

**Fields**:
- `id` (string): Website ID (same as document ID)
- `websiteName` (string): Display name of the website/brand
- `bigQueryWebsiteId` (string): The website_id value used in this client's BigQuery tables (e.g., "harlequin", "sanderson_uk")
- `createdAt` (timestamp): Document creation timestamp
- `updatedAt` (timestamp): Last update timestamp

**Example**:
```json
{
  "id": "harlequin",
  "websiteName": "Harlequin",
  "bigQueryWebsiteId": "harlequin",
  "createdAt": "2024-01-01T00:00:00Z",
  "updatedAt": "2024-01-01T00:00:00Z"
}
```

**Note**: Each client has their own BigQuery dataset (stored in `Client.bigQueryDatasetId`). The `bigQueryWebsiteId` is the `website_id` column value used within that client's dataset tables.

---

### Subcollection: `/clients/{client_id}/targets/{target_id}`

Stores performance targets for metrics.

**Document ID**: Auto-generated

**Fields**:
- `id` (string): Target ID (same as document ID)
- `metric` (string): Metric type - "revenue", "roas", "cpa", or "sessions"
- `granularity` (string): Time granularity - "monthly" or "yearly"
- `startDate` (string): ISO 8601 timestamp for when target starts
- `value` (number): Target value
- `websiteId` (string): Website ID or "all_combined" for combined totals
- `createdAt` (timestamp): Document creation timestamp
- `updatedAt` (timestamp): Last update timestamp

**Example**:
```json
{
  "id": "target_001",
  "metric": "revenue",
  "granularity": "monthly",
  "startDate": "2024-01-01T00:00:00Z",
  "value": 50000,
  "websiteId": "harlequin",
  "createdAt": "2024-01-01T00:00:00Z",
  "updatedAt": "2024-01-01T00:00:00Z"
}
```

---

### Subcollection: `/clients/{client_id}/annotations/{annotation_id}`

Stores user-created annotations for events, insights, and notes.

**Document ID**: Auto-generated

**Fields**:
- `id` (string): Annotation ID (same as document ID)
- `note` (string): Annotation text content
- `type` (string): Annotation type - "event", "info", "issue", "insight", or "test"
- `startDate` (string): ISO 8601 timestamp for annotation start
- `endDate` (string): ISO 8601 timestamp for annotation end
- `level` (string): Scope level - "client", "website", or "report"
- `websiteId` (string | null): Website ID if level is "website" or "report"
- `reportId` (string | null): Report ID if level is "report"
- `createdBy` (string): User ID who created the annotation
- `createdAt` (timestamp): Document creation timestamp
- `updatedAt` (timestamp): Last update timestamp

**Example**:
```json
{
  "id": "annotation_001",
  "note": "Black Friday sale campaign launched",
  "type": "event",
  "startDate": "2024-11-24T00:00:00Z",
  "endDate": "2024-11-27T23:59:59Z",
  "level": "website",
  "websiteId": "harlequin",
  "reportId": null,
  "createdBy": "abc123xyz",
  "createdAt": "2024-11-20T10:00:00Z",
  "updatedAt": "2024-11-20T10:00:00Z"
}
```

---

### Subcollection: `/clients/{client_id}/customLinks/{link_id}`

Stores custom resource links for the client sidebar.

**Document ID**: Auto-generated

**Fields**:
- `id` (string): Link ID (same as document ID)
- `name` (string): Display name for the link
- `url` (string): Full URL to the resource
- `sortOrder` (number): Order for displaying links (lower numbers first)
- `createdAt` (timestamp): Document creation timestamp
- `updatedAt` (timestamp): Last update timestamp

**Example**:
```json
{
  "id": "link_001",
  "name": "ClickUp Roadmap",
  "url": "https://clickup.com/sanderson/roadmap",
  "sortOrder": 1,
  "createdAt": "2024-01-01T00:00:00Z",
  "updatedAt": "2024-01-01T00:00:00Z"
}
```

## Security Rules

Security is enforced at the application level. All API routes and Server Components must:

1. Verify the user's Firebase token
2. Get the user's role and clientId from Firestore
3. Inject the appropriate clientId and websiteId into all BigQuery queries

**Admin users** can access all clients and their data.

**Client users** can only access data where the clientId matches their assigned clientId.

## Indexes

Required composite indexes:

1. **Annotations by client and date**:
   - Collection: `clients/{client_id}/annotations`
   - Fields: `startDate` (Ascending), `endDate` (Ascending)

2. **Targets by website and metric**:
   - Collection: `clients/{client_id}/targets`
   - Fields: `websiteId` (Ascending), `metric` (Ascending), `startDate` (Ascending)

3. **Custom links by sort order**:
   - Collection: `clients/{client_id}/customLinks`
   - Fields: `sortOrder` (Ascending)

