import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { signup } from "../actions";
import { GoogleButton } from "@/components/auth/google-button";

export default async function RegisterPage({ searchParams }) {
  const params = (await searchParams) || {};

  return (
    <Card className="border-none shadow-xl shadow-gray-200/50">
      <CardHeader className="space-y-1 pb-6 text-center">
        <CardTitle className="text-2xl font-bold text-gray-900">Create an account</CardTitle>
        <CardDescription className="text-gray-500">
          Register to book appointments and access your prenatal records.
        </CardDescription>
      </CardHeader>
      
      {/* 
        The native form action natively resolves to the 'signup' Next.js Server Action
        located in app/(auth)/actions.js. 
      */}
      <form action={signup}>
        <CardContent className="space-y-4">
          {params?.error && (
            <div className="bg-red-50 text-red-600 text-sm p-3 rounded-md border border-red-100">
              {params.error}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="first-name">First name</Label>
              <Input id="first-name" name="first-name" placeholder="Maria" className="focus-visible:ring-rose-500" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="last-name">Last name</Label>
              <Input id="last-name" name="last-name" placeholder="Santos" className="focus-visible:ring-rose-500" required />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            {/* Must have name="email" to be picked up by the formData.get('email') in Server Action */}
            <Input id="email" name="email" type="email" placeholder="m.santos@example.com" className="focus-visible:ring-rose-500" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input id="password" name="password" type="password" className="focus-visible:ring-rose-500" required />
            <p className="text-xs text-gray-400 mt-1">Must be at least 6 characters long.</p>
          </div>
          <Button type="submit" className="w-full bg-rose-500 hover:bg-rose-600 text-white rounded-md h-12 text-base font-medium mt-6">
            Create Account
          </Button>
        </CardContent>
      </form>

      <div className="px-6 pb-2">
        <div className="relative mb-6">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t border-gray-200" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-white px-2 text-gray-500 font-medium">Or register with</span>
          </div>
        </div>
        <GoogleButton label="Sign up with Google" next="/book" />
      </div>

      <CardFooter className="flex flex-col border-t p-6 mt-4">
        <div className="text-center text-sm text-gray-500">
          Already have an account?{" "}
          <Link href="/login" className="font-semibold text-rose-500 hover:text-rose-600">
            Sign in
          </Link>
        </div>
      </CardFooter>
    </Card>
  );
}
