import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { requestPasswordReset } from "../actions";
import { ArrowLeft, CheckCircle2 } from "lucide-react";

export default async function ForgotPasswordPage({ searchParams }) {
  const params = (await searchParams) || {};

  return (
    <Card className="border-none shadow-xl shadow-gray-200/50">
      <CardHeader className="space-y-1 pb-6 text-center">
        <CardTitle className="text-2xl font-bold text-gray-900">Forgot password?</CardTitle>
        <CardDescription className="text-gray-500 max-w-xs mx-auto">
          Enter your registered email and we'll send you a secure link to reset your password.
        </CardDescription>
      </CardHeader>
      
      <form action={requestPasswordReset}>
        <CardContent className="space-y-4">
          {params?.error && (
            <div className="bg-red-50 text-red-600 text-sm p-3 rounded-md border border-red-100">
              {params.error}
            </div>
          )}
          {params?.success && (
            <div className="bg-emerald-50 text-emerald-700 text-sm p-4 rounded-xl border border-emerald-200 flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">Password Reset Email Sent!</p>
                <p className="text-xs text-emerald-600 mt-1">
                  Please check your inbox (and spam folder) for the reset link.
                </p>
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="email">Email address</Label>
            <Input 
              id="email" 
              name="email" 
              type="email" 
              placeholder="m.santos@example.com" 
              className="focus-visible:ring-rose-500" 
              required 
            />
          </div>

          <Button 
            type="submit" 
            className="w-full bg-rose-500 hover:bg-rose-600 text-white rounded-md h-12 text-base font-medium mt-6 shadow-md shadow-rose-200"
          >
            Send Password Reset Link
          </Button>
        </CardContent>
      </form>

      <CardFooter className="flex flex-col border-t p-6 mt-4">
        <div className="text-center text-sm text-gray-500">
          <Link href="/login" className="inline-flex items-center gap-1.5 font-medium text-rose-500 hover:text-rose-600 transition-colors">
            <ArrowLeft className="w-4 h-4" />
            Back to Sign In
          </Link>
        </div>
      </CardFooter>
    </Card>
  );
}
