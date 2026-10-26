import { NextRequest, NextResponse } from 'next/server';
import { createServerClient, type CookieOptions } from '@supabase/ssr';
export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get('code');
  const rawNext = request.nextUrl.searchParams.get('next') ?? '/';
  const recovery = request.nextUrl.searchParams.get('type') === 'recovery';
  const next = recovery ? '/auth/update-password' : rawNext.startsWith('/') && !rawNext.startsWith('//') ? rawNext : '/';
  if (code && process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    const response = NextResponse.redirect(new URL(next, request.url));
    const supabase = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
      cookies: { getAll: () => request.cookies.getAll(), setAll: (cookies: {name:string; value:string; options:CookieOptions}[]) => cookies.forEach(({ name, value, options }) => response.cookies.set(name, value, options)) }
    });
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return response;
  }
  return NextResponse.redirect(new URL('/?auth=callback-error', request.url));
}
