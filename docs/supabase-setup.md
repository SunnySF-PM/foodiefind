# Supabase Setup Guide

## Step 1: Create Supabase Project

1. Go to [supabase.com](https://supabase.com) and sign in
2. Click "New Project"
3. Choose your organization
4. Fill in project details:
   - Name: `influencer-restaurants`
   - Database Password: (generate a strong password)
   - Region: Choose closest to your users
5. Click "Create new project"

## Step 2: Configure Database

1. Go to the SQL Editor in your Supabase dashboard
2. Copy and paste the contents of `database/schema.sql`
3. Run the SQL to create all tables and policies

## Step 3: Get API Keys

1. Go to Settings > API in your Supabase dashboard
2. Copy the following values:
   - Project URL
   - `anon` `public` key
   - `service_role` `secret` key (keep this secure!)

## Step 4: Configure Authentication

1. Go to Authentication > Settings
2. Configure your site URL (e.g., `http://localhost:3000` for development)
3. Enable the authentication providers you want (Email, Google, etc.)

## Step 5: Set Environment Variables

Create a `.env` file in the backend directory with:

```env
SUPABASE_URL=your_project_url
SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

## Optional: Enable Real-time

If you want real-time updates, enable real-time for relevant tables in the Supabase dashboard under Database > Replication.