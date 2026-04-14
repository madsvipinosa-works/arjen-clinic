import Link from "next/link";
import { Baby } from "lucide-react";

export default function AuthLayout({ children }) {
  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-gray-50">
      {/* Visual / Branding Side */}
      <div className="md:w-1/2 bg-rose-500 p-8 md:p-12 flex flex-col justify-between hidden md:flex relative overflow-hidden">
        {/* Subtle background decoration */}
        <div className="absolute -bottom-24 -left-24 opacity-10">
          <Baby className="w-96 h-96 text-white" />
        </div>
        
        <div className="relative z-10">
          <Link href="/" className="flex items-center gap-2 mb-12">
            <span className="text-2xl font-bold tracking-tight text-white">AR-JEN Clinic</span>
          </Link>
          <h1 className="text-4xl font-bold text-white mb-6 leading-tight">
            Partnering with you<br />every step of the way.
          </h1>
          <p className="text-rose-100 text-lg max-w-md">
            Join our community to easily manage your appointments, view your health records, and connect with your healthcare providers.
          </p>
        </div>
        
        <div className="text-rose-200 text-sm relative z-10">
          © {new Date().getFullYear()} AR-JEN Clinic. All rights reserved.
        </div>
      </div>

      {/* Form Side */}
      <div className="flex-1 flex flex-col justify-center items-center p-6 md:p-12">
        <div className="w-full max-w-md">
           {/* Mobile branding header */}
           <div className="md:hidden text-center mb-8">
              <Link href="/" className="inline-block">
                <span className="text-2xl font-bold tracking-tight text-rose-500">AR-JEN Clinic</span>
              </Link>
           </div>
           
           {children}
        </div>
      </div>
    </div>
  );
}
