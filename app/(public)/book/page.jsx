// app/(public)/book/page.jsx
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CalendarDays, ClipboardList, CheckCircle2 } from "lucide-react";
import { createClient } from "@/utils/supabase/server";
import { createAppointment } from "../../(auth)/actions";

export default async function BookingPage({ searchParams }) {
  const params = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // Conditional Rendering: Secure the Booking UI if there is no user
  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="max-w-md w-full border-none shadow-xl shadow-gray-200/50 p-6 text-center">
          <CardHeader>
            <CardTitle className="text-2xl font-bold text-gray-900">Sign In Required</CardTitle>
            <CardDescription>
              Please log in or register to securely book your appointment.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/login">
              <Button className="bg-rose-500 hover:bg-rose-600 text-white w-full rounded-full h-12 text-base font-medium mt-2">
                Login to Continue
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  // If the user IS logged in, render the secure intake form
  return (
    <div className="min-h-screen bg-gray-50 py-12 md:py-24 px-4">
      <div className="container mx-auto max-w-3xl">
        <div className="text-center mb-10">
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">Request an Appointment</h1>
          <p className="text-gray-500 max-w-xl mx-auto">
            Fill out the form below to request a consultation or check-up. Our staff will confirm your schedule shortly.
          </p>
        </div>

        {/* Display Success Error Messages */}
        {params?.success && (
          <div className="bg-emerald-50 text-emerald-700 p-4 rounded-xl mb-8 flex items-center justify-center gap-3 border border-emerald-200 shadow-sm">
            <CheckCircle2 className="w-5 h-5 text-emerald-500" />
            <span className="font-medium">Your appointment request has been securely submitted! We will contact you soon.</span>
          </div>
        )}

        {params?.error && (
          <div className="bg-red-50 text-red-700 p-4 rounded-xl mb-8 border border-red-200 shadow-sm text-center">
            <span className="font-medium">{params.error}</span>
          </div>
        )}

        {/* Form Container */}
        <form action={createAppointment}>
          <Card className="border-none shadow-xl shadow-gray-200/50 overflow-hidden">
            {/* Top Progress Visual Indicator */}
            <div className="bg-rose-50 border-b border-rose-100 flex p-4 text-sm font-medium text-rose-700 justify-center gap-8">
              <div className="flex items-center gap-2">
                  <ClipboardList className="w-4 h-4" />
                  <span>Service Info</span>
              </div>
              <div className="flex items-center gap-2 text-rose-300">
                  <CalendarDays className="w-4 h-4 text-rose-300" />
                  <span>Date & Time</span>
              </div>
              <div className="flex items-center gap-2 text-rose-300">
                  <CheckCircle2 className="w-4 h-4 text-rose-300" />
                  <span>Confirmation</span>
              </div>
            </div>

            <CardHeader className="bg-white px-8 pt-8 pb-4">
              <CardTitle className="text-xl">Appointment Details</CardTitle>
              <CardDescription>Select the service you need and your preferred schedule.</CardDescription>
            </CardHeader>
            
            <CardContent className="px-8 pb-8 space-y-8 bg-white">
              {/* Step 1: Service */}
              <div className="space-y-4">
                <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider border-b pb-2">1. Select Service</h3>
                <div className="space-y-2">
                  <Label htmlFor="service">Type of Consultation/Service</Label>
                  <Select name="service_type" required>
                    <SelectTrigger className="w-full focus:ring-rose-500">
                      <SelectValue placeholder="Choose a service..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="prenatal">Prenatal Check-up</SelectItem>
                      <SelectItem value="delivery">Safe Delivery / Lying-in Request</SelectItem>
                      <SelectItem value="family_planning">Family Planning Counseling</SelectItem>
                      <SelectItem value="general">General Medical Consultation</SelectItem>
                      <SelectItem value="other">Other Concerns</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Step 2: Date & Patient Info */}
              <div className="space-y-4">
                <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider border-b pb-2">2. Schedule & Details</h3>
                
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="appointment_date">Preferred Date</Label>
                    <Input type="date" id="appointment_date" name="appointment_date" className="focus-visible:ring-rose-500" required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="time">Preferred Time (Optional)</Label>
                    <Select name="time">
                      <SelectTrigger id="time" className="focus:ring-rose-500">
                        <SelectValue placeholder="Any time" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="morning">Morning (8AM - 12PM)</SelectItem>
                        <SelectItem value="afternoon">Afternoon (1PM - 5PM)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2 mt-4">
                  <Label htmlFor="notes">Additional Notes for the Doctor</Label>
                  <textarea 
                      id="notes" 
                      name="notes"
                      className="flex min-h-[80px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-rose-500 disabled:cursor-not-allowed disabled:opacity-50"
                      placeholder="Briefly describe any specific concerns..."
                  />
                </div>
              </div>
            </CardContent>

            <CardFooter className="px-8 py-6 bg-gray-50 border-t flex items-center justify-between">
              <Link href="/" className="text-gray-500 hover:text-rose-500 text-sm font-medium">
                Cancel
              </Link>
              <Button type="submit" className="bg-rose-500 hover:bg-rose-600 text-white rounded-full px-8">
                  Confirm Appointment
              </Button>
            </CardFooter>
          </Card>
        </form>
      </div>
    </div>
  );
}
