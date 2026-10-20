"use client";

import React, { useEffect, useState, useRef } from "react";
import Image from "next/image";
import {
  Heart,
  Baby,
  Users,
  Menu,
  CalendarCheck,
  LogOut,
  UserCircle,
  PhoneCall,
  Sparkles,
  ChevronDown,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ─────────────────────────────────────────────────────────────────────────────
// NAV DATA
// ─────────────────────────────────────────────────────────────────────────────

const MENU = [
  { title: "Home", url: "/" },
  {
    title: "Services",
    url: "/#services",
    items: [
      {
        title: "Prenatal Care",
        description: "Monthly check-ups, ultrasound, and nutritional guidance.",
        Icon: Heart,
        iconBg: "bg-rose-50",
        iconColor: "text-rose-500",
        url: "/#services",
      },
      {
        title: "Normal Delivery",
        description: "Safe, compassionate lying-in delivery services.",
        Icon: Baby,
        iconBg: "bg-sky-50",
        iconColor: "text-sky-500",
        url: "/#services",
      },
      {
        title: "Postpartum Care",
        description: "Recovery tracking and maternal wellness follow-ups.",
        Icon: Sparkles,
        iconBg: "bg-violet-50",
        iconColor: "text-violet-500",
        url: "/#services",
      },
      {
        title: "Family Planning",
        description: "Counseling and contraceptive management.",
        Icon: Users,
        iconBg: "bg-emerald-50",
        iconColor: "text-emerald-500",
        url: "/#services",
      },
    ],
  },
  { title: "About", url: "/#about" },
];

const MOBILE_EXTRA = [
  { name: "📞 Emergency Line", url: "tel:+63234567890" },
  { name: "📍 Find Us", url: "/#about" },
];

// ─────────────────────────────────────────────────────────────────────────────
// LOGO MARK — with dedicated logo image placeholder + elegant typography
// ─────────────────────────────────────────────────────────────────────────────
function LogoMark({ dark = false, logoSrc = null }) {
  return (
    <a href="/" className="flex items-center gap-3 group select-none py-1">
      {/* Dedicated Logo Image Container / Placeholder (GPU-composited transform) */}
      <div
        className={cn(
          "relative flex h-10 w-10 sm:h-11 sm:w-11 shrink-0 items-center justify-center rounded-2xl overflow-hidden border shadow-sm transition-transform duration-200 group-hover:scale-105",
          dark
            ? "bg-white border-primary/20 shadow-primary/5"
            : "bg-white/95 border-white/40 shadow-black/5"
        )}
      >
        {logoSrc ? (
          <Image
            src={logoSrc}
            alt="AR-JEN Maternity Clinic Logo"
            width={44}
            height={44}
            sizes="44px"
            priority
            className="h-full w-full object-contain p-0.5"
          />
        ) : (
          <div className="flex flex-col items-center justify-center text-primary">
            <Heart className="h-5 w-5 fill-primary text-primary transition-transform duration-200 group-hover:scale-110" />
            <span className="text-[7px] font-black uppercase tracking-tighter -mt-0.5 leading-none">AR·JEN</span>
          </div>
        )}
      </div>

      {/* Brand Typography */}
      <div className="flex flex-col justify-center leading-none">
        <div className="flex items-center gap-1.5">
          <span
            className={cn(
              "font-serif text-lg sm:text-xl font-black tracking-tight",
              dark ? "text-slate-900 group-hover:text-primary" : "text-white"
            )}
          >
            AR-JEN
          </span>
          <span
            className={cn(
              "text-[9px] font-bold px-1.5 py-0.5 rounded-full uppercase tracking-wider",
              dark
                ? "bg-primary/10 text-primary border border-primary/20"
                : "bg-white/20 text-white/95 border border-white/30"
            )}
          >
            Clinic
          </span>
        </div>
        <span
          className={cn(
            "text-[10px] sm:text-[11px] font-semibold tracking-widest uppercase mt-0.5",
            dark ? "text-muted-foreground font-medium" : "text-white/80"
          )}
        >
          Maternity &amp; Lying-In
        </span>
      </div>
    </a>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN EXPORT
// ─────────────────────────────────────────────────────────────────────────────
const Navbar1 = ({ user = null, logoutAction = null, settings = null, navbarLogo = null }) => {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [desktopServicesOpen, setDesktopServicesOpen] = useState(false);
  const [mobileServicesOpen, setMobileServicesOpen] = useState(false);
  const dropdownRef = useRef(null);
  const effectiveLogo = navbarLogo || settings?.navbar_logo;

  // Scroll-aware: switch from transparent-over-hero to frosted white using rAF
  useEffect(() => {
    let ticking = false;
    const onScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          const isPastThreshold = window.scrollY > 20;
          setScrolled((prev) => (prev !== isPastThreshold ? isPastThreshold : prev));
          ticking = false;
        });
        ticking = true;
      }
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Close desktop dropdown on outside click (ONLY attached when dropdown is actually open!)
  useEffect(() => {
    if (!desktopServicesOpen) return;
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setDesktopServicesOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [desktopServicesOpen]);

  // Lock body scroll and handle Escape key when mobile menu is open
  useEffect(() => {
    if (!mobileOpen) return;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function onKeyDown(e) {
      if (e.key === "Escape") setMobileOpen(false);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [mobileOpen]);

  return (
    <header
      className={cn(
        "sticky top-0 z-50 w-full transition-colors duration-300",
        scrolled
          ? "bg-white/90 backdrop-blur-md shadow-sm shadow-primary/10 border-b border-primary/10"
          : "bg-primary shadow-md"
      )}
    >
      <div className="container mx-auto px-4 md:px-6">

        {/* ── DESKTOP NAV ── */}
        <nav className="hidden h-16 items-center justify-between lg:flex">

          {/* Left: Logo */}
          <LogoMark dark={scrolled} logoSrc={effectiveLogo} />

          {/* Center: Nav links */}
          <div className="mx-6 flex items-center gap-1" ref={dropdownRef}>
            {MENU.map((item) => {
              if (!item.items) {
                return (
                  <a
                    key={item.title}
                    href={item.url}
                    className={cn(
                      "inline-flex h-9 items-center rounded-full px-4 text-[13px] font-bold tracking-wide uppercase transition-colors duration-200",
                      scrolled
                        ? "text-slate-700 hover:text-primary hover:bg-primary/10"
                        : "text-white/90 hover:text-white hover:bg-white/20"
                    )}
                  >
                    {item.title}
                  </a>
                );
              }

              return (
                <div
                  key={item.title}
                  className="relative"
                  onMouseEnter={() => setDesktopServicesOpen(true)}
                  onMouseLeave={() => setDesktopServicesOpen(false)}
                >
                  <button
                    type="button"
                    onClick={() => setDesktopServicesOpen((prev) => !prev)}
                    aria-expanded={desktopServicesOpen}
                    className={cn(
                      "inline-flex h-9 items-center gap-1.5 rounded-full px-4 text-[13px] font-bold tracking-wide uppercase transition-colors duration-200 cursor-pointer",
                      scrolled
                        ? "text-slate-700 hover:text-primary hover:bg-primary/10"
                        : "text-white/90 hover:text-white hover:bg-white/20",
                      desktopServicesOpen && (scrolled ? "bg-primary/10 text-primary" : "bg-white/20 text-white")
                    )}
                  >
                    {item.title}
                    <ChevronDown
                      className={cn(
                        "h-3.5 w-3.5 transition-transform duration-200",
                        desktopServicesOpen && "rotate-180"
                      )}
                    />
                  </button>

                  {/* Mega-dropdown panel */}
                  {desktopServicesOpen && (
                    <div className="absolute top-full left-1/2 -translate-x-1/2 pt-2 z-50">
                      <div className="w-[450px] p-3.5 bg-white rounded-3xl shadow-2xl shadow-primary/15 border border-primary/10 animate-in fade-in zoom-in-95 duration-150">
                        <div className="px-3 py-1.5 mb-2 border-b border-slate-100 flex items-center justify-between">
                          <span className="text-[10px] font-black uppercase tracking-widest text-primary">Clinic Services</span>
                          <span className="text-[10px] font-semibold text-muted-foreground">Certified OB-GYN</span>
                        </div>
                        <ul className="grid grid-cols-2 gap-2">
                          {item.items.map((sub) => {
                            const SubIcon = sub.Icon;
                            return (
                              <li key={sub.title}>
                                <a
                                  href={sub.url}
                                  onClick={() => setDesktopServicesOpen(false)}
                                  className="group flex items-start gap-3 rounded-2xl p-2.5 transition-colors duration-200 hover:bg-primary/5 hover:shadow-xs"
                                >
                                  <div className={cn(
                                    "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition-transform duration-200 group-hover:scale-110",
                                    sub.iconBg
                                  )}>
                                    <SubIcon className={cn("h-4 w-4", sub.iconColor)} />
                                  </div>
                                  <div className="min-w-0">
                                    <p className="text-xs font-bold text-slate-800 group-hover:text-primary transition-colors leading-tight">
                                      {sub.title}
                                    </p>
                                    <p className="mt-1 text-[11px] leading-snug text-muted-foreground line-clamp-2">
                                      {sub.description}
                                    </p>
                                  </div>
                                </a>
                              </li>
                            );
                          })}
                        </ul>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Right: CTAs */}
          <div className="flex items-center gap-3">
            {/* Emergency pill */}
            <a
              href="tel:+63234567890"
              className={cn(
                "hidden xl:flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors",
                scrolled
                  ? "bg-primary/10 text-primary hover:bg-primary/20"
                  : "bg-white/15 text-white hover:bg-white/25"
              )}
            >
              <PhoneCall className="h-3.5 w-3.5" />
              24/7 Emergency
            </a>

            {user ? (
              <div className="flex items-center gap-3">
                <a
                  href="/patient"
                  className={cn(
                    "flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-medium transition-colors",
                    scrolled
                      ? "text-slate-700 hover:bg-primary/5"
                      : "text-white/90 hover:bg-white/10"
                  )}
                >
                  {/* Avatar */}
                  <div className={cn(
                    "flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold",
                    scrolled
                      ? "bg-primary/15 text-primary"
                      : "bg-white/25 text-white"
                  )}>
                    {(user.user_metadata?.full_name || user.email || "U").charAt(0).toUpperCase()}
                  </div>
                  <span className="max-w-[120px] truncate">
                    {user.user_metadata?.full_name || user.email}
                  </span>
                </a>
                <form action={logoutAction || "/auth/logout"}>
                  <button
                    type="submit"
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold cursor-pointer transition-colors",
                      scrolled
                        ? "text-slate-500 hover:text-primary hover:bg-primary/5"
                        : "text-white/80 hover:text-white hover:bg-white/15"
                    )}
                  >
                    <LogOut className="h-3.5 w-3.5" />
                    Logout
                  </button>
                </form>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <a
                  href="/login"
                  className={cn(
                    "inline-flex items-center rounded-full px-5 py-2 text-sm font-semibold transition-colors",
                    scrolled
                      ? "text-slate-700 hover:bg-primary/5 hover:text-primary"
                      : "text-white hover:bg-white/15"
                  )}
                >
                  Log in
                </a>
                <a
                  href="/book"
                  className={cn(
                    "inline-flex items-center rounded-full px-5 py-2 text-sm font-semibold shadow-xs transition-colors",
                    scrolled
                      ? "bg-primary text-primary-foreground hover:bg-primary/90"
                      : "bg-white text-primary hover:bg-white/90"
                  )}
                >
                  <CalendarCheck className="mr-1.5 h-3.5 w-3.5" />
                  Book Now
                </a>
              </div>
            )}
          </div>
        </nav>

        {/* ── MOBILE NAV ── */}
        <div className="flex h-14 items-center justify-between lg:hidden">
          <LogoMark dark={scrolled} logoSrc={effectiveLogo} />

          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            aria-label="Open Navigation Menu"
            className={cn(
              "flex h-9 w-9 items-center justify-center rounded-xl transition-colors cursor-pointer",
              scrolled ? "text-slate-700 hover:bg-primary/5" : "text-white hover:bg-white/15"
            )}
          >
            <Menu className="h-5 w-5" />
          </button>

          {/* Light native slide-over drawer (0 external Radix dependencies) */}
          {mobileOpen && (
            <div className="fixed inset-0 z-50 lg:hidden">
              {/* Backdrop */}
              <div
                className="fixed inset-0 bg-slate-950/40 backdrop-blur-xs transition-opacity duration-300"
                onClick={() => setMobileOpen(false)}
                aria-hidden="true"
              />

              {/* Drawer Panel */}
              <div className="fixed right-0 top-0 bottom-0 w-[300px] sm:w-[340px] bg-white shadow-2xl flex flex-col z-50 animate-in slide-in-from-right duration-300">
                {/* Header */}
                <div className="flex items-center justify-between border-b border-border px-6 py-4">
                  <LogoMark dark logoSrc={effectiveLogo} />
                  <button
                    type="button"
                    onClick={() => setMobileOpen(false)}
                    aria-label="Close menu"
                    className="flex h-8 w-8 items-center justify-center rounded-xl text-slate-500 hover:bg-slate-100 hover:text-slate-800 transition-colors cursor-pointer"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto px-4 py-4 space-y-2">
                  {/* Home */}
                  <a
                    href="/"
                    onClick={() => setMobileOpen(false)}
                    className="block rounded-xl px-3.5 py-3 text-sm font-bold text-slate-800 transition-colors hover:bg-primary/5 hover:text-primary"
                  >
                    Home
                  </a>

                  {/* Services Accordion */}
                  <div className="rounded-xl overflow-hidden">
                    <button
                      type="button"
                      onClick={() => setMobileServicesOpen((prev) => !prev)}
                      className="flex w-full items-center justify-between rounded-xl px-3.5 py-3 text-sm font-bold text-slate-800 hover:bg-primary/5 hover:text-primary transition-colors cursor-pointer"
                    >
                      <span>Services</span>
                      <ChevronDown
                        className={cn(
                          "h-4 w-4 transition-transform duration-200 text-slate-400",
                          mobileServicesOpen && "rotate-180"
                        )}
                      />
                    </button>
                    {mobileServicesOpen && (
                      <div className="space-y-1 px-1 py-1 bg-slate-50/70 rounded-xl mt-1">
                        {MENU.find((m) => m.title === "Services")?.items?.map((sub) => {
                          const SubIcon = sub.Icon;
                          return (
                            <a
                              key={sub.title}
                              href={sub.url}
                              onClick={() => setMobileOpen(false)}
                              className="group flex items-start gap-3 rounded-xl px-3 py-2 transition-colors hover:bg-white"
                            >
                              <div className={cn(
                                "flex h-8 w-8 shrink-0 items-center justify-center rounded-xl",
                                sub.iconBg
                              )}>
                                <SubIcon className={cn("h-4 w-4", sub.iconColor)} />
                              </div>
                              <div>
                                <p className="text-xs font-bold text-slate-800 group-hover:text-primary transition-colors">
                                  {sub.title}
                                </p>
                                <p className="text-[11px] text-muted-foreground mt-0.5">{sub.description}</p>
                              </div>
                            </a>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* About */}
                  <a
                    href="/#about"
                    onClick={() => setMobileOpen(false)}
                    className="block rounded-xl px-3.5 py-3 text-sm font-bold text-slate-800 transition-colors hover:bg-primary/5 hover:text-primary"
                  >
                    About
                  </a>

                  {/* Extra links */}
                  <div className="mt-4 border-t border-border pt-4 pb-2 grid grid-cols-2 gap-1">
                    {MOBILE_EXTRA.map((link, i) => (
                      <a
                        key={i}
                        href={link.url}
                        onClick={() => setMobileOpen(false)}
                        className="rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-primary/5 hover:text-primary transition-colors"
                      >
                        {link.name}
                      </a>
                    ))}
                  </div>

                  {/* Auth section */}
                  <div className="mt-4 flex flex-col gap-2 pb-8">
                    {user ? (
                      <div className="space-y-3">
                        <div className="flex items-center gap-3 rounded-2xl bg-muted/60 p-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/15 text-primary font-bold text-base shrink-0">
                            {(user.user_metadata?.full_name || user.email || "U").charAt(0).toUpperCase()}
                          </div>
                          <div className="overflow-hidden">
                            <p className="truncate text-sm font-semibold text-slate-800">
                              {user.user_metadata?.full_name || "Patient"}
                            </p>
                            <p className="truncate text-xs text-muted-foreground">{user.email}</p>
                          </div>
                        </div>
                        <a
                          href="/patient"
                          onClick={() => setMobileOpen(false)}
                          className="flex items-center justify-center w-full h-11 rounded-full border border-primary/30 text-primary font-semibold hover:bg-primary/5 transition-colors"
                        >
                          <UserCircle className="mr-2 h-4 w-4" />
                          My Dashboard
                        </a>
                        <form action={logoutAction || "/auth/logout"}>
                          <button
                            type="submit"
                            className="flex items-center justify-center w-full h-11 rounded-full bg-primary text-primary-foreground font-semibold hover:bg-primary/90 transition-colors cursor-pointer"
                          >
                            <LogOut className="mr-2 h-4 w-4" />
                            Logout
                          </button>
                        </form>
                      </div>
                    ) : (
                      <div className="flex flex-col gap-2">
                        <a
                          href="/login"
                          onClick={() => setMobileOpen(false)}
                          className="flex items-center justify-center h-11 rounded-full border border-primary/30 text-primary font-semibold hover:bg-primary/5 transition-colors"
                        >
                          Log in
                        </a>
                        <a
                          href="/book"
                          onClick={() => setMobileOpen(false)}
                          className="flex items-center justify-center h-11 rounded-full bg-primary text-primary-foreground font-semibold hover:bg-primary/90 transition-colors shadow-xs"
                        >
                          <CalendarCheck className="mr-2 h-4 w-4" />
                          Book Appointment
                        </a>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

      </div>
    </header>
  );
};

export { Navbar1 };
