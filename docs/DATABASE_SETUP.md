# Supabase Database Migration Guide

Implementing "Infrastructure as Code" means we do not manually click around the Supabase Dashboard to create tables. Instead, we write SQL files (migrations) locally and **push** them to the live cloud database.

To execute the `arjen_initial_schema` we just created, follow these two simple steps in your terminal:

### Step 1: Link your Local Project to the Cloud Database
Before you can push data, the Supabase CLI needs to know *which* Supabase project you are pushing to.
You can find your Project ID in the Supabase Dashboard URL (or from the `ref` piece of your anon key, which is the same thing).

```bash
npx supabase link --project-ref <your-project-id>
```
*(It will prompt you for your Supabase database password when you run this).*

### Step 2: Push the Migration to the Cloud
Once linked, command the CLI to deploy all local migrations inside `supabase/migrations/` up to the remote database.

```bash
npx supabase db push
```

**What this does:**
1. Connects to your live Supabase database.
2. Reads the `arjen_initial_schema.sql` file.
3. Automatically executes the pure PostgreSQL to precisely build the `patients`, `appointments`, `visit_logs`, `prenatal_records`, and `birth_plans` tables.
4. Executes the rule disabling Row Level Security (RLS) so our MVP can function smoothly without 403 Forbidden errors.

**Done!** Your remote database is now securely scaffolded and perfectly matches our codebase.
