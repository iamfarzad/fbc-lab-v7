#!/bin/bash

# Add Supabase environment variables to Preview and Development

echo "Adding NEXT_PUBLIC_SUPABASE_URL..."
echo "https://ksmxqswuzrmdgckwxkvn.supabase.co" | vercel env add NEXT_PUBLIC_SUPABASE_URL

echo "Adding NEXT_PUBLIC_SUPABASE_ANON_KEY..."
echo "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtzbXhxc3d1enJtZGdja3d4a3ZuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDE3ODUyNjIsImV4cCI6MjA1NzM2MTI2Mn0.YKz7fKPbl7pbvEMN08lFOPm1SSg59R4lu8tzV8Kkz2E" | vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY

echo "Adding SUPABASE_SERVICE_ROLE_KEY..."
echo "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtzbXhxc3d1enJtZGdja3d4a3ZuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MTc4NTI2MiwiZXhwIjoyMDU3MzYxMjYyfQ.9H3ihs0mEAEDk03d_V-Bt8Ywl4uouVIJ13CFUM3nVxU" | vercel env add SUPABASE_SERVICE_ROLE_KEY

echo "Done! Supabase environment variables added."

