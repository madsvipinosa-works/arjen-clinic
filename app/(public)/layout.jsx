import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Menu } from "lucide-react";
import { createClient } from "@/utils/supabase/server";
import { logout } from "../(auth)/actions";

export default async function PublicLayout({ children }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return (
    <div className="min-h-screen flex flex-col bg-white font-sans text-gray-800">
      {/* Navigation Bar */}
      <header className="sticky top-0 z-50 w-full bg-rose-500 shadow-sm">
        <div className="container mx-auto px-4 md:px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <span className="text-xl font-bold tracking-tight text-white">AR-JEN Clinic</span>
          </Link>
          
          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-6">
            <Link href="/" className="text-sm font-medium text-white/90 hover:text-white transition-colors">Home</Link>
            <Link href="/#about" className="text-sm font-medium text-white/90 hover:text-white transition-colors">About</Link>
            <Link href="/#services" className="text-sm font-medium text-white/90 hover:text-white transition-colors">Services</Link>
            <Link href="/book" className="text-sm font-medium text-white/90 hover:text-white transition-colors">Book Appointment</Link>
          </nav>

          <div className="hidden md:flex items-center">
            {user ? (
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-rose-100 text-rose-700 flex items-center justify-center font-bold text-sm border border-rose-200">
                    {user.email.charAt(0).toUpperCase()}
                  </div>
                  <span className="text-sm font-medium text-white max-w-[120px] truncate">{user.email}</span>
                </div>
                <form action={logout}>
                  <Button variant="ghost" size="sm" className="text-white hover:bg-rose-600 px-3">
                    Logout
                  </Button>
                </form>
              </div>
            ) : (
              <Link href="/login">
                <Button variant="secondary" className="bg-white text-rose-600 hover:bg-gray-100 font-semibold border-none rounded-full px-6">
                  Login
                </Button>
              </Link>
            )}
          </div>

          {/* Mobile Nav */}
          <div className="md:hidden">
            <Sheet>
              <SheetTrigger render={<Button variant="ghost" size="icon" className="text-white hover:bg-rose-600" />}>
                <Menu className="h-6 w-6" />
                <span className="sr-only">Toggle menu</span>
              </SheetTrigger>
              <SheetContent side="left" className="bg-white">
                <Link href="/" className="flex items-center gap-2 mb-8">
                  <span className="text-xl font-bold text-rose-500">AR-JEN Clinic</span>
                </Link>
                <nav className="flex flex-col gap-4">
                  <Link href="/" className="text-lg font-medium text-gray-800 hover:text-rose-500">Home</Link>
                  <Link href="/#about" className="text-lg font-medium text-gray-800 hover:text-rose-500">About</Link>
                  <Link href="/#services" className="text-lg font-medium text-gray-800 hover:text-rose-500">Services</Link>
                  <Link href="/book" className="text-lg font-medium text-gray-800 hover:text-rose-500">Book Appointment</Link>
                  <div className="mt-4 pt-4 border-t">
                    {user ? (
                      <div className="flex flex-col gap-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-rose-100 text-rose-700 flex items-center justify-center font-bold text-lg border border-rose-200">
                            {user.email.charAt(0).toUpperCase()}
                          </div>
                          <span className="text-base font-medium text-gray-800 truncate">{user.email}</span>
                        </div>
                        <form action={logout}>
                          <Button className="w-full bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-full">
                            Logout
                          </Button>
                        </form>
                      </div>
                    ) : (
                      <Link href="/login">
                        <Button className="w-full bg-rose-500 hover:bg-rose-600 text-white rounded-full">Login</Button>
                      </Link>
                    )}
                  </div>
                </nav>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 w-full bg-white">
        {children}
      </main>

      {/* Footer */}
      <footer className="w-full bg-gray-50 py-12 border-t border-gray-100">
        <div className="container mx-auto px-4 md:px-6 grid gap-8 md:grid-cols-3">
          <div>
            <h3 className="text-lg font-bold text-rose-500 mb-4">AR-JEN Clinic</h3>
            <p className="text-sm text-gray-500 leading-relaxed max-w-xs">
              Providing compassionate, highly-skilled prenatal care, safe delivery, and women's health services to our community.
            </p>
          </div>
          <div>
            <h4 className="font-semibold text-gray-800 mb-4">Contact Info</h4>
            <ul className="grid gap-2 text-sm text-gray-500">
              <li>📍 123 Health Ave, Wellness District, PH</li>
              <li>📞 (123) 456-7890</li>
              <li>✉️ hello@arjenclinic.com</li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold text-gray-800 mb-4">Operating Hours</h4>
            <ul className="grid gap-2 text-sm text-gray-500">
              <li>Mon - Fri: 8:00 AM - 5:00 PM</li>
              <li>Saturday: 8:00 AM - 12:00 PM</li>
              <li>Sunday: Closed</li>
              <li className="mt-2 font-medium text-rose-500">24/7 Available for Emergencies & Deliveries</li>
            </ul>
          </div>
        </div>
        <div className="container mx-auto px-4 md:px-6 mt-12 pt-6 border-t border-gray-200 flex flex-col md:flex-row justify-between items-center text-xs text-gray-400">
          <p>© {new Date().getFullYear()} AR-JEN Clinic. All rights reserved.</p>
          <div className="flex gap-4 mt-4 md:mt-0">
            <Link href="#" className="hover:text-rose-500 transition-colors">Privacy Policy</Link>
            <Link href="#" className="hover:text-rose-500 transition-colors">Terms of Service</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
