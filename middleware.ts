import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL, key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return response;
  const supabase = createServerClient(url, key, {
    cookies: { getAll: () => request.cookies.getAll(), setAll: (cookies: {name:string; value:string; options:CookieOptions}[]) => {
      cookies.forEach(({ name, value }) => request.cookies.set(name, value));
      response = NextResponse.next({ request });
      cookies.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
    } }
  });
  try { await supabase.auth.getUser(); } catch { /* Keep existing cookies available when the network is offline. */ }
  return response;
}
export const config = { matcher: ['/((?!_next/static|_next/image|favicon.ico|manifest.json|sw.js).*)'] };
