#!/bin/bash

# Firebase App Hosting - Secrets Setup Script
# This script creates all required secrets in Google Secret Manager
# Run this script once before deploying to Firebase App Hosting

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}================================${NC}"
echo -e "${GREEN}Firebase App Hosting Secrets Setup${NC}"
echo -e "${GREEN}================================${NC}\n"

# Check if gcloud is installed
if ! command -v gcloud &> /dev/null; then
    echo -e "${RED}Error: gcloud CLI is not installed${NC}"
    echo "Please install it from: https://cloud.google.com/sdk/docs/install"
    exit 1
fi

# Get project ID
PROJECT_ID=$(gcloud config get-value project 2>/dev/null)
if [ -z "$PROJECT_ID" ]; then
    echo -e "${RED}Error: No GCP project set${NC}"
    echo "Run: gcloud config set project YOUR_PROJECT_ID"
    exit 1
fi

echo -e "${GREEN}Using GCP Project: ${PROJECT_ID}${NC}\n"

# Function to create or update a secret
create_secret() {
    local SECRET_NAME=$1
    local SECRET_VALUE=$2
    local DESCRIPTION=$3
    
    if [ -z "$SECRET_VALUE" ]; then
        echo -e "${YELLOW}Skipping ${SECRET_NAME} (no value provided)${NC}"
        return
    fi
    
    # Check if secret exists
    if gcloud secrets describe "$SECRET_NAME" --project="$PROJECT_ID" &>/dev/null; then
        echo -e "${YELLOW}Secret ${SECRET_NAME} already exists. Creating new version...${NC}"
        echo -n "$SECRET_VALUE" | gcloud secrets versions add "$SECRET_NAME" \
            --project="$PROJECT_ID" \
            --data-file=-
    else
        echo -e "${GREEN}Creating secret ${SECRET_NAME}...${NC}"
        echo -n "$SECRET_VALUE" | gcloud secrets create "$SECRET_NAME" \
            --project="$PROJECT_ID" \
            --replication-policy="automatic" \
            --data-file=-
        
        # Add labels
        gcloud secrets update "$SECRET_NAME" \
            --project="$PROJECT_ID" \
            --update-labels=managed-by=firebase-app-hosting,app=insight
    fi
    
    echo -e "${GREEN}✓ ${SECRET_NAME} configured${NC}\n"
}

# Function to read secret from .env.local if it exists
read_env_var() {
    local VAR_NAME=$1
    local ENV_FILE=".env.local"
    
    if [ -f "$ENV_FILE" ]; then
        local VALUE=$(grep "^${VAR_NAME}=" "$ENV_FILE" | cut -d '=' -f2- | tr -d '"' | tr -d "'")
        echo "$VALUE"
    fi
}

echo -e "${YELLOW}Note: This script will read values from .env.local if available${NC}"
echo -e "${YELLOW}You can also manually enter values when prompted${NC}\n"

# Enable Secret Manager API
echo -e "${GREEN}Enabling Secret Manager API...${NC}"
gcloud services enable secretmanager.googleapis.com --project="$PROJECT_ID"
echo ""

# Create secrets
echo -e "${GREEN}Setting up secrets...${NC}\n"

# 1. Google Generative AI API Key
GOOGLE_GENAI_API_KEY=$(read_env_var "GOOGLE_GENAI_API_KEY")
if [ -z "$GOOGLE_GENAI_API_KEY" ]; then
    echo -e "${YELLOW}Enter GOOGLE_GENAI_API_KEY (Gemini API key):${NC}"
    read -r GOOGLE_GENAI_API_KEY
fi
create_secret "GOOGLE_GENAI_API_KEY" "$GOOGLE_GENAI_API_KEY" "Google Generative AI API Key for Gemini"

# 2. Firebase Admin - Project ID
FIREBASE_PROJECT_ID=${PROJECT_ID}
create_secret "FIREBASE_PROJECT_ID" "$FIREBASE_PROJECT_ID" "Firebase Project ID"

# 3. Firebase Admin - Client Email
FIREBASE_CLIENT_EMAIL=$(read_env_var "FIREBASE_CLIENT_EMAIL")
if [ -z "$FIREBASE_CLIENT_EMAIL" ]; then
    echo -e "${YELLOW}Enter FIREBASE_CLIENT_EMAIL (from service account):${NC}"
    read -r FIREBASE_CLIENT_EMAIL
fi
create_secret "FIREBASE_CLIENT_EMAIL" "$FIREBASE_CLIENT_EMAIL" "Firebase Admin Service Account Email"

# 4. Firebase Admin - Private Key
FIREBASE_PRIVATE_KEY=$(read_env_var "FIREBASE_PRIVATE_KEY")
if [ -z "$FIREBASE_PRIVATE_KEY" ]; then
    echo -e "${YELLOW}Enter FIREBASE_PRIVATE_KEY (from service account, with newlines as \\\\n):${NC}"
    read -r FIREBASE_PRIVATE_KEY
fi
create_secret "FIREBASE_PRIVATE_KEY" "$FIREBASE_PRIVATE_KEY" "Firebase Admin Service Account Private Key"

# 5. Firebase Client - API Key
NEXT_PUBLIC_FIREBASE_API_KEY=$(read_env_var "NEXT_PUBLIC_FIREBASE_API_KEY")
if [ -z "$NEXT_PUBLIC_FIREBASE_API_KEY" ]; then
    echo -e "${YELLOW}Enter NEXT_PUBLIC_FIREBASE_API_KEY (from Firebase Console):${NC}"
    read -r NEXT_PUBLIC_FIREBASE_API_KEY
fi
create_secret "NEXT_PUBLIC_FIREBASE_API_KEY" "$NEXT_PUBLIC_FIREBASE_API_KEY" "Firebase Client API Key"

# 6. Firebase Client - Messaging Sender ID
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=$(read_env_var "NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID")
if [ -z "$NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID" ]; then
    echo -e "${YELLOW}Enter NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID:${NC}"
    read -r NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
fi
create_secret "NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID" "$NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID" "Firebase Messaging Sender ID"

# 7. Firebase Client - App ID
NEXT_PUBLIC_FIREBASE_APP_ID=$(read_env_var "NEXT_PUBLIC_FIREBASE_APP_ID")
if [ -z "$NEXT_PUBLIC_FIREBASE_APP_ID" ]; then
    echo -e "${YELLOW}Enter NEXT_PUBLIC_FIREBASE_APP_ID:${NC}"
    read -r NEXT_PUBLIC_FIREBASE_APP_ID
fi
create_secret "NEXT_PUBLIC_FIREBASE_APP_ID" "$NEXT_PUBLIC_FIREBASE_APP_ID" "Firebase App ID"

# 8. Google Cloud Project
GOOGLE_CLOUD_PROJECT=${PROJECT_ID}
create_secret "GOOGLE_CLOUD_PROJECT" "$GOOGLE_CLOUD_PROJECT" "Google Cloud Project ID"

echo -e "\n${GREEN}================================${NC}"
echo -e "${GREEN}Secrets Setup Complete!${NC}"
echo -e "${GREEN}================================${NC}\n"

echo -e "${GREEN}Next steps:${NC}"
echo -e "1. Grant App Hosting service account access to secrets:"
echo -e "   ${YELLOW}gcloud projects add-iam-policy-binding ${PROJECT_ID} \\${NC}"
echo -e "   ${YELLOW}     --member='serviceAccount:firebase-app-hosting@${PROJECT_ID}.iam.gserviceaccount.com' \\${NC}"
echo -e "   ${YELLOW}     --role='roles/secretmanager.secretAccessor'${NC}\n"
echo -e "2. Deploy to Firebase App Hosting:"
echo -e "   ${YELLOW}firebase apphosting:backends:create${NC}"
echo -e "   or"
echo -e "   ${YELLOW}firebase deploy --only apphosting${NC}\n"
echo -e "3. View all secrets:"
echo -e "   ${YELLOW}gcloud secrets list --project=${PROJECT_ID}${NC}\n"

echo -e "${YELLOW}Tip: To update a secret value later, use:${NC}"
echo -e "${YELLOW}echo -n 'new-value' | gcloud secrets versions add SECRET_NAME --data-file=-${NC}\n"

