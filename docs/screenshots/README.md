# Screenshots for Google Ads API Design Document

This directory contains screenshots to include in the design documentation.

## Required Screenshots

### 1. Dashboard Overview
**Filename:** `01-dashboard-overview.png`
**What to capture:** Main sales dashboard showing KPI cards, charts, and navigation
**How to capture:**
1. Run `npm run dev`
2. Navigate to http://localhost:3000
3. Login as admin user
4. Select a client with data (e.g., Sanderson Design Group)
5. Take full-page screenshot

### 2. Marketing Dashboard (Future Google Ads Integration)
**Filename:** `02-marketing-dashboard.png`
**What to capture:** Digital Marketing Breakdown page
**How to capture:**
1. Navigate to "Digital Marketing Breakdown" in sidebar
2. Take full-page screenshot
3. This shows where Google Ads data will be displayed

### 3. Integration Settings (Mockup)
**Filename:** `03-integration-settings.png`
**What to capture:** Admin → Integrations page (or create mockup)
**How to capture:**
1. Navigate to Admin → Clients
2. Take screenshot showing client management
3. Note: You may need to create a mockup of the Google Ads integration settings page

### 4. AI Chat Interface
**Filename:** `04-ai-chat-interface.png`
**What to capture:** AI assistant panel with example query
**How to capture:**
1. Click the sparkles button to open AI chat
2. Ask a question like "What's my total revenue?"
3. Wait for response
4. Take screenshot showing the conversation

### 5. Sales Performance Page
**Filename:** `05-sales-performance.png`
**What to capture:** Detailed sales analytics page
**How to capture:**
1. Navigate to "Sales Performance" in sidebar
2. Ensure data is loaded
3. Take full-page screenshot

### 6. Login Page
**Filename:** `06-login-page.png`
**What to capture:** Authentication page
**How to capture:**
1. Logout or open in incognito window
2. Navigate to http://localhost:3000/login
3. Take screenshot

## Screenshot Guidelines

- **Resolution:** Minimum 1920x1080
- **Format:** PNG (preferred) or JPG
- **Quality:** High quality, no compression artifacts
- **Content:** Ensure no sensitive/real client data is visible
- **Annotations:** Consider adding arrows or highlights to key features

## Tools for Taking Screenshots

### macOS
- **Full Screen:** Cmd + Shift + 3
- **Selection:** Cmd + Shift + 4
- **Window:** Cmd + Shift + 4, then press Space

### Chrome DevTools
- Open DevTools (F12)
- Cmd + Shift + P (Mac) or Ctrl + Shift + P (Windows)
- Type "screenshot"
- Select "Capture full size screenshot"

### Browser Extensions
- **Awesome Screenshot** - https://www.awesomescreenshot.com/
- **Nimbus Screenshot** - https://nimbusweb.me/screenshot.php

## Creating Mockups for Future Features

For features not yet implemented (like Google Ads integration settings):

1. Use Figma, Sketch, or similar design tool
2. Match the existing UI style (shadcn/ui components)
3. Show realistic data and layout
4. Export as PNG

Alternatively, you can use the existing screenshots and add annotations in the Word document explaining "This is where Google Ads data will appear."

## After Taking Screenshots

1. Save all screenshots to this directory
2. Optimize file sizes if needed (use ImageOptim or similar)
3. Insert into the Word/Google Doc at appropriate sections
4. Add captions explaining what each screenshot shows

