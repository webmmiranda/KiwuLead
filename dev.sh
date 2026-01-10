#!/bin/bash

# Function to kill background processes on exit
cleanup() {
    echo ""
    echo "🛑 Stopping servers..."
    kill $PHP_PID
    exit
}
trap cleanup SIGINT

echo "🚀 Starting KiwüLead Local Environment"
echo "======================================="

# 1. Start PHP Server (Background)
# We serve the 'public' folder so /api/auth.php serves public/api/auth.php
echo "🐘 Starting PHP Backend on http://localhost:8081..."
php -S localhost:8081 -t public > /dev/null 2>&1 &
PHP_PID=$!

# Check if PHP started
sleep 1
if ! ps -p $PHP_PID > /dev/null; then
    echo "❌ Error starting PHP server. Check if port 8081 is free."
    exit 1
fi

echo "✅ PHP Server running (PID: $PHP_PID)"

# 2. Check for node_modules
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
fi

# 3. Start Frontend
echo "⚛️  Starting Frontend..."
echo "ℹ️  Open http://localhost:5173/install to configure the DB"
echo "   (Database Name: nexus_crm_local, User: root, Pass: [empty])"
npm run dev
