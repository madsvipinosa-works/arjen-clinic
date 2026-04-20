'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Shield, Database, CheckCircle } from "lucide-react";

export default function AdminSetupPage() {
  const [username, setUsername] = useState('admin');
  const [email, setEmail] = useState('admin@arjen-clinic.com');
  const [password, setPassword] = useState('admin123');
  const [isSettingUp, setIsSettingUp] = useState(false);
  const [message, setMessage] = useState('');
  const router = useRouter();

  const handleSetup = async (e) => {
    e.preventDefault();
    setIsSettingUp(true);
    setMessage('');

    try {
      const response = await fetch('/api/admin/setup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, email, password }),
      });

      const data = await response.json();

      if (response.ok) {
        setMessage('Admin account created successfully! Redirecting to login...');
        setTimeout(() => {
          router.push('/admin/login');
        }, 2000);
      } else {
        setMessage(data.error || 'Setup failed');
      }
    } catch (error) {
      setMessage('Setup failed. Please try again.');
    } finally {
      setIsSettingUp(false);
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
          <p className="text-gray-500 font-medium mt-1">Admin Setup</p>
        </div>

        <Card className="border-0 shadow-2xl shadow-gray-200/50">
          <CardHeader className="text-center pb-6">
            <CardTitle className="text-xl font-bold text-gray-900">Create Admin Account</CardTitle>
            <CardDescription className="text-gray-600 font-medium">
              Set up your administrator credentials for the first time
            </CardDescription>
          </CardHeader>
          
          <CardContent className="pt-0">
            <form onSubmit={handleSetup} className="space-y-6">
              {message && (
                <Alert className={message.includes('success') ? 'border-emerald-200 bg-emerald-50' : 'border-red-200 bg-red-50'}>
                  <AlertDescription className={message.includes('success') ? 'text-emerald-800' : 'text-red-800'}>
                    {message}
                  </AlertDescription>
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
                  placeholder="Enter admin username"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-bold text-gray-700 uppercase tracking-wider">
                  Email
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="h-12 rounded-2xl border-gray-200 focus:ring-rose-500 font-semibold"
                  placeholder="Enter admin email"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-sm font-bold text-gray-700 uppercase tracking-wider">
                  Password
                </Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="h-12 rounded-2xl border-gray-200 focus:ring-rose-500 font-semibold"
                  placeholder="Enter admin password"
                  required
                />
              </div>

              <Button
                type="submit"
                className="w-full bg-rose-500 hover:bg-rose-600 text-white rounded-2xl h-14 font-bold text-lg gap-3 shadow-lg shadow-rose-100 transition-all active:scale-95"
                disabled={isSettingUp}
              >
                {isSettingUp ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <Database className="w-5 h-5" />
                    Create Admin Account
                  </>
                )}
              </Button>
            </form>

            <div className="mt-6 pt-6 border-t border-gray-100">
              <div className="text-center">
                <p className="text-sm text-gray-500 font-medium">
                  Already have an admin account?{' '}
                  <a href="/admin/login" className="text-rose-500 hover:text-rose-600 font-semibold">
                    Sign in here
                  </a>
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
