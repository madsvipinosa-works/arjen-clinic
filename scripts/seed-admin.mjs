// scripts/seed-admin.mjs
// Local administrative seeding script for AR-JEN Maternity Clinic
// Run locally via: node scripts/seed-admin.mjs <admin-email> <admin-password>

import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import path from "path";

// 1. Read environment variables from .env.local
const envPath = path.resolve(process.cwd(), ".env.local");
let supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
let serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, "utf-8");
  const urlMatch = envContent.match(/NEXT_PUBLIC_SUPABASE_URL=([^\r\n]+)/);
  const keyMatch = envContent.match(/SUPABASE_SERVICE_ROLE_KEY=([^\r\n]+)/);
  if (urlMatch) supabaseUrl = urlMatch[1].trim();
  if (keyMatch) serviceRoleKey = keyMatch[1].trim();
}

if (!supabaseUrl || !serviceRoleKey) {
  console.error("❌ Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local");
  process.exit(1);
}

const email = process.argv[2] || "admin@ar-jen.com";
const password = process.argv[3];

if (!password) {
  console.error("Usage: node scripts/seed-admin.mjs <email> <password>");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function seedAdmin() {
  console.log(`🔐 Bootstrapping administrator: ${email}`);

  // Check if user already exists
  const { data: usersData, error: listError } = await supabase.auth.admin.listUsers();
  if (listError) {
    console.error("Error listing users:", listError.message);
    process.exit(1);
  }

  const existingUser = usersData?.users?.find((u) => u.email.toLowerCase() === email.toLowerCase());
  let userId;

  if (existingUser) {
    userId = existingUser.id;
    console.log(`User already exists (${userId}), updating password and metadata...`);
    const { error: updateError } = await supabase.auth.admin.updateUserById(userId, {
      password,
      email_confirm: true,
      user_metadata: { role: "admin", full_name: "Clinic Administrator" },
    });
    if (updateError) {
      console.error("Error updating admin auth user:", updateError.message);
      process.exit(1);
    }
  } else {
    console.log("Creating new admin user...");
    const { data: createData, error: createError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { role: "admin", full_name: "Clinic Administrator" },
    });
    if (createError) {
      console.error("Error creating admin auth user:", createError.message);
      process.exit(1);
    }
    userId = createData.user.id;
  }

  // Ensure role in public.users is 'admin'
  const { error: upsertError } = await supabase
    .from("users")
    .upsert({ id: userId, email, role: "admin" });

  if (upsertError) {
    console.error("Error setting role in public.users:", upsertError.message);
    process.exit(1);
  }

  console.log(`✅ Administrator successfully provisioned!`);
  console.log(`Email: ${email}`);
  console.log(`Role: admin`);
}

seedAdmin();
