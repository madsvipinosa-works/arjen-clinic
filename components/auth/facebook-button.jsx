'use client';

import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { createClient } from "@/utils/supabase/client";

export function FacebookButton() {
  const [loading, setLoading] = useState(false);
  const supabase = createClient();

  const handleFacebookLogin = async () => {
    setLoading(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'facebook',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (error) {
      console.error('Facebook login error:', error.message);
      setLoading(false);
    }
  };

  return (
    <Button 
      type="button" 
      variant="outline" 
      onClick={handleFacebookLogin}
      disabled={loading}
      className="w-full h-12 text-base font-medium flex items-center justify-center gap-2 border-gray-200 hover:bg-gray-50 text-[#1877F2]"
    >
      {loading ? (
        <div className="w-5 h-5 border-2 border-[#1877F2] border-t-transparent rounded-full animate-spin" />
      ) : (
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2.04C6.5 2.04 2 6.53 2 12.06C2 17.06 5.66 21.21 10.44 21.96V14.96H7.9V12.06H10.44V9.85C10.44 7.34 11.93 5.96 14.22 5.96C15.31 5.96 16.45 6.15 16.45 6.15V8.62H15.19C13.95 8.62 13.56 9.39 13.56 10.18V12.06H16.34L15.89 14.96H13.56V21.96A10 10 0 0 0 22 12.06C22 6.53 17.5 2.04 12 2.04Z" />
        </svg>
      )}
      Continue with Facebook
    </Button>
  );
}
