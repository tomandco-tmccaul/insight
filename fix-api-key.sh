#!/bin/bash

# Fix Firebase API Key Restrictions for App Hosting
set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${GREEN}================================${NC}"
echo -e "${GREEN}Firebase API Key Restriction Fix${NC}"
echo -e "${GREEN}================================${NC}\n"

PROJECT_ID="tomandco-hosting"
API_KEY="AIzaSyCkkB5Fcq51g1lmvoP0vgJLvVFJBEsS4A0"

echo -e "${YELLOW}The API key error is likely due to restrictions on the API key.${NC}\n"

echo -e "${GREEN}Steps to fix:${NC}\n"

echo "1. Go to Google Cloud Console API Credentials:"
echo -e "   ${YELLOW}https://console.cloud.google.com/apis/credentials?project=${PROJECT_ID}${NC}\n"

echo "2. Find the API key: Browser key (auto created by Firebase)"
echo -e "   Key starts with: ${YELLOW}${API_KEY:0:20}...${NC}\n"

echo "3. Click on the API key to edit it\n"

echo "4. Under 'Application restrictions', you have two options:\n"
echo -e "   ${GREEN}Option A (Recommended):${NC} Select 'None' to allow from any domain"
echo -e "   ${GREEN}Option B (More Secure):${NC} Select 'HTTP referrers' and add:"
echo "      - http://localhost:3000/*"
echo "      - https://*.web.app/*"
echo "      - https://*.firebaseapp.com/*"
echo "      - https://*.appspot.com/*"
echo "      - https://tomandco-hosting.web.app/*"
echo ""

echo "5. Under 'API restrictions', ensure these APIs are enabled:"
echo "   - Identity Toolkit API"
echo "   - Token Service API"
echo ""

echo "6. Click 'Save'\n"

echo -e "${YELLOW}Checking if Identity Toolkit API is enabled...${NC}"
if gcloud services list --enabled --project=${PROJECT_ID} | grep -q "identitytoolkit.googleapis.com"; then
    echo -e "${GREEN}✓ Identity Toolkit API is enabled${NC}\n"
else
    echo -e "${RED}✗ Identity Toolkit API is NOT enabled${NC}"
    echo -e "${YELLOW}Enabling Identity Toolkit API...${NC}"
    gcloud services enable identitytoolkit.googleapis.com --project=${PROJECT_ID}
    echo -e "${GREEN}✓ Identity Toolkit API enabled${NC}\n"
fi

echo -e "${YELLOW}Checking if Token Service API is enabled...${NC}"
if gcloud services list --enabled --project=${PROJECT_ID} | grep -q "securetoken.googleapis.com"; then
    echo -e "${GREEN}✓ Token Service API is enabled${NC}\n"
else
    echo -e "${RED}✗ Token Service API is NOT enabled${NC}"
    echo -e "${YELLOW}Enabling Token Service API...${NC}"
    gcloud services enable securetoken.googleapis.com --project=${PROJECT_ID}
    echo -e "${GREEN}✓ Token Service API enabled${NC}\n"
fi

echo -e "${GREEN}================================${NC}"
echo -e "${GREEN}Alternative: Create Unrestricted Key${NC}"
echo -e "${GREEN}================================${NC}\n"

echo -e "${YELLOW}If the above doesn't work, you can create a new unrestricted API key:${NC}\n"
echo "1. Go to Firebase Console:"
echo -e "   ${YELLOW}https://console.firebase.google.com/project/${PROJECT_ID}/settings/general${NC}\n"

echo "2. Scroll down to 'Your apps' > Web apps"
echo "3. Find your web app and look for 'apiKey' in the config"
echo "4. Or create a new Web app with an unrestricted key\n"

echo -e "${GREEN}Quick fix command:${NC}"
echo -e "${YELLOW}# This will get the Web App config which might have a different API key:${NC}"
echo "firebase apps:sdkconfig web"
echo ""

