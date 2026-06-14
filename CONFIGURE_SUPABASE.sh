#!/bin/bash

# ============================================
# HostelOS Supabase Configuration Script
# ============================================
# Automatically configures environment variables for Supabase connection

set -e

echo "🚀 Configuring HostelOS with Supabase"
echo "======================================"
echo ""

# Color codes
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Supabase Project Reference
PROJECT_REF="oegqratzpvyxezfxiqnm"
SUPABASE_URL="https://${PROJECT_REF}.supabase.co"

# Your provided credentials (REPLACE WITH YOUR OWN KEYS)
# Get these from your Supabase Dashboard → Settings → API
ANON_KEY="YOUR_ANON_KEY_HERE"
SERVICE_KEY="YOUR_SERVICE_KEY_HERE"

echo -e "${BLUE}Step 1: Setting up Backend Configuration${NC}"
echo ""

# Create backend .env
cat > backend/.env << EOF
# ============================================
# SUPABASE DATABASE CONFIGURATION
# ============================================

# Supabase Connection Pooler (for pgBouncer - recommended for production)
# Format: postgresql://[user]:[password]@[host]:6543/postgres?pgbouncer=true
# Get password from: Supabase Dashboard → Project Settings → Database → Reveal password
# NOTE: You'll need to replace PASSWORD with your actual database password
DATABASE_URL=postgresql://postgres:YOUR_DATABASE_PASSWORD@db.${PROJECT_REF}.supabase.co:6543/postgres?pgbouncer=true

# Alternative: Direct connection (for development)
# DATABASE_URL=postgresql://postgres:YOUR_DATABASE_PASSWORD@db.${PROJECT_REF}.supabase.co:5432/postgres

# ============================================
# SUPABASE API CONFIGURATION
# ============================================

# Supabase Project URL
SUPABASE_URL=${SUPABASE_URL}

# Service Role Key (Backend only - KEEP SECRET)
SUPABASE_SERVICE_ROLE_KEY=${SERVICE_KEY}

# ============================================
# AUTHENTICATION
# ============================================

# JWT Secret for token signing (generate with: openssl rand -base64 32)
JWT_SECRET=\$(openssl rand -base64 32)

# ============================================
# SERVER CONFIGURATION
# ============================================

PORT=5001
NODE_ENV=development
FRONTEND_URL=http://localhost:5173

# ============================================
# PAYMENT GATEWAY (Optional - for Razorpay)
# ============================================

# RAZORPAY_KEY_ID=
# RAZORPAY_KEY_SECRET=
EOF

echo -e "${GREEN}✅ Backend .env created${NC}"
echo ""

echo -e "${BLUE}Step 2: Setting up Frontend Configuration${NC}"
echo ""

# Create frontend .env.local
cat > .env.local << EOF
# ============================================
# SUPABASE CONFIGURATION
# ============================================

# Supabase Project URL
VITE_SUPABASE_URL=${SUPABASE_URL}

# Supabase Anon Key (Public - safe to expose in frontend)
VITE_SUPABASE_ANON_KEY=${ANON_KEY}

# ============================================
# BACKEND API
# ============================================

# Backend API endpoint
VITE_API_URL=http://localhost:5001/api

# For production:
# VITE_API_URL=https://your-backend.onrender.com/api

# ============================================
# PAYMENT GATEWAY (Optional)
# ============================================

# VITE_RAZORPAY_KEY_ID=

# ============================================
# DEVELOPMENT
# ============================================

VITE_DEBUG=true
EOF

echo -e "${GREEN}✅ Frontend .env.local created${NC}"
echo ""

echo -e "${BLUE}Step 3: Verifying Supabase Connection${NC}"
echo ""

# Display configuration summary
echo -e "${YELLOW}📋 Configuration Summary:${NC}"
echo ""
echo "Supabase Project URL: ${SUPABASE_URL}"
echo "Supabase Reference: ${PROJECT_REF}"
echo ""
echo -e "${YELLOW}✓ Backend .env configured${NC}"
echo "  Location: backend/.env"
echo "  ⚠️  IMPORTANT: Update DATABASE_URL with your database password"
echo ""
echo -e "${YELLOW}✓ Frontend .env.local configured${NC}"
echo "  Location: .env.local"
echo ""

# Show next steps
echo ""
echo -e "${BLUE}NEXT STEPS:${NC}"
echo ""
echo "1️⃣  Get your database password:"
echo "   • Go to: https://app.supabase.com"
echo "   • Select your project (${PROJECT_REF})"
echo "   • Go to: Settings → Database → Reveal password"
echo "   • Copy the password"
echo ""
echo "2️⃣  Update backend/.env with the database password:"
echo "   DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@db.${PROJECT_REF}.supabase.co:6543/postgres?pgbouncer=true"
echo ""
echo "3️⃣  Import the database schema:"
echo "   • In Supabase Dashboard → SQL Editor"
echo "   • Copy & paste contents of: backend/schema-supabase.sql"
echo "   • Click 'Run'"
echo ""
echo "4️⃣  Test the connection:"
echo "   cd backend"
echo "   npm install"
echo "   npm run seed"
echo ""
echo "5️⃣  Start the application:"
echo "   • Terminal 1: cd backend && npm start"
echo "   • Terminal 2: npm run dev"
echo ""

echo -e "${GREEN}✅ Supabase configuration complete!${NC}"
echo ""
echo "Supabase Dashboard: https://app.supabase.com/project/${PROJECT_REF}"
echo ""
