import Link from "next/link";
import { Navbar1 } from "@/components/blocks/navbar1";
import { createClient } from "@/utils/supabase/server";
import { logout } from "../(auth)/actions";

export default async function PublicLayout({ children }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return (
    <div className="min-h-screen flex flex-col bg-white font-sans text-gray-800">
      {/* Integrated Shadcn Mega-Menu Navbar Block */}
      <Navbar1 user={user} logoutAction={logout} />

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
