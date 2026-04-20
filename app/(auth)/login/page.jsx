import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { login } from "../actions";
import { FacebookButton } from "@/components/auth/facebook-button";

export default async function LoginPage({ searchParams }) {
  const params = await searchParams; // Wait for search params (Next 15+ standard)

  return (
    <Card className="border-none shadow-xl shadow-gray-200/50">
      <CardHeader className="space-y-1 pb-6">
        <CardTitle className="text-2xl font-bold text-gray-900 text-center">Welcome back</CardTitle>
        <CardDescription className="text-center text-gray-500">
          Enter your email and password to access your account
        </CardDescription>
      </CardHeader>
      
      {/* 
        The classic HTML form action attribute natively integrates with Next.js Server Actions. 
        When the user submits, it automatically calls the "login" server action in actions.js.
      */}
      <form action={login}>
        <CardContent className="space-y-4">
          {params?.error && (
            <div className="bg-red-50 text-red-600 text-sm p-3 rounded-md border border-red-100">
              {params.error}
            </div>
          )}
          {params?.success && (
            <div className="bg-emerald-50 text-emerald-600 text-sm p-3 rounded-md border border-emerald-100">
              {params.success}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            {/* The 'name' attribute is what formData.get('email') picks up */}
            <Input id="email" name="email" type="email" placeholder="m.santos@example.com" className="focus-visible:ring-rose-500" required />
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="password">Password</Label>
              <Link href="#" className="text-sm font-medium text-violet-600 hover:text-violet-700">
                Forgot password?
              </Link>
            </div>
            {/* The 'name' attribute is required for the Server Action */}
            <Input id="password" name="password" type="password" required className="focus-visible:ring-rose-500" />
          </div>
          {/* type="submit" will trigger the form action */}
          <Button type="submit" className="w-full bg-rose-500 hover:bg-rose-600 text-white rounded-md h-12 text-base font-medium mt-6">
            Sign In
          </Button>
        </CardContent>
      </form>

      <div className="px-6 pb-2">
        <div className="relative mb-6">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t border-gray-200" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-white px-2 text-gray-500 font-medium">Or continue with</span>
          </div>
        </div>
        <FacebookButton />
      </div>
      

      <CardFooter className="flex flex-col border-t p-6 mt-4">
        <div className="text-center text-sm text-gray-500">
          Don't have an account?{" "}
          <Link href="/register" className="font-semibold text-rose-500 hover:text-rose-600">
            Register as a new patient
          </Link>
        </div>
      </CardFooter>
    </Card>
  );
}
