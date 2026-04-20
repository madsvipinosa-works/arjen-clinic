"use client";

import React from "react";
import { Book, Menu, Sunset, Trees, Zap } from "lucide-react";
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

const Navbar1 = ({
  logo = {
    url: "/",
    src: "https://images.unsplash.com/photo-1555252333-9f8e92e65df9?auto=format&fit=crop&w=64&h=64",
    alt: "AR-JEN Clinic logo",
    title: "AR-JEN Clinic",
  },
  menu = [
    { title: "Home", url: "/" },
    {
      title: "Services",
      url: "#services",
      items: [
        {
          title: "Prenatal Care",
          description: "Comprehensive check-ups and monitoring",
          icon: <Book className="size-5 shrink-0 text-rose-500" />,
          url: "/#services",
        },
        {
          title: "Safe Delivery",
          description: "Lying-in services for normal deliveries",
          icon: <Trees className="size-5 shrink-0 text-rose-500" />,
          url: "/#services",
        },
        {
          title: "Family Planning",
          description: "Counseling and contraceptive management",
          icon: <Sunset className="size-5 shrink-0 text-rose-500" />,
          url: "/#services",
        },
        {
          title: "Newborn Care",
          description: "Immunizations and initial checkups",
          icon: <Zap className="size-5 shrink-0 text-rose-500" />,
          url: "/#services",
        },
      ],
    },
    {
      title: "About Us",
      url: "/#about",
    },
    {
      title: "Book Appointment",
      url: "/book",
    },
  ],
  mobileExtraLinks = [
    { name: "Emergency Contact", url: "#" },
    { name: "Find Us", url: "#" },
  ],
  auth = {
    login: { text: "Log in", url: "/login" },
    signup: { text: "Sign up", url: "/register" },
  },
  // INJECT LIVE SUPABASE SESSION PROP
  user = null,
  logoutAction = null,
}) => {
  return (
    <section className="py-3 bg-rose-500 text-white shadow-sm sticky top-0 z-50">
      <div className="container mx-auto px-4 md:px-6 border-none">
        <nav className="hidden justify-between lg:flex items-center">
          <div className="flex items-center gap-8">
            <a href={logo.url} className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center overflow-hidden">
                <img src={logo.src} className="w-11 h-11 object-cover" alt={logo.alt} />
              </div>
              <span className="text-xl font-bold tracking-tight text-white">{logo.title}</span>
            </a>
            <div className="flex items-center ml-2">
              <NavigationMenu>
                <NavigationMenuList>
                  {menu.map((item) => renderMenuItem(item))}
                </NavigationMenuList>
              </NavigationMenu>
            </div>
          </div>
          <div className="flex gap-4 items-center">
            {user ? (
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-rose-100 text-rose-700 flex items-center justify-center font-bold text-sm border border-rose-200 shadow-sm">
                    {(user.user_metadata?.full_name || user.user_metadata?.name || user.email || "U").charAt(0).toUpperCase()}
                  </div>
                  <span className="text-sm font-medium text-white max-w-[150px] truncate">{user.user_metadata?.full_name || user.user_metadata?.name || user.email}</span>
                </div>
                <form action={logoutAction}>
                   <Button variant="outline" size="sm" className="border-rose-400 bg-transparent text-white hover:bg-rose-600 hover:text-white px-5 rounded-full">
                     Logout
                   </Button>
                </form>
              </div>
            ) : (
              <div className="flex gap-2">
                <Button asChild variant="outline" size="sm" className="border-rose-400 bg-transparent text-white hover:bg-rose-600 hover:text-white rounded-full px-5">
                  <a href={auth.login.url}>{auth.login.text}</a>
                </Button>
                <Button asChild size="sm" className="bg-white text-rose-600 hover:bg-rose-50 hover:text-rose-700 rounded-full px-5">
                  <a href={auth.signup.url}>{auth.signup.text}</a>
                </Button>
              </div>
            )}
          </div>
        </nav>
        
        {/* Mobile View */}
        <div className="block lg:hidden">
          <div className="flex items-center justify-between">
            <a href={logo.url} className="flex items-center gap-3 w-max">
               <div className="w-9 h-9 bg-white rounded-full flex items-center justify-center overflow-hidden">
                 <img src={logo.src} className="w-full h-full object-cover" alt={logo.alt} />
               </div>
               <span className="text-xl font-bold tracking-tight text-white">{logo.title}</span>
            </a>
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="text-white hover:bg-rose-600">
                  <Menu className="size-6" />
                </Button>
              </SheetTrigger>
              <SheetContent className="overflow-y-auto bg-white border-l-rose-100 sm:max-w-sm">
                <SheetHeader className="mb-6 mt-2">
                  <SheetTitle className="text-left">
                    <a href={logo.url} className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-rose-50 flex items-center justify-center text-white overflow-hidden shadow-sm">
                        <img src={logo.src} className="w-full h-full object-cover" alt={logo.alt} />
                      </div>
                      <span className="text-lg font-bold text-gray-900 tracking-tight">
                        {logo.title}
                      </span>
                    </a>
                  </SheetTitle>
                </SheetHeader>
                
                <div className="flex flex-col gap-6">
                  <Accordion
                    type="single"
                    collapsible
                    className="flex w-full flex-col gap-4 text-gray-800"
                  >
                    {menu.map((item) => renderMobileMenuItem(item))}
                  </Accordion>
                  <div className="border-t border-rose-100 py-4">
                    <div className="grid grid-cols-2 justify-start gap-y-2">
                      {mobileExtraLinks.map((link, idx) => (
                        <a
                          key={idx}
                          className="inline-flex h-10 items-center justify-start whitespace-nowrap rounded-md px-2 py-2 text-sm font-medium text-rose-600 transition-colors hover:bg-rose-50 hover:text-rose-700"
                          href={link.url}
                        >
                          {link.name}
                        </a>
                      ))}
                    </div>
                  </div>
                  <div className="flex flex-col gap-3 pb-8">
                    {user ? (
                       <div className="space-y-4">
                         <div className="flex items-center gap-3 p-3 bg-rose-50 rounded-xl border border-rose-100">
                            <div className="w-10 h-10 rounded-full bg-rose-200 text-rose-700 flex items-center justify-center font-bold text-lg">
                              {(user.user_metadata?.full_name || user.user_metadata?.name || user.email || "U").charAt(0).toUpperCase()}
                            </div>
                            <span className="text-sm font-medium text-gray-800 truncate">{user.user_metadata?.full_name || user.user_metadata?.name || user.email}</span>
                          </div>
                          <form action={logoutAction}>
                            <Button className="w-full h-11 bg-rose-500 hover:bg-rose-600 text-white rounded-full text-base">
                              Logout
                            </Button>
                          </form>
                       </div>
                    ) : (
                       <div className="flex flex-col gap-3">
                          <Button asChild variant="outline" className="h-11 border-rose-200 text-rose-600 hover:bg-rose-50 rounded-full text-base">
                            <a href={auth.login.url}>{auth.login.text}</a>
                          </Button>
                          <Button asChild className="h-11 bg-rose-500 text-white hover:bg-rose-600 rounded-full text-base">
                            <a href={auth.signup.url}>{auth.signup.text}</a>
                          </Button>
                       </div>
                    )}
                  </div>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>
    </section>
  );
};

const renderMenuItem = (item) => {
  if (item.items) {
    return (
      <NavigationMenuItem key={item.title}>
        <NavigationMenuTrigger className="text-white/90 hover:text-white data-[state=open]:text-white font-medium bg-transparent hover:bg-rose-600 focus:bg-rose-600 data-[state=open]:bg-rose-600 data-[active]:bg-rose-600 border-none transition-colors">
          {item.title}
        </NavigationMenuTrigger>
        <NavigationMenuContent>
          <ul className="w-[340px] p-2 bg-white rounded-2xl shadow-xl border border-rose-100/50 relative mt-1">
            {item.items.map((subItem) => (
              <li key={subItem.title}>
                <NavigationMenuLink asChild>
                  <a
                    className="flex select-none items-start gap-4 rounded-xl p-3 leading-none no-underline outline-none transition-colors hover:bg-rose-50 group"
                    href={subItem.url}
                  >
                    <div className="mt-0.5 group-hover:scale-110 group-hover:text-rose-600 text-rose-400 transition-transform duration-200">
                      {subItem.icon}
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-gray-900 group-hover:text-rose-700 transition-colors">
                        {subItem.title}
                      </div>
                      {subItem.description && (
                        <p className="text-sm mt-1.5 leading-snug text-gray-500 line-clamp-2">
                          {subItem.description}
                        </p>
                      )}
                    </div>
                  </a>
                </NavigationMenuLink>
              </li>
            ))}
          </ul>
        </NavigationMenuContent>
      </NavigationMenuItem>
    );
  }

  return (
    <a
      key={item.title}
      className="group inline-flex h-9 w-max items-center justify-center rounded-md bg-transparent px-4 py-2 text-sm font-medium text-white/90 transition-colors hover:bg-rose-600 hover:text-white focus:bg-rose-600 focus:text-white"
      href={item.url}
    >
      {item.title}
    </a>
  );
};

const renderMobileMenuItem = (item) => {
  if (item.items) {
    return (
      <AccordionItem key={item.title} value={item.title} className="border-b-0">
        <AccordionTrigger className="py-3 text-base font-semibold hover:no-underline text-gray-800 hover:text-rose-600 transition-colors px-2 rounded-lg hover:bg-rose-50/50">
          {item.title}
        </AccordionTrigger>
        <AccordionContent className="mt-1 space-y-1">
          {item.items.map((subItem) => (
            <a
              key={subItem.title}
              className="flex select-none items-start gap-4 rounded-xl p-3 outline-none transition-colors hover:bg-rose-50 group"
              href={subItem.url}
            >
              <div className="mt-0.5 text-rose-500 group-hover:text-rose-600 transition-colors">{subItem.icon}</div>
              <div>
                <div className="text-sm font-semibold text-gray-900">{subItem.title}</div>
                {subItem.description && (
                  <p className="text-xs mt-1.5 leading-snug text-gray-500">
                    {subItem.description}
                  </p>
                )}
              </div>
            </a>
          ))}
        </AccordionContent>
      </AccordionItem>
    );
  }

  return (
    <a key={item.title} href={item.url} className="px-2 py-3 block text-base font-semibold text-gray-800 hover:text-rose-600 transition-colors rounded-lg hover:bg-rose-50/50">
      {item.title}
    </a>
  );
};

export { Navbar1 };
