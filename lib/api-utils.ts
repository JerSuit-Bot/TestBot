import { NextResponse } from 'next/server';

export function apiError(message: string, status: number = 400) {
  return NextResponse.json({ error: message }, { status });
}

export function apiSuccess(data: unknown, status: number = 200) {
  return NextResponse.json(data, { status });
}

export function unauthorized() {
  return apiError('Unauthorized', 401);
}

export function forbidden() {
  return apiError('Forbidden', 403);
}

export function notFound() {
  return apiError('Not found', 404);
}

export function rateLimited(retryAfter: number = 60) {
  return NextResponse.json(
    { error: 'Too many requests. Please try again later.' },
    { status: 429, headers: { 'Retry-After': String(retryAfter) } }
  );
}

export function getClientIP(request: Request): string | null {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0].trim();
  return null;
}

export function getUserAgent(request: Request): string | null {
  return request.headers.get('user-agent');
}

export function setSessionCookie(response: NextResponse, name: string, value: string, maxAgeHours: number) {
  const isProduction = process.env.NODE_ENV === 'production';
  response.cookies.set(name, value, {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'lax',
    path: '/',
    maxAge: maxAgeHours * 3600,
  });
}

export function clearSessionCookie(response: NextResponse, name: string) {
  response.cookies.set(name, '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  });
}
