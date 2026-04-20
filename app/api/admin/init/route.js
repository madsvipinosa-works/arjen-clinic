import { createClient } from "@/utils/supabase/server";
import { NextResponse } from "next/server";

export async function POST(request) {
  try {
    const supabase = await createClient();
    
    // Create admin credentials table
    const { error: tableError } = await supabase
      .from('admin_credentials')
      .select('id')
      .limit(1);
    
    if (tableError && tableError.code === 'PGRST116') {
      // Table doesn't exist, create it
      const { error: createError } = await supabase.rpc('sql', {
        query: `
          CREATE TABLE public.admin_credentials (
            id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
            username text NOT NULL UNIQUE,
            password_hash text NOT NULL,
            email text,
            created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
            updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
          );
          
          ALTER TABLE public.admin_credentials DISABLE ROW LEVEL SECURITY;
        `
      });
      
      if (createError) {
        console.error('Table creation error:', createError);
        return NextResponse.json({ error: 'Failed to create table' }, { status: 500 });
      }
      
      // Insert default admin
      const { error: insertError } = await supabase
        .from('admin_credentials')
        .insert({
          username: 'admin',
          password_hash: 'admin123',
          email: 'admin@arjen-clinic.com'
        });
        
      if (insertError) {
        console.error('Insert error:', insertError);
        return NextResponse.json({ error: 'Failed to create admin' }, { status: 500 });
      }
    }
    
    return NextResponse.json({ 
      success: true, 
      message: 'Admin initialized successfully' 
    });
    
  } catch (error) {
    console.error('Init error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
