'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Shield, Eye, EyeOff, LogIn } from "lucide-react";

export default function AdminLoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await fetch('/api/admin/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }),
      });

      const data = await response.json();

      if (response.ok) {
        router.push('/admin');
      } else {
        setError(data.details ? `${data.error}: ${data.details}` : data.error || 'Invalid credentials');
      }
    } catch (err) {
      setError('Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-rose-50 via-white to-blue-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo/Branding */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-rose-500 rounded-2xl shadow-lg shadow-rose-200 mb-4">
            <Shield className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-black text-gray-900 tracking-tight">Arjen Clinic</h1>
          <p className="text-gray-500 font-medium mt-1">Administrator Portal</p>
        </div>

        <Card className="border-0 shadow-2xl shadow-gray-200/50">
          <CardHeader className="text-center pb-6">
            <CardTitle className="text-2xl font-bold text-gray-900">Sign In</CardTitle>
            <CardDescription className="text-gray-600 font-medium">
              Enter your admin credentials to access the dashboard
            </CardDescription>
          </CardHeader>
          
          <CardContent className="pt-0">
            <form onSubmit={handleLogin} className="space-y-6">
              {error && (
                <Alert variant="destructive" className="rounded-2xl">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <div className="space-y-2">
                <Label htmlFor="username" className="text-sm font-bold text-gray-700 uppercase tracking-wider">
                  Username
                </Label>
                <Input
                  id="username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="h-12 rounded-2xl border-gray-200 focus:ring-rose-500 font-semibold"
                  placeholder="Enter username"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-sm font-bold text-gray-700 uppercase tracking-wider">
                  Password
                </Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="h-12 rounded-2xl border-gray-200 focus:ring-rose-500 font-semibold pr-12"
                    placeholder="Enter password"
                    required
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-12 w-12 rounded-2xl hover:bg-gray-100"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <EyeOff className="w-4 h-4 text-gray-500" />
                    ) : (
                      <Eye className="w-4 h-4 text-gray-500" />
                    )}
                  </Button>
                </div>
              </div>

              <Button
                type="submit"
                className="w-full bg-rose-500 hover:bg-rose-600 text-white rounded-2xl h-14 font-bold text-lg gap-3 shadow-lg shadow-rose-100 transition-all active:scale-95"
                disabled={loading}
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <LogIn className="w-5 h-5" />
                    Sign In
                  </>
                )}
              </Button>
            </form>

            <div className="mt-8 pt-6 border-t border-gray-100">
              <div className="text-center">
                <p className="text-sm text-gray-500 font-medium">
                  <Link href="/" className="text-rose-500 hover:text-rose-600 font-semibold">
                    Return to Clinic Website
                  </Link>
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Default credentials hint */}
        <div className="mt-6 text-center">
          <p className="text-xs text-gray-400">
            Default credentials: username <span className="font-mono bg-gray-100 px-2 py-1 rounded">admin@ar-jen</span> / password <span className="font-mono bg-gray-100 px-2 py-1 rounded">admin123</span>
          </p>
        </div>
      </div>
    </div>
  );
}
