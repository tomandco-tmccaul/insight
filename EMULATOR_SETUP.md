# Firebase Emulator Setup for Local Development

This guide explains how to run the Insight dashboard locally using Firebase Emulators.

## 🚀 Quick Start

### 1. Start Firebase Emulators

```bash
npm run emulators
```

This will start:
- **Authentication Emulator** on `localhost:9099`
- **Firestore Emulator** on `localhost:8080`
- **Emulator UI** on `http://localhost:4000`

### 2. Seed Test Data (First Time Only)

In a new terminal:

```bash
npm run emulators:seed
```

This creates:
- 2 test users (admin and client)
- 1 test client (Sanderson Design Group)
- 2 test websites (Sanderson UK, Harlequin)
- 2 test annotations
- 1 test target
- 1 test custom link

### 3. Start Next.js Dev Server

In another terminal:

```bash
npm run dev
```

The app will be available at `http://localhost:3000`

## 🔑 Test Credentials

### Admin User
- **Email:** `admin@tomandco.co.uk`
- **Password:** `password123`
- **Access:** Can see all clients and manage everything

### Client User
- **Email:** `client@sanderson.com`
- **Password:** `password123`
- **Access:** Can only see Sanderson Design Group data

## 📊 Emulator UI

Access the Firebase Emulator UI at `http://localhost:4000` to:
- View and manage test users
- Browse Firestore data
- Monitor authentication events
- Clear data and reset

## 🛠️ Available Commands

```bash
# Start emulators only
npm run emulators

# Seed test data
npm run emulators:seed

# Start dev server only
npm run dev

# Start both emulators and dev server (requires concurrently)
npm run dev:emulator
```

## 📁 Emulator Data

Emulator data is stored in memory and will be lost when you stop the emulators. To persist data between sessions, you can export/import data using the Emulator UI.

## 🔧 Configuration Files

- **`.env.local`** - Environment variables configured for emulators
- **`firebase.json`** - Emulator ports and settings
- **`.firebaserc`** - Project configuration (demo-project)
- **`scripts/seed-emulator.ts`** - Seed script for test data

## 🐛 Troubleshooting

### Emulators won't start
- Make sure ports 4000, 8080, and 9099 are not in use
- Check Java version (requires Java 11+)

### Can't log in
- Make sure emulators are running
- Check that `.env.local` has `NEXT_PUBLIC_USE_FIREBASE_EMULATOR=true`
- Verify test users were created by running `npm run emulators:seed`

### Data not showing
- BigQuery is not emulated - you'll see "No data" messages on reporting pages
- This is expected - the emulator only handles Auth and Firestore
- To test with real data, you'll need to connect to a real BigQuery instance

## 📝 Notes

- **No BigQuery Emulator:** Google doesn't provide a BigQuery emulator, so reporting pages will show "No data available"
- **Annotations Work:** The annotations system is fully functional with the emulator
- **Admin Pages Work:** Client and user management work with emulated Firestore
- **Authentication Works:** Full email/password and Google OAuth (emulated) work

## 🎯 What You Can Test

✅ **Working with Emulators:**
- Login/Logout (email/password)
- User authentication and authorization
- Protected routes
- Annotations CRUD operations
- Admin client management
- Admin user management
- Role-based access control

❌ **Not Working (Requires Real Services):**
- Sales, Product, Marketing, Website reporting pages (need BigQuery)
- AI analysis (needs Gemini API)
- PDF/XLS exports (needs Cloud Tasks)

## 🔄 Resetting Data

To reset all emulator data:

1. Stop the emulators (Ctrl+C)
2. Restart them: `npm run emulators`
3. Re-seed data: `npm run emulators:seed`

## 🚀 Next Steps

Once you're ready to deploy:

1. Create a real Firebase project
2. Update `.env.local` with real credentials
3. Set `NEXT_PUBLIC_USE_FIREBASE_EMULATOR=false`
4. Set up BigQuery with real data
5. Deploy to Firebase Hosting

---

**Happy Testing! 🎉**

