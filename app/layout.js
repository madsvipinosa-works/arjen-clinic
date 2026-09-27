import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { createClient } from "@/utils/supabase/server";

const fontSans = Geist({
  variable: "--font-sans",
  subsets: ["latin"],
});

const fontMono = Geist_Mono({
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
      className={`${fontSans.variable} ${fontMono.variable} h-full font-sans antialiased`}
    >
      <body className="min-h-full flex flex-col font-sans antialiased" suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}
