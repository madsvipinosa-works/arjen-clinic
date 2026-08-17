-- Expand Clinic Settings for CMS features
alter table public.clinic_settings 
add column if not exists hero_eyebrow text default 'PhilHealth Accredited · Dasmariñas City',
add column if not exists hero_title text default 'Exceptional Maternity Care for Every Mother',
add column if not exists hero_subtitle text default 'From your very first prenatal visit to joyful postpartum recovery...',
add column if not exists navbar_logo text,
add column if not exists about_title text default 'A Clinic That Cares Like Family',
add column if not exists about_description text default 'We combine clinical excellence with genuine warmth...',
add column if not exists footer_email text default 'hello@arjenclinic.com',
add column if not exists social_facebook text,
add column if not exists social_instagram text,
add column if not exists operating_hours_weekdays text default 'Mon - Fri: 8:00 AM - 5:00 PM',
add column if not exists operating_hours_saturday text default 'Saturday: 8:00 AM - 12:00 PM',
add column if not exists operating_hours_sunday text default 'Sunday: Closed',
add column if not exists emergency_notice text default '24/7 Available for Emergencies & Deliveries',
add column if not exists seo_meta_title text default 'AR-JEN Maternity and Lying-In Clinic',
add column if not exists seo_meta_description text default 'Exceptional maternity care in Dasmariñas City.',
add column if not exists trust_points jsonb default '[
  {
    "title": "24/7 Monitoring",
    "description": "Round-the-clock professional care for expecting mothers.",
    "icon": "Clock"
  },
  {
    "title": "Expert Midwives",
    "description": "Experienced and certified midwives for safe deliveries.",
    "icon": "HeartPulse"
  },
  {
    "title": "Modern Facilities",
    "description": "Equipped with essential maternity and newborn care tools.",
    "icon": "Building"
  },
  {
    "title": "PhilHealth Accredited",
    "description": "Accessible and affordable care through PhilHealth.",
    "icon": "ShieldCheck"
  }
]'::jsonb;
