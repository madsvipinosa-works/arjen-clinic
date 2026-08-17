import React from "react";
import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import AnimatedTextRoller from "@/components/ui/animated-text-04";
import { createClient } from "@/utils/supabase/server";
import {
  Heart,
  Baby,
  Sparkles,
  CheckCircle2,
  CalendarCheck,
  PhoneCall,
  MapPin,
  Clock,
  ChevronRight,
  ShieldCheck,
  Users,
  Home,
  ImagePlus,
  Star,
  Mail,
} from "lucide-react";

// ─────────────────────────────────────────────────────────────────────────────
// STATIC DATA
// ─────────────────────────────────────────────────────────────────────────────

const SERVICES = [
  {
    Icon: Heart,
    title: "Prenatal Care",
    description:
      "Monthly check-ups, ultrasound monitoring, nutritional guidance, and complete laboratory workup to keep you and your baby safe through every trimester.",
    accent: "bg-rose-50 text-rose-500",
  },
  {
    Icon: Baby,
    title: "Normal Delivery",
    description:
      "Safe, dignified lying-in delivery services in a warm, fully equipped environment guided by our compassionate midwives and OB-GYN specialists.",
    accent: "bg-sky-50 text-sky-500",
  },
  {
    Icon: Sparkles,
    title: "Postpartum Care",
    description:
      "Dedicated recovery follow-ups, newborn vitals tracking, breastfeeding support, and maternal wellness assessments in the weeks after delivery.",
    accent: "bg-violet-50 text-violet-500",
  },
];

const TRUST_POINTS = [
  { Icon: Clock, label: "24/7 Monitoring", desc: "Round-the-clock fetal and maternal surveillance." },
  { Icon: Users, label: "Expert Midwives", desc: "Licensed, experienced, and deeply compassionate care team." },
  { Icon: Home, label: "Comfortable Facilities", desc: "Clean, cozy, and fully equipped lying-in rooms." },
  { Icon: ShieldCheck, label: "PhilHealth Accredited", desc: "Accessible, affordable care for every Filipino family." },
];


// ─────────────────────────────────────────────────────────────────────────────
// PAGE
// ─────────────────────────────────────────────────────────────────────────────

export default async function LandingPage() {
  const supabase = await createClient();
  const { data: settings } = await supabase
    .from('clinic_settings')
    .select('*')
    .eq('id', 1)
    .single();

  const heroImageLeft = settings?.hero_image_url || "https://images.unsplash.com/photo-1555252333-9f8e92e65df9?w=800&auto=format&fit=crop&q=80";
  const heroImageRight = settings?.hero_image_right_url || "https://images.unsplash.com/photo-1519689680058-324335c77eba?w=800&auto=format&fit=crop&q=80";
  const trustPoints = settings?.trust_points || TRUST_POINTS;
  const dynamicServices = settings?.services?.length > 0 ? settings.services : SERVICES;

  return (
    <div className="flex flex-col min-h-screen overflow-x-hidden bg-background">

      {/* ══════════════════════════════════════════════════
          § 1  HERO — 3-Column Dual-Image Layout (Reference Design)
         ══════════════════════════════════════════════════ */}
      <section className="relative px-4 pt-12 pb-20 md:pt-20 md:pb-28 overflow-hidden bg-gradient-to-b from-rose-50/30 via-white to-white">

        {/* Decorative background ambient motifs */}
        <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
          <div className="absolute top-12 left-1/4 h-32 w-32 rounded-full bg-rose-200/20 blur-2xl" />
          <div className="absolute top-20 right-1/4 h-40 w-40 rounded-full bg-pink-200/25 blur-3xl" />
          <div className="absolute -top-24 left-1/2 -translate-x-1/2 h-72 w-72 rounded-full bg-primary/5 blur-3xl" />
        </div>

        <div className="container mx-auto max-w-7xl">
          <div className="grid items-center gap-8 lg:grid-cols-12">

            {/* ── Left Hero Image (Oval / Capsule Arch) ── */}
            <div className="order-2 lg:order-1 lg:col-span-3 flex justify-center lg:justify-start">
              <div className="relative group">
                {/* Floating soft decorative element */}
                <div className="absolute -top-4 -right-4 w-8 h-8 text-rose-300 opacity-60 hidden sm:block animate-pulse">
                  <Heart className="w-full h-full fill-rose-200" />
                </div>
                
                {/* Left Arched Oval Container */}
                <div className="relative w-64 sm:w-72 lg:w-64 xl:w-72 aspect-[3/4] overflow-hidden rounded-[140px] shadow-2xl shadow-rose-950/10 border-4 border-white ring-1 ring-rose-100 transition-transform duration-500 hover:scale-[1.02]">
                  <Image
                    src={heroImageLeft}
                    alt="AR-JEN Clinic Maternal Care"
                    fill
                    unoptimized
                    sizes="(max-width: 640px) 256px, (max-width: 1024px) 288px, 320px"
                    className="object-cover transition-transform duration-700 group-hover:scale-105"
                    priority
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent opacity-60" />
                </div>
              </div>
            </div>

            {/* ── Center: Headlines + Subtitle + CTAs ── */}
            <div className="order-1 lg:order-2 lg:col-span-6 text-center px-2 sm:px-6">
              
              {/* Eyebrow badge */}
              <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-1.5 text-xs sm:text-sm font-bold text-primary ring-1 ring-primary/20 shadow-sm">
                <ShieldCheck className="h-4 w-4" />
                {settings?.hero_eyebrow || "PhilHealth Accredited · Dasmariñas City"}
              </div>

              {/* Animated roller headline / Main Title */}
              <div className="mb-3">
                <AnimatedTextRoller />
              </div>

              {/* Dynamic H1 line (Serif styling inspired by reference) */}
              <h1 className="font-serif text-3xl font-black leading-[1.18] text-slate-900 sm:text-5xl xl:text-[3.25rem]">
                {settings?.hero_title ? (
                  settings.hero_title.split("Care").map((part, i, arr) => (
                    <React.Fragment key={i}>
                      {part}
                      {i < arr.length - 1 && (
                        <span className="relative whitespace-nowrap text-primary">
                          <svg
                            aria-hidden="true"
                            viewBox="0 0 418 42"
                            className="absolute left-0 top-2/3 h-[0.58em] w-full fill-primary/25"
                            preserveAspectRatio="none"
                          >
                            <path d="M203.371.916c-26.013-2.078-76.686 1.963-124.73 9.946L67.3 12.749C35.421 18.062 18.2 21.766 6.004 25.934 1.244 27.561.828 27.778.874 28.61c.07 1.214.828 1.121 9.595-1.176 9.072-2.377 17.15-3.92 39.246-7.496C123.565 7.986 157.869 4.492 195.942 5.046c7.461.108 19.25 1.696 19.17 2.582-.107 1.183-7.874 4.31-25.75 10.366-21.992 7.45-35.43 12.534-36.701 13.884-2.173 2.308-.202 4.407 4.442 4.734 2.654.187 3.263.157 15.593-.78 35.401-2.686 57.944-3.488 88.365-3.143 46.327.526 75.721 2.23 130.788 7.584 19.787 1.924 20.814 1.98 24.557 1.332l.066-.011c1.201-.203 1.53-1.825.399-2.335-2.911-1.31-4.893-1.604-22.048-3.261-57.509-5.556-87.871-7.36-132.059-7.842-23.239-.254-33.617-.116-50.627.674-11.629.54-42.371 2.494-46.696 2.967-2.359.259 8.133-3.625 26.504-9.81 23.239-7.825 27.934-10.149 28.304-14.005.417-4.348-3.529-6-16.878-7.066Z" />
                          </svg>
                          Care
                        </span>
                      )}
                    </React.Fragment>
                  ))
                ) : (
                  <>
                    Mom&apos;s Care:{" "}
                    <span className="relative whitespace-nowrap text-primary">
                      <svg
                        aria-hidden="true"
                        viewBox="0 0 418 42"
                        className="absolute left-0 top-2/3 h-[0.58em] w-full fill-primary/25"
                        preserveAspectRatio="none"
                      >
                        <path d="M203.371.916c-26.013-2.078-76.686 1.963-124.73 9.946L67.3 12.749C35.421 18.062 18.2 21.766 6.004 25.934 1.244 27.561.828 27.778.874 28.61c.07 1.214.828 1.121 9.595-1.176 9.072-2.377 17.15-3.92 39.246-7.496C123.565 7.986 157.869 4.492 195.942 5.046c7.461.108 19.25 1.696 19.17 2.582-.107 1.183-7.874 4.31-25.75 10.366-21.992 7.45-35.43 12.534-36.701 13.884-2.173 2.308-.202 4.407 4.442 4.734 2.654.187 3.263.157 15.593-.78 35.401-2.686 57.944-3.488 88.365-3.143 46.327.526 75.721 2.23 130.788 7.584 19.787 1.924 20.814 1.98 24.557 1.332l.066-.011c1.201-.203 1.53-1.825.399-2.335-2.911-1.31-4.893-1.604-22.048-3.261-57.509-5.556-87.871-7.36-132.059-7.842-23.239-.254-33.617-.116-50.627.674-11.629.54-42.371 2.494-46.696 2.967-2.359.259 8.133-3.625 26.504-9.81 23.239-7.825 27.934-10.149 28.304-14.005.417-4.348-3.529-6-16.878-7.066Z" />
                      </svg>
                      Your Safety
                    </span>
                  </>
                )}
              </h1>

              <p className="mx-auto mt-5 max-w-lg text-sm sm:text-base leading-relaxed text-slate-600">
                {settings?.hero_subtitle || "A mother's care serves as a protective refuge, fostering feelings of safety, comfort, and peace of mind through every heartbeat of pregnancy."}
              </p>

              {/* CTA Buttons */}
              <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
                <Link href="/book">
                  <Button
                    size="lg"
                    className="w-full sm:w-auto rounded-full bg-rose-500 hover:bg-rose-600 text-white px-8 py-6 text-base font-bold shadow-xl shadow-rose-200 transition-all hover:shadow-2xl hover:scale-105 active:scale-95"
                  >
                    <CalendarCheck className="mr-2 h-5 w-5" />
                    Book Appointment
                    <ChevronRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
                <Link href="/login">
                  <Button
                    size="lg"
                    variant="outline"
                    className="w-full sm:w-auto rounded-full border-rose-200 text-rose-700 bg-white/80 hover:bg-rose-50 px-7 py-6 text-base font-semibold"
                  >
                    Patient Portal
                  </Button>
                </Link>
              </div>
            </div>

            {/* ── Right Hero Image (Circular / Oval Focus) ── */}
            <div className="order-3 lg:col-span-3 flex justify-center lg:justify-end">
              <div className="relative group">
                {/* Floating soft decorative element */}
                <div className="absolute -bottom-3 -left-3 w-8 h-8 text-pink-300 opacity-70 hidden sm:block animate-pulse">
                  <Sparkles className="w-full h-full fill-pink-100" />
                </div>

                {/* Right Circular / Arched Container */}
                <div className="relative w-64 sm:w-72 lg:w-64 xl:w-72 aspect-square overflow-hidden rounded-full shadow-2xl shadow-pink-950/10 border-4 border-white ring-1 ring-rose-100 transition-transform duration-500 hover:scale-[1.02]">
                  <Image
                    src={heroImageRight}
                    alt="Happy newborn at AR-JEN Clinic"
                    fill
                    unoptimized
                    sizes="(max-width: 640px) 256px, (max-width: 1024px) 288px, 320px"
                    className="object-cover transition-transform duration-700 group-hover:scale-105"
                    priority
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent opacity-50" />
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════
          § 1.5  FULL-WIDTH INFINITE RUNNING MARQUEE BANNER
         ══════════════════════════════════════════════════ */}
      <div className="w-full overflow-hidden bg-slate-900 text-rose-100 py-3.5 border-y border-slate-800 shadow-md select-none">
        <div className="animate-marquee flex items-center whitespace-nowrap">
          {/* First set of marquee items */}
          <div className="flex items-center gap-8 px-4 shrink-0">
            <span className="flex items-center gap-2 text-xs sm:text-sm font-semibold tracking-wide">
              <PhoneCall className="h-4 w-4 text-rose-400 shrink-0" />
              24/7 Emergency Line: <strong className="text-white ml-1">{settings?.clinic_contact || "+63 (123) 456-7890"}</strong>
            </span>
            <span className="text-rose-400 font-bold">•</span>
            <span className="flex items-center gap-2 text-xs sm:text-sm font-semibold tracking-wide">
              <Mail className="h-4 w-4 text-rose-400 shrink-0" />
              {settings?.footer_email || "contact@arjen-clinic.com"}
            </span>
            <span className="text-rose-400 font-bold">•</span>
            <span className="flex items-center gap-2 text-xs sm:text-sm font-semibold tracking-wide">
              <MapPin className="h-4 w-4 text-rose-400 shrink-0" />
              {settings?.clinic_address || "Dasmariñas City, Cavite, PH"}
            </span>
            <span className="text-rose-400 font-bold">•</span>
            <span className="flex items-center gap-2 text-xs sm:text-sm font-semibold tracking-wide">
              <ShieldCheck className="h-4 w-4 text-rose-400 shrink-0" />
              PhilHealth Accredited Maternity Clinic
            </span>
            <span className="text-rose-400 font-bold">•</span>
            <span className="flex items-center gap-2 text-xs sm:text-sm font-semibold tracking-wide">
              <Clock className="h-4 w-4 text-rose-400 shrink-0" />
              Mon–Fri 8AM–5PM · Sat 8AM–12PM
            </span>
            <span className="text-rose-400 font-bold">•</span>
            <span className="flex items-center gap-2 text-xs sm:text-sm font-semibold tracking-wide">
              <Heart className="h-4 w-4 text-rose-400 shrink-0" />
              Compassionate Maternal &amp; Newborn Care
            </span>
            <span className="text-rose-400 font-bold">•</span>
          </div>

          {/* Duplicate set for seamless infinite loop */}
          <div className="flex items-center gap-8 px-4 shrink-0" aria-hidden="true">
            <span className="flex items-center gap-2 text-xs sm:text-sm font-semibold tracking-wide">
              <PhoneCall className="h-4 w-4 text-rose-400 shrink-0" />
              24/7 Emergency Line: <strong className="text-white ml-1">{settings?.clinic_contact || "+63 (123) 456-7890"}</strong>
            </span>
            <span className="text-rose-400 font-bold">•</span>
            <span className="flex items-center gap-2 text-xs sm:text-sm font-semibold tracking-wide">
              <Mail className="h-4 w-4 text-rose-400 shrink-0" />
              {settings?.footer_email || "contact@arjen-clinic.com"}
            </span>
            <span className="text-rose-400 font-bold">•</span>
            <span className="flex items-center gap-2 text-xs sm:text-sm font-semibold tracking-wide">
              <MapPin className="h-4 w-4 text-rose-400 shrink-0" />
              {settings?.clinic_address || "Dasmariñas City, Cavite, PH"}
            </span>
            <span className="text-rose-400 font-bold">•</span>
            <span className="flex items-center gap-2 text-xs sm:text-sm font-semibold tracking-wide">
              <ShieldCheck className="h-4 w-4 text-rose-400 shrink-0" />
              PhilHealth Accredited Maternity Clinic
            </span>
            <span className="text-rose-400 font-bold">•</span>
            <span className="flex items-center gap-2 text-xs sm:text-sm font-semibold tracking-wide">
              <Clock className="h-4 w-4 text-rose-400 shrink-0" />
              Mon–Fri 8AM–5PM · Sat 8AM–12PM
            </span>
            <span className="text-rose-400 font-bold">•</span>
            <span className="flex items-center gap-2 text-xs sm:text-sm font-semibold tracking-wide">
              <Heart className="h-4 w-4 text-rose-400 shrink-0" />
              Compassionate Maternal &amp; Newborn Care
            </span>
            <span className="text-rose-400 font-bold">•</span>
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════
          § 2  SERVICES — 3-column card grid
         ══════════════════════════════════════════════════ */}
      <section id="services" className="bg-white px-4 py-20 md:py-28">
        <div className="container mx-auto max-w-6xl">

          {/* Header */}
          <div className="mb-14 text-center">
            <span className="mb-3 inline-block text-sm font-semibold uppercase tracking-widest text-primary">
              What We Offer
            </span>
            <h2 className="font-serif text-3xl font-bold text-slate-800 md:text-4xl">
              Comprehensive Maternity Care
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-muted-foreground">
              Specialized programs designed to guide and support you at every
              beautiful stage of motherhood — from conception to postpartum.
            </p>
          </div>

          {/* Grid */}
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {dynamicServices.map((service, index) => {
              // Gracefully handle dynamic vs static icons
              const IconComp = service.Icon || Heart; 
              return (
                <Card
                  key={index}
                  className="group rounded-2xl border border-slate-100 bg-white shadow-sm transition-all duration-300 hover:-translate-y-1.5 hover:bg-pink-50 hover:shadow-md"
                >
                  <CardContent className="p-8">
                    <div
                      className={`mb-5 flex h-14 w-14 items-center justify-center rounded-2xl ${service.accent?.split(" ")[0] || "bg-rose-50"} transition-transform duration-300 group-hover:scale-110`}
                    >
                      <IconComp className={`h-7 w-7 ${service.accent?.split(" ")[1] || "text-rose-500"}`} />
                    </div>
                    <h3 className="mb-3 font-serif text-xl font-bold text-slate-800">
                      {service.title || service.label}
                    </h3>
                    <p className="text-sm leading-relaxed text-muted-foreground">
                      {service.description || service.desc}
                    </p>
                    <Link
                      href="/book"
                      className="mt-5 inline-flex items-center gap-1 text-sm font-semibold text-primary transition-all hover:gap-2"
                    >
                      Book now <ChevronRight className="h-4 w-4" />
                    </Link>
                  </CardContent>
                </Card>
              );
            })}
          </div>

        </div>
      </section>

      {/* ══════════════════════════════════════════════════
          § 3  WHY CHOOSE US — Trust section (split layout)
         ══════════════════════════════════════════════════ */}
      <section id="about" className="bg-background px-4 py-20 md:py-28">
        <div className="container mx-auto max-w-6xl">
          <div className="grid items-center gap-14 lg:grid-cols-2">

            {/* Left: Trust points */}
            <div>
              <span className="mb-3 inline-block text-sm font-semibold uppercase tracking-widest text-primary">
                Why Choose AR-JEN
              </span>
              <h2 className="font-serif text-3xl font-bold leading-tight text-slate-800 md:text-4xl">
                {settings?.about_title ? (
                  settings.about_title.split("Family").map((part, i, arr) => (
                    <React.Fragment key={i}>
                      {part}
                      {i < arr.length - 1 && <span className="text-primary">Family</span>}
                    </React.Fragment>
                  ))
                ) : (
                  <>A Clinic That Cares Like <span className="text-primary">Family</span></>
                )}
              </h2>
              <p className="mt-4 leading-relaxed text-muted-foreground">
                {settings?.about_description || "We combine clinical excellence with genuine warmth. Our team has supported thousands of families through Dasmariñas City — and we're ready to support yours."}
              </p>

              <div className="mt-8 grid gap-5 sm:grid-cols-2">
                {trustPoints.map((point, index) => {
                  let PointIcon = CheckCircle2;
                  if (point.icon === "Clock" || point.Icon === Clock) PointIcon = Clock;
                  if (point.icon === "Users" || point.Icon === Users) PointIcon = Users;
                  if (point.icon === "Home" || point.Icon === Home) PointIcon = Home;
                  if (point.icon === "ShieldCheck" || point.Icon === ShieldCheck) PointIcon = ShieldCheck;
                  if (point.icon === "HeartPulse") PointIcon = Heart;
                  if (point.icon === "Building") PointIcon = Home;

                  return (
                    <div
                      key={index}
                      className="flex items-start gap-3 rounded-2xl border border-border bg-white p-4 shadow-sm"
                    >
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10">
                        <PointIcon className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-semibold text-slate-800 text-sm">{point.label || point.title}</p>
                        <p className="mt-0.5 text-xs text-muted-foreground">{point.desc || point.description}</p>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="mt-8 flex gap-3">
                <Link href="/book">
                  <Button className="rounded-full bg-primary px-6 text-primary-foreground hover:bg-primary/90">
                    Book a Consultation
                  </Button>
                </Link>
              </div>
            </div>

            {/* Right: Two smaller arched Unsplash photos */}
            <div className="flex flex-col gap-5 sm:flex-row lg:flex-col xl:flex-row">

              {/* Photo 1 — clinic / warm interior */}
              <div className="relative flex-1 overflow-hidden rounded-t-[200px] rounded-b-2xl shadow-xl shadow-primary/10 aspect-[3/4]">
                <Image
                  src="https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?w=600&auto=format&fit=crop&q=80"
                  alt="AR-JEN Clinic comfortable facilities"
                  fill
                  sizes="(max-width: 640px) 100vw, 300px"
                  className="object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-primary/20 to-transparent" />
              </div>

              {/* Photo 2 — happy family / newborn */}
              <div className="relative flex-1 overflow-hidden rounded-t-[200px] rounded-b-2xl shadow-xl shadow-secondary/20 aspect-[3/4] sm:mt-10 lg:mt-0 xl:mt-10">
                <Image
                  src="https://images.unsplash.com/photo-1555252333-9f8e92e65df9?w=600&auto=format&fit=crop&q=80"
                  alt="Happy new family at AR-JEN Clinic"
                  fill
                  sizes="(max-width: 640px) 100vw, 300px"
                  className="object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-secondary/20 to-transparent" />

                {/* Floating badge on second photo */}
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-xl bg-white px-3 py-2 shadow-lg text-center">
                  <p className="text-xs font-bold text-slate-800">Trusted Since 2014</p>
                  <div className="flex justify-center gap-0.5 mt-0.5">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className="h-2.5 w-2.5 fill-amber-400 text-amber-400" />
                    ))}
                  </div>
                </div>
              </div>

            </div>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════
          § 4  CTA BANNER
         ══════════════════════════════════════════════════ */}
      <section className="bg-primary px-4 py-16">
        <div className="container mx-auto max-w-4xl text-center">
          <h2 className="font-serif text-3xl font-bold text-primary-foreground md:text-4xl">
            Ready to Begin Your Maternity Journey?
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-primary-foreground/80">
            Book your first prenatal visit online in minutes — our caring team in
            Dasmariñas City is ready to welcome you.
          </p>
          <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
            <Link href="/book">
              <Button
                size="lg"
                className="w-full rounded-full bg-white px-8 py-6 text-base font-bold text-primary shadow-lg hover:bg-white/90 sm:w-auto"
              >
                <CalendarCheck className="mr-2 h-5 w-5" />
                Book Appointment
              </Button>
            </Link>
            <a href={`tel:${settings?.clinic_contact ? settings.clinic_contact.replace(/[^0-9+]/g, '') : '+63234567890'}`}>
              <Button
                size="lg"
                variant="ghost"
                className="w-full rounded-full border border-white/30 px-8 py-6 text-base font-semibold text-primary-foreground hover:bg-white/10 sm:w-auto"
              >
                <PhoneCall className="mr-2 h-5 w-5" />
                Call Us Now
              </Button>
            </a>
          </div>

          <div className="mt-10 flex flex-wrap justify-center gap-5 text-sm text-primary-foreground/70">
            <span className="flex items-center gap-1.5">
              <MapPin className="h-4 w-4 shrink-0" />
              {settings?.clinic_address || "Dasmariñas City, Cavite, Philippines"}
            </span>
            <span className="flex items-center gap-1.5">
              <Clock className="h-4 w-4 shrink-0" />
              {settings?.operating_hours_weekdays || "Mon–Fri 8AM–5PM"} · {settings?.operating_hours_saturday || "Sat 8AM–12PM"}
            </span>
            <span className="flex items-center gap-1.5">
              <PhoneCall className="h-4 w-4 shrink-0" />
              {settings?.emergency_notice || "24/7 Delivery & Emergency Line"}
            </span>
          </div>
        </div>
      </section>

    </div>
  );
}
