import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { createClient } from "@/utils/supabase/server";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export async function generateMetadata() {
  try {
    const supabase = await createClient();
    const { data: settings } = await supabase
      .from("clinic_settings")
      .select("seo_meta_title, seo_meta_description, favicon_url, navbar_logo")
      .eq("id", 1)
      .single();

    const iconUrl = settings?.favicon_url || settings?.navbar_logo || "/favicon.ico";

    return {
      title: {
        default: settings?.seo_meta_title || "AR-JEN Maternity and Lying-In Clinic",
        template: `%s | ${settings?.seo_meta_title || "AR-JEN Maternity Clinic"}`,
      },
      description: settings?.seo_meta_description || "Providing compassionate, highly-skilled prenatal care, safe delivery, and women's health services.",
      icons: {
        icon: [{ url: iconUrl, sizes: "any" }],
        apple: [{ url: iconUrl }],
        shortcut: [iconUrl],
      },
    };
  } catch {
    return {
      title: "AR-JEN Maternity and Lying-In Clinic",
      description: "Providing compassionate, highly-skilled prenatal care and safe delivery.",
      icons: {
        icon: ["/favicon.ico"],
      },
    };
  }
}

export default function RootLayout({ children }) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col" suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}
