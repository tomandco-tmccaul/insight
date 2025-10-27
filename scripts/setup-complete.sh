#!/bin/bash

# Complete Setup Script for Insight Dashboard
# This script sets up Firebase, Google Cloud, and BigQuery from scratch
#
# Prerequisites:
# 1. gcloud CLI installed (https://cloud.google.com/sdk/docs/install)
# 2. firebase CLI installed (npm install -g firebase-tools)
# 3. Logged in to both CLIs
#
# Usage:
#   chmod +x scripts/setup-complete.sh
#   ./scripts/setup-complete.sh

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
# Check if PROJECT_ID is provided as argument, otherwise generate one
if [ -z "$1" ]; then
    PROJECT_ID="insight-dashboard-$(date +%s)"  # Unique project ID
else
    PROJECT_ID="$1"
fi
PROJECT_NAME="Insight Dashboard"
REGION="us-central1"
DATASET_ID="insight_analytics"
SERVICE_ACCOUNT_NAME="insight-service-account"

echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║                                                            ║${NC}"
echo -e "${BLUE}║        Insight Dashboard - Complete Setup Script          ║${NC}"
echo -e "${BLUE}║                                                            ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Step 0: Check prerequisites
echo -e "${YELLOW}📋 Checking prerequisites...${NC}"

if ! command -v gcloud &> /dev/null; then
    echo -e "${RED}❌ gcloud CLI not found. Please install: https://cloud.google.com/sdk/docs/install${NC}"
    exit 1
fi

if ! command -v firebase &> /dev/null; then
    echo -e "${RED}❌ firebase CLI not found. Installing...${NC}"
    npm install -g firebase-tools
fi

echo -e "${GREEN}✅ Prerequisites check passed${NC}\n"

# Step 1: Login to Google Cloud and Firebase
echo -e "${YELLOW}🔐 Step 1: Authentication${NC}"
echo -e "   Logging in to Google Cloud..."

gcloud auth login --quiet || {
    echo -e "${RED}❌ Google Cloud login failed${NC}"
    exit 1
}

echo -e "   Logging in to Firebase..."
firebase login --no-localhost || {
    echo -e "${RED}❌ Firebase login failed${NC}"
    exit 1
}

echo -e "${GREEN}✅ Authentication successful${NC}\n"

# Step 2: Create Google Cloud Project
echo -e "${YELLOW}🏗️  Step 2: Creating Google Cloud Project${NC}"
echo -e "   Project ID: ${PROJECT_ID}"

gcloud projects create ${PROJECT_ID} --name="${PROJECT_NAME}" || {
    echo -e "${RED}❌ Failed to create project. It may already exist.${NC}"
    echo -e "${YELLOW}   Using existing project: ${PROJECT_ID}${NC}"
}

# Set as default project
gcloud config set project ${PROJECT_ID}

echo -e "${GREEN}✅ Project created/configured${NC}\n"

# Step 3: Link billing account
echo -e "${YELLOW}💳 Step 3: Linking Billing Account${NC}"
echo -e "   ${BLUE}Note: You need to link a billing account manually if not already done${NC}"
echo -e "   Visit: https://console.cloud.google.com/billing/linkedaccount?project=${PROJECT_ID}"
echo ""
read -p "   Press Enter once billing is linked (or if already linked)..."

echo -e "${GREEN}✅ Billing configured${NC}\n"

# Step 4: Enable required APIs
echo -e "${YELLOW}🔌 Step 4: Enabling Google Cloud APIs${NC}"

APIS=(
    "firebase.googleapis.com"
    "firestore.googleapis.com"
    "bigquery.googleapis.com"
    "bigquerydatatransfer.googleapis.com"
    "cloudbuild.googleapis.com"
    "cloudresourcemanager.googleapis.com"
    "iam.googleapis.com"
    "iamcredentials.googleapis.com"
)

for api in "${APIS[@]}"; do
    echo -e "   Enabling ${api}..."
    gcloud services enable ${api} --project=${PROJECT_ID}
done

echo -e "${GREEN}✅ All APIs enabled${NC}\n"

# Step 5: Initialize Firebase
echo -e "${YELLOW}🔥 Step 5: Initializing Firebase${NC}"

# Add Firebase to the project
firebase projects:addfirebase ${PROJECT_ID} || {
    echo -e "${YELLOW}   Firebase already added to project${NC}"
}

# Create Firebase web app
echo -e "   Creating Firebase web app..."
firebase apps:create WEB "Insight Dashboard" --project=${PROJECT_ID} || {
    echo -e "${YELLOW}   Web app may already exist${NC}"
}

echo -e "${GREEN}✅ Firebase initialized${NC}\n"

# Step 6: Create Firestore database
echo -e "${YELLOW}📊 Step 6: Creating Firestore Database${NC}"

gcloud firestore databases create --location=${REGION} --project=${PROJECT_ID} || {
    echo -e "${YELLOW}   Firestore database may already exist${NC}"
}

echo -e "${GREEN}✅ Firestore database created${NC}\n"

# Step 7: Create Service Account
echo -e "${YELLOW}👤 Step 7: Creating Service Account${NC}"

SERVICE_ACCOUNT_EMAIL="${SERVICE_ACCOUNT_NAME}@${PROJECT_ID}.iam.gserviceaccount.com"

gcloud iam service-accounts create ${SERVICE_ACCOUNT_NAME} \
    --display-name="Insight Dashboard Service Account" \
    --project=${PROJECT_ID} || {
    echo -e "${YELLOW}   Service account may already exist${NC}"
}

# Grant necessary roles
echo -e "   Granting roles to service account..."

ROLES=(
    "roles/bigquery.admin"
    "roles/datastore.user"
    "roles/firebase.admin"
)

for role in "${ROLES[@]}"; do
    gcloud projects add-iam-policy-binding ${PROJECT_ID} \
        --member="serviceAccount:${SERVICE_ACCOUNT_EMAIL}" \
        --role="${role}" \
        --quiet
done

echo -e "${GREEN}✅ Service account created and configured${NC}\n"

# Step 8: Create and download service account key
echo -e "${YELLOW}🔑 Step 8: Creating Service Account Key${NC}"

KEY_FILE="./service-account-key.json"

gcloud iam service-accounts keys create ${KEY_FILE} \
    --iam-account=${SERVICE_ACCOUNT_EMAIL} \
    --project=${PROJECT_ID}

echo -e "${GREEN}✅ Service account key created: ${KEY_FILE}${NC}\n"

# Step 9: Get Firebase config
echo -e "${YELLOW}⚙️  Step 9: Retrieving Firebase Configuration${NC}"

# Wait a moment for Firebase to be ready
sleep 3

# Get Firebase config using our custom script
echo -e "   Fetching Firebase SDK config..."
FIREBASE_CONFIG=$(node scripts/get-firebase-config.js ${PROJECT_ID} 2>&1)

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Failed to get Firebase config automatically${NC}"
    echo -e "${YELLOW}   Please get your Firebase config from:${NC}"
    echo -e "${BLUE}   https://console.firebase.google.com/project/${PROJECT_ID}/settings/general${NC}"
    FIREBASE_CONFIG=""
else
    echo -e "${GREEN}✅ Firebase config retrieved${NC}"
fi
echo ""

# Step 10: Create BigQuery dataset
echo -e "${YELLOW}📊 Step 10: Creating BigQuery Dataset${NC}"

bq mk --location=US --dataset ${PROJECT_ID}:${DATASET_ID} || {
    echo -e "${YELLOW}   Dataset may already exist${NC}"
}

echo -e "${GREEN}✅ BigQuery dataset created${NC}\n"

# Step 11: Create .env.local file
echo -e "${YELLOW}📝 Step 11: Creating Environment Configuration${NC}"

# Extract private key from service account JSON
PRIVATE_KEY=$(cat ${KEY_FILE} | grep -o '"private_key": "[^"]*"' | cut -d'"' -f4)

# Create .env.local with actual values
cat > .env.local << EOF
# Firebase Client Configuration (NEXT_PUBLIC_*)
${FIREBASE_CONFIG}

# Use Firebase Emulators for local development (set to false for production)
NEXT_PUBLIC_USE_FIREBASE_EMULATOR=false

# Firebase Admin (Server-side)
FIREBASE_PROJECT_ID=${PROJECT_ID}
FIREBASE_CLIENT_EMAIL=${SERVICE_ACCOUNT_EMAIL}
FIREBASE_PRIVATE_KEY="${PRIVATE_KEY}"

# Google Cloud
GOOGLE_CLOUD_PROJECT=${PROJECT_ID}
BIGQUERY_DATASET_ID=${DATASET_ID}
GOOGLE_APPLICATION_CREDENTIALS=./service-account-key.json

# Genkit AI (optional - get from https://aistudio.google.com/app/apikey)
GOOGLE_GENAI_API_KEY=YOUR_GENAI_API_KEY_HERE
EOF

echo -e "${GREEN}✅ Environment file created: .env.local${NC}\n"

# Step 12: Deploy Firestore rules
echo -e "${YELLOW}🔒 Step 12: Deploying Firestore Security Rules${NC}"

firebase deploy --only firestore:rules --project=${PROJECT_ID} || {
    echo -e "${YELLOW}   Firestore rules deployment skipped${NC}"
}

echo -e "${GREEN}✅ Firestore rules deployed${NC}\n"

# Step 13: Summary and next steps
echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║                                                            ║${NC}"
echo -e "${BLUE}║                  🎉 Setup Complete! 🎉                     ║${NC}"
echo -e "${BLUE}║                                                            ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${GREEN}✅ Google Cloud Project:${NC} ${PROJECT_ID}"
echo -e "${GREEN}✅ Firebase Project:${NC} ${PROJECT_ID}"
echo -e "${GREEN}✅ Service Account:${NC} ${SERVICE_ACCOUNT_EMAIL}"
echo -e "${GREEN}✅ Service Account Key:${NC} ${KEY_FILE}"
echo -e "${GREEN}✅ BigQuery Dataset:${NC} ${DATASET_ID}"
echo ""
echo -e "${YELLOW}📋 Next Steps:${NC}"
echo ""
echo -e "1. ${BLUE}Get Firebase Config:${NC}"
echo -e "   Visit: ${BLUE}https://console.firebase.google.com/project/${PROJECT_ID}/settings/general${NC}"
echo -e "   Copy the config values and update .env.local.template"
echo ""
echo -e "2. ${BLUE}Complete .env.local:${NC}"
echo -e "   cp .env.local.template .env.local"
echo -e "   # Edit .env.local and fill in the Firebase config values"
echo ""
echo -e "3. ${BLUE}Set up BigQuery tables and test data:${NC}"
echo -e "   npm run setup:bigquery"
echo ""
echo -e "4. ${BLUE}Start the development server:${NC}"
echo -e "   npm run dev"
echo ""
echo -e "5. ${BLUE}Create your first admin user:${NC}"
echo -e "   Visit: http://localhost:3000"
echo -e "   Sign up with your email"
echo -e "   Manually set role to 'admin' in Firestore console"
echo ""
echo -e "${YELLOW}📚 Resources:${NC}"
echo -e "   • Firebase Console: ${BLUE}https://console.firebase.google.com/project/${PROJECT_ID}${NC}"
echo -e "   • Google Cloud Console: ${BLUE}https://console.cloud.google.com/home/dashboard?project=${PROJECT_ID}${NC}"
echo -e "   • BigQuery Console: ${BLUE}https://console.cloud.google.com/bigquery?project=${PROJECT_ID}${NC}"
echo ""
echo -e "${GREEN}🎊 Happy coding!${NC}"
echo ""

