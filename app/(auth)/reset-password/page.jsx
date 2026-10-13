import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updatePassword } from "../actions";
import { KeyRound } from "lucide-react";

export default async function ResetPasswordPage({ searchParams }) {
  const params = (await searchParams) || {};

  return (
    <Card className="border-none shadow-xl shadow-gray-200/50">
      <CardHeader className="space-y-1 pb-6 text-center">
        <div className="w-12 h-12 bg-rose-50 rounded-2xl flex items-center justify-center mx-auto text-rose-500 mb-2">
          <KeyRound className="w-6 h-6" />
        </div>
        <CardTitle className="text-2xl font-bold text-gray-900">Set new password</CardTitle>
        <CardDescription className="text-gray-500 max-w-xs mx-auto">
          Please choose a strong password with at least 6 characters.
        </CardDescription>
      </CardHeader>
      
      <form action={updatePassword}>
        <CardContent className="space-y-4">
          {params?.error && (
            <div className="bg-red-50 text-red-600 text-sm p-3 rounded-md border border-red-100">
              {params.error}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="password">New Password</Label>
            <Input 
              id="password" 
              name="password" 
              type="password" 
              placeholder="••••••••" 
              className="focus-visible:ring-rose-500" 
              required 
            />
            <p className="text-xs text-gray-400">Must be at least 6 characters long.</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirm_password">Confirm New Password</Label>
            <Input 
              id="confirm_password" 
              name="confirm_password" 
              type="password" 
              placeholder="••••••••" 
              className="focus-visible:ring-rose-500" 
              required 
            />
          </div>

          <Button 
            type="submit" 
            className="w-full bg-rose-500 hover:bg-rose-600 text-white rounded-md h-12 text-base font-medium mt-6 shadow-md shadow-rose-200"
          >
            Update Password
          </Button>
        </CardContent>
      </form>

      <CardFooter className="flex flex-col border-t p-6 mt-4">
        <div className="text-center text-sm text-gray-500">
          Remember your password?{" "}
          <Link href="/login" className="font-semibold text-rose-500 hover:text-rose-600">
            Sign in
          </Link>
        </div>
      </CardFooter>
    </Card>
  );
}
