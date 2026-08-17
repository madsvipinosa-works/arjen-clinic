import Link from "next/link";
import { Navbar1 } from "@/components/blocks/navbar1";
import { createClient } from "@/utils/supabase/server";
import { logout } from "../(auth)/actions";

export async function generateMetadata() {
  const supabase = await createClient();
  const { data: settings } = await supabase.from("clinic_settings").select("seo_meta_title, seo_meta_description").eq("id", 1).single();
  return {
    title: settings?.seo_meta_title || "AR-JEN Maternity and Lying-In Clinic",
    description: settings?.seo_meta_description || "Providing compassionate, highly-skilled prenatal care and safe delivery.",
  };
}

export default async function PublicLayout({ children }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: settings } = await supabase.from("clinic_settings").select("*").eq("id", 1).single();

  return (
    <div className="min-h-screen flex flex-col bg-white font-sans text-gray-800">
      {/* Integrated Shadcn Mega-Menu Navbar Block */}
      <Navbar1 user={user} logoutAction={logout} settings={settings} />

      {/* Main Content Area */}
      <main className="flex-1 w-full bg-white">
        {children}
      </main>

      {/* Footer */}
      <footer className="w-full bg-gray-50 py-12 border-t border-gray-100">
        <div className="container mx-auto px-4 md:px-6 grid gap-8 md:grid-cols-3">
          <div>
            <h3 className="text-lg font-bold text-rose-500 mb-4">{settings?.clinic_name || "AR-JEN Clinic"}</h3>
            <p className="text-sm text-gray-500 leading-relaxed max-w-xs">
              {settings?.about_description?.slice(0, 150) || "Providing compassionate, highly-skilled prenatal care, safe delivery, and women's health services to our community."}
              {settings?.about_description?.length > 150 ? "..." : ""}
            </p>
          </div>
          <div>
            <h4 className="font-semibold text-gray-800 mb-4">Contact Info</h4>
            <ul className="grid gap-2 text-sm text-gray-500">
              <li>📍 {settings?.clinic_address || "123 Health Ave, Wellness District, PH"}</li>
              <li>📞 {settings?.clinic_contact || "(123) 456-7890"}</li>
              <li>✉️ {settings?.footer_email || "hello@arjenclinic.com"}</li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold text-gray-800 mb-4">Operating Hours</h4>
            <ul className="grid gap-2 text-sm text-gray-500">
              <li>{settings?.operating_hours_weekdays || "Mon - Fri: 8:00 AM - 5:00 PM"}</li>
              <li>{settings?.operating_hours_saturday || "Saturday: 8:00 AM - 12:00 PM"}</li>
              <li>{settings?.operating_hours_sunday || "Sunday: Closed"}</li>
              <li className="mt-2 font-medium text-rose-500">{settings?.emergency_notice || "24/7 Available for Emergencies & Deliveries"}</li>
            </ul>
          </div>
        </div>
        <div className="container mx-auto px-4 md:px-6 mt-12 pt-6 border-t border-gray-200 flex flex-col md:flex-row justify-between items-center text-xs text-gray-400">
          <p>© {new Date().getFullYear()} {settings?.clinic_name || "AR-JEN Clinic"}. All rights reserved.</p>
          <div className="flex gap-4 mt-4 md:mt-0 items-center">
            {settings?.social_facebook && (
              <a href={settings.social_facebook} target="_blank" rel="noopener noreferrer" className="hover:text-rose-500 transition-colors font-medium">
                Facebook
              </a>
            )}
            {settings?.social_instagram && (
              <a href={settings.social_instagram} target="_blank" rel="noopener noreferrer" className="hover:text-rose-500 transition-colors font-medium ml-2">
                Instagram
              </a>
            )}
            <Link href="#" className="hover:text-rose-500 transition-colors ml-4">Privacy Policy</Link>
            <Link href="#" className="hover:text-rose-500 transition-colors">Terms of Service</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
