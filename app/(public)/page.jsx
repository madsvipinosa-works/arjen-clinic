import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Heart, UserCheck, Stethoscope, Baby, MessageSquare } from "lucide-react";

export default function LandingPage() {
  return (
    <div className="flex flex-col min-h-screen">
      {/* ─── HERO SECTION ────────────────────────────────────────────── */}
      <section className="relative px-4 py-24 md:py-32 bg-rose-50 flex items-center justify-center overflow-hidden">
        {/* Subtle background decoration */}
        <div className="absolute top-0 right-0 p-32 opacity-20 transform translate-x-1/3 -translate-y-1/3">
          <Baby className="w-96 h-96 text-rose-300" />
        </div>
        
        <div className="container relative mx-auto text-center z-10 max-w-3xl">
          <span className="text-rose-500 font-semibold tracking-wider text-sm md:text-base uppercase mb-4 block">
            Welcome to Ar-Jen Clinic
          </span>
          <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-6 leading-tight">
            Nurturing <span className="text-violet-600">Life</span>, Empowering <span className="text-violet-600">Mothers</span>
          </h1>
          <p className="text-lg md:text-xl text-gray-600 mb-10 max-w-2xl mx-auto leading-relaxed">
            Experience compassionate, specialized care for your pregnancy journey and safe delivery in a warm, trustworthy environment.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/patient/consultation">
              <Button size="lg" className="w-full sm:w-auto bg-rose-500 hover:bg-rose-600 text-white rounded-full px-8 py-6 text-lg shadow-lg shadow-rose-200">
                Start Consultation
              </Button>
            </Link>
            <Link href="#services">
              <Button size="lg" variant="outline" className="w-full sm:w-auto rounded-full px-8 py-6 text-lg border-gray-300 text-gray-700 hover:bg-gray-50">
                Explore Services
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* ─── SERVICES SECTION ────────────────────────────────────────── */}
      <section id="services" className="py-20 md:py-28 bg-white px-4">
        <div className="container mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">Our Core Offerings</h2>
            <p className="text-gray-500 max-w-2xl mx-auto">Comprehensive healthcare services tailored for women, mothers, and growing families.</p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            <ServiceCard 
              icon={<Heart className="w-8 h-8 text-rose-500" />}
              title="Prenatal Care"
              description="Comprehensive check-ups and monitoring to assure the health of both mother and baby throughout pregnancy."
            />
            <ServiceCard 
              icon={<Baby className="w-8 h-8 text-rose-500" />}
              title="Safe Delivery"
              description="Professional, compassionate lying-in services prioritizing your comfort and safety during childbirth."
            />
            <ServiceCard 
              icon={<UserCheck className="w-8 h-8 text-rose-500" />}
              title="Family Planning"
              description="Counseling and methods to help you plan your family according to your personal health and goals."
            />
            <ServiceCard 
              icon={<MessageSquare className="w-8 h-8 text-rose-500" />}
              title="Online Consultation"
              description="Real-time medical consultation with healthcare professionals. Ask questions, get advice, and manage your health remotely."
            />
          </div>
        </div>
      </section>

      {/* ─── TRUST / ABOUT SECTION ───────────────────────────────────── */}
      <section id="about" className="py-20 md:py-28 bg-rose-50 px-4">
        <div className="container mx-auto max-w-5xl">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div className="order-2 md:order-1">
              {/* Abstract trustworthy image representation or decorative block */}
              <div className="bg-white p-8 rounded-3xl shadow-xl shadow-gray-200/50 relative border border-gray-100">
                 <div className="absolute -top-4 -left-4 w-24 h-24 bg-violet-100 rounded-full z-0"></div>
                 <div className="relative z-10 text-center py-10">
                    <h3 className="text-6xl font-black text-rose-500 mb-2">10+</h3>
                    <p className="text-gray-600 font-medium">Years Serving the Community</p>
                 </div>
              </div>
            </div>
            <div className="order-1 md:order-2">
              <span className="text-rose-500 font-bold tracking-wider text-sm uppercase mb-3 block">Why Choose Us</span>
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-6 leading-tight">
                Accredited Care You Can <span className="text-violet-600">Trust</span>
              </h2>
              <p className="text-gray-600 mb-6 leading-relaxed">
                At AR-JEN Clinic, we believe that bringing life into the world should be a beautiful, safe, and supportive experience. Our dedicated team of healthcare professionals is deeply woven into the local community.
              </p>
              
              <div className="flex items-center gap-4 bg-white p-4 rounded-xl border border-gray-100 shadow-sm mb-6 inline-flex">
                <div className="w-12 h-12 bg-green-100 text-green-700 rounded-full flex items-center justify-center font-bold text-sm shrink-0">
                  PH
                </div>
                <div>
                  <h4 className="font-bold text-gray-900">PhilHealth Accredited</h4>
                  <p className="text-sm text-gray-500">Accessible and affordable healthcare for every Filipino family.</p>
                </div>
              </div>

              <div className="flex gap-4">
                 <Button className="bg-rose-500 hover:bg-rose-600 text-white rounded-full px-6">
                    Read Our Story
                 </Button>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

function ServiceCard({ icon, title, description }) {
  return (
    <Card className="border-none shadow-sm hover:shadow-md transition-shadow duration-300 bg-white">
      <CardHeader>
        <div className="w-14 h-14 bg-rose-50 rounded-2xl flex items-center justify-center mb-4">
          {icon}
        </div>
        <CardTitle className="text-xl text-gray-800">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <CardDescription className="text-gray-500 text-base leading-relaxed">
          {description}
        </CardDescription>
      </CardContent>
    </Card>
  );
}
