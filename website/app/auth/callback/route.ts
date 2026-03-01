import { createClient } from '@/lib/supabase/server';
import { NextResponse, type NextRequest } from 'next/server';

/**
 * Получает реальный origin сайта (учитывая reverse proxy на Render).
 * На Render request.url содержит localhost:10000, а не внешний домен.
 */
function getOrigin(request: NextRequest): string {
  const forwardedHost = request.headers.get('x-forwarded-host');
  const forwardedProto = request.headers.get('x-forwarded-proto') || 'https';

  if (forwardedHost) {
    return `${forwardedProto}://${forwardedHost}`;
  }

  // Fallback: env variable or request URL
  if (process.env.NEXT_PUBLIC_APP_URL) {
    return process.env.NEXT_PUBLIC_APP_URL;
  }

  return new URL(request.url).origin;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const fromApp = searchParams.get('from_app') === 'true';
  const redirect = fromApp
    ? '/auth/app-complete'
    : searchParams.get('redirect') || '/subscribe';
  const origin = getOrigin(request);

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      return NextResponse.redirect(`${origin}${redirect}`);
    }

    // If code exchange fails but the request came from the mobile app,
    // still show the success page — the app-side session may have been
    // established via onAuthStateChange independently.
    if (fromApp) {
      return NextResponse.redirect(`${origin}/auth/app-complete`);
    }
  }

  // If there's no code but user came from the mobile app, the auth may
  // have used the implicit flow (tokens in hash fragment, not visible
  // on the server). Show the success page.
  if (fromApp) {
    return NextResponse.redirect(`${origin}/auth/app-complete`);
  }

  // Error — redirect to sign in
  return NextResponse.redirect(
    `${origin}/auth/sign-in?error=auth_callback_failed`
  );
}
