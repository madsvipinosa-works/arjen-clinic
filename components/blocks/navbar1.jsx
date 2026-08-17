"use client";

import React, { useEffect, useState } from "react";
import {
  Heart,
  Baby,
  Stethoscope,
  Users,
  Menu,
  CalendarCheck,
  LogOut,
  UserCircle,
  PhoneCall,
  Sparkles,
  ChevronDown,
} from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
} from "@/components/ui/navigation-menu";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
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
      {/* Dedicated Logo Image Container / Placeholder */}
      <div
        className={cn(
          "relative flex h-10 w-10 sm:h-11 sm:w-11 shrink-0 items-center justify-center rounded-2xl overflow-hidden border shadow-sm transition-all duration-300 group-hover:scale-105 group-hover:shadow-md",
          dark
            ? "bg-white border-primary/20 shadow-primary/5"
            : "bg-white/95 border-white/40 shadow-black/5"
        )}
      >
        {logoSrc ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={logoSrc}
            alt="AR-JEN Maternity Clinic Logo"
            className="h-full w-full object-contain p-1"
          />
        ) : (
          <div className="flex flex-col items-center justify-center text-primary">
            <Heart className="h-5 w-5 fill-primary text-primary transition-transform duration-300 group-hover:scale-110" />
            <span className="text-[7px] font-black uppercase tracking-tighter -mt-0.5 leading-none">AR·JEN</span>
          </div>
        )}
      </div>

      {/* Brand Typography */}
      <div className="flex flex-col justify-center leading-none">
        <div className="flex items-center gap-1.5">
          <span
            className={cn(
              "font-serif text-lg sm:text-xl font-black tracking-tight transition-colors",
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
            "text-[10px] sm:text-[11px] font-semibold tracking-widest uppercase mt-0.5 transition-colors",
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
const Navbar1 = ({ user = null, logoutAction = null, settings = null }) => {
  const [scrolled, setScrolled] = useState(false);

  // Scroll-aware: switch from transparent-over-hero to frosted white
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={cn(
        "sticky top-0 z-50 w-full transition-all duration-300",
        scrolled
          ? "bg-white/90 backdrop-blur-md shadow-sm shadow-primary/10 border-b border-primary/10"
          : "bg-primary shadow-md"
      )}
    >
      <div className="container mx-auto px-4 md:px-6">

        {/* ── DESKTOP NAV ── */}
        <nav className="hidden h-16 items-center justify-between lg:flex">

          {/* Left: Logo */}
          <LogoMark dark={scrolled} logoSrc={settings?.navbar_logo} />

          {/* Center: Nav links */}
          <NavigationMenu className="mx-6">
            <NavigationMenuList className="gap-1">
              {MENU.map((item) => renderDesktopItem(item, scrolled))}
            </NavigationMenuList>
          </NavigationMenu>

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
                <form action={logoutAction}>
                  <Button
                    variant="ghost"
                    size="sm"
                    className={cn(
                      "rounded-full gap-1.5 text-xs font-semibold",
                      scrolled
                        ? "text-slate-500 hover:text-primary hover:bg-primary/5"
                        : "text-white/80 hover:text-white hover:bg-white/15"
                    )}
                  >
                    <LogOut className="h-3.5 w-3.5" />
                    Logout
                  </Button>
                </form>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Button
                  asChild
                  variant="ghost"
                  size="sm"
                  className={cn(
                    "rounded-full px-5 font-semibold",
                    scrolled
                      ? "text-slate-700 hover:bg-primary/5 hover:text-primary"
                      : "text-white hover:bg-white/15"
                  )}
                >
                  <a href="/login">Log in</a>
                </Button>
                <Button
                  asChild
                  size="sm"
                  className={cn(
                    "rounded-full px-5 font-semibold shadow-sm",
                    scrolled
                      ? "bg-primary text-primary-foreground hover:bg-primary/90"
                      : "bg-white text-primary hover:bg-white/90"
                  )}
                >
                  <a href="/book">
                    <CalendarCheck className="mr-1.5 h-3.5 w-3.5" />
                    Book Now
                  </a>
                </Button>
              </div>
            )}
          </div>
        </nav>

        {/* ── MOBILE NAV ── */}
        <div className="flex h-14 items-center justify-between lg:hidden">
          <LogoMark dark={scrolled} logoSrc={settings?.navbar_logo} />

          <Sheet>
            <SheetTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className={cn(
                  "rounded-xl",
                  scrolled ? "text-slate-700 hover:bg-primary/5" : "text-white hover:bg-white/15"
                )}
              >
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>

            <SheetContent side="right" className="w-[300px] bg-white p-0 sm:w-[340px]">
              {/* Sheet header */}
              <SheetHeader className="border-b border-border px-6 py-4">
                <SheetTitle>
                  <LogoMark dark logoSrc={settings?.navbar_logo} />
                </SheetTitle>
              </SheetHeader>

              <div className="flex flex-col gap-1 overflow-y-auto px-4 py-4">

                {/* Nav accordion */}
                <Accordion type="single" collapsible className="w-full">
                  {MENU.map((item) => renderMobileItem(item))}
                </Accordion>

                {/* Extra links */}
                <div className="mt-2 border-t border-border pt-4 pb-2 grid grid-cols-2 gap-1">
                  {MOBILE_EXTRA.map((link, i) => (
                    <a
                      key={i}
                      href={link.url}
                      className="rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-primary/5 hover:text-primary transition-colors"
                    >
                      {link.name}
                    </a>
                  ))}
                </div>

                {/* Auth section */}
                <div className="mt-2 flex flex-col gap-2 pb-8">
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
                      <a href="/patient">
                        <Button variant="outline" className="w-full rounded-full border-primary/30 text-primary hover:bg-primary/5">
                          <UserCircle className="mr-2 h-4 w-4" />
                          My Dashboard
                        </Button>
                      </a>
                      <form action={logoutAction}>
                        <Button className="w-full rounded-full bg-primary text-primary-foreground hover:bg-primary/90">
                          <LogOut className="mr-2 h-4 w-4" />
                          Logout
                        </Button>
                      </form>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-2">
                      <Button asChild variant="outline" className="h-11 rounded-full border-primary/30 text-primary hover:bg-primary/5">
                        <a href="/login">Log in</a>
                      </Button>
                      <Button asChild className="h-11 rounded-full bg-primary text-primary-foreground hover:bg-primary/90">
                        <a href="/book">
                          <CalendarCheck className="mr-2 h-4 w-4" />
                          Book Appointment
                        </a>
                      </Button>
                    </div>
                  )}
                </div>

              </div>
            </SheetContent>
          </Sheet>
        </div>

      </div>
    </header>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// RENDER HELPERS
// ─────────────────────────────────────────────────────────────────────────────

function renderDesktopItem(item, scrolled) {
  const linkBase = cn(
    "inline-flex h-9 items-center rounded-full px-4 text-[13px] font-bold tracking-wide uppercase transition-all duration-200",
    scrolled
      ? "text-slate-700 hover:text-primary hover:bg-primary/10"
      : "text-white/90 hover:text-white hover:bg-white/20"
  );

  if (!item.items) {
    return (
      <NavigationMenuItem key={item.title}>
        <NavigationMenuLink asChild>
          <a href={item.url} className={linkBase}>
            {item.title}
          </a>
        </NavigationMenuLink>
      </NavigationMenuItem>
    );
  }

  return (
    <NavigationMenuItem key={item.title}>
      <NavigationMenuTrigger
        className={cn(
          "rounded-full bg-transparent text-[13px] font-bold tracking-wide uppercase border-none h-9 transition-all duration-200",
          scrolled
            ? "text-slate-700 hover:text-primary hover:bg-primary/10 data-[state=open]:bg-primary/10 data-[state=open]:text-primary"
            : "text-white/90 hover:text-white hover:bg-white/20 data-[state=open]:bg-white/20 data-[state=open]:text-white"
        )}
      >
        {item.title}
      </NavigationMenuTrigger>
      <NavigationMenuContent>
        {/* Mega-dropdown panel */}
        <div className="w-[450px] p-3.5 bg-white rounded-3xl shadow-2xl shadow-primary/15 border border-primary/10">
          <div className="px-3 py-1.5 mb-2 border-b border-slate-100 flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-widest text-primary">Clinic Services</span>
            <span className="text-[10px] font-semibold text-muted-foreground">Certified OB-GYN</span>
          </div>
          <ul className="grid grid-cols-2 gap-2">
            {item.items.map((sub) => {
              const SubIcon = sub.Icon;
              return (
                <li key={sub.title}>
                  <NavigationMenuLink asChild>
                    <a
                      href={sub.url}
                      className="group flex items-start gap-3 rounded-2xl p-2.5 transition-all duration-200 hover:bg-primary/5 hover:shadow-sm"
                    >
                      <div className={cn(
                        "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition-transform duration-200 group-hover:scale-110 group-hover:shadow-sm",
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
                  </NavigationMenuLink>
                </li>
              );
            })}
          </ul>
        </div>
      </NavigationMenuContent>
    </NavigationMenuItem>
  );
}

function renderMobileItem(item) {
  if (!item.items) {
    return (
      <a
        key={item.title}
        href={item.url}
        className="block rounded-xl px-3.5 py-3 text-sm font-bold text-slate-800 transition-colors hover:bg-primary/5 hover:text-primary"
      >
        {item.title}
      </a>
    );
  }

  return (
    <AccordionItem key={item.title} value={item.title} className="border-b-0">
      <AccordionTrigger className="rounded-xl px-3.5 py-3 text-sm font-bold text-slate-800 hover:no-underline hover:bg-primary/5 hover:text-primary transition-colors">
        {item.title}
      </AccordionTrigger>
      <AccordionContent className="mt-1 space-y-1 pb-1">
        {item.items.map((sub) => {
          const SubIcon = sub.Icon;
          return (
            <a
              key={sub.title}
              href={sub.url}
              className="group flex items-start gap-3 rounded-2xl px-3.5 py-2.5 transition-colors hover:bg-primary/5"
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
      </AccordionContent>
    </AccordionItem>
  );
}

export { Navbar1 };

