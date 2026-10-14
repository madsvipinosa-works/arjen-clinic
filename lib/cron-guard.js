import crypto from 'crypto';
import { NextResponse } from 'next/server';

/**
 * Timing-safe authentication guard for automated Vercel Cron endpoints.
 * Compares incoming Authorization Bearer token or x-cron-secret header with CRON_SECRET.
 * Enforces constant-time byte comparison to eliminate side-channel timing attacks.
 * 
 * @param {Request} request - Next.js incoming request object
 * @returns {NextResponse|null} Returns 401/500 NextResponse if unauthorized, or null if authorized.
 */
export function verifyCronSecret(request) {
  const cronSecret = process.env.CRON_SECRET;

  // In development, if CRON_SECRET is not configured, allow local testing with a warning
  if (process.env.NODE_ENV === 'development' && !cronSecret) {
    console.warn('[cron-guard] ⚠️ Running in development without CRON_SECRET. Allowing local testing.');
    return null;
  }

  if (!cronSecret) {
    console.error('[cron-guard] ❌ CRON_SECRET environment variable is missing.');
    return NextResponse.json({ error: 'Server configuration error: CRON_SECRET missing' }, { status: 500 });
  }

  // Extract candidate token from 'Authorization: Bearer <token>' or 'x-cron-secret' header
  const authHeader = request.headers.get('authorization') || '';
  const xCronSecret = request.headers.get('x-cron-secret') || '';
  
  let candidateToken = '';
  if (authHeader.startsWith('Bearer ')) {
    candidateToken = authHeader.slice(7).trim();
  } else if (xCronSecret) {
    candidateToken = xCronSecret.trim();
  }

  if (!candidateToken) {
    return NextResponse.json({ error: 'Unauthorized: Missing cron authentication credentials' }, { status: 401 });
  }

  // Constant-time byte buffer comparison using crypto.timingSafeEqual
  const secretBuffer = Buffer.from(cronSecret, 'utf-8');
  const candidateBuffer = Buffer.from(candidateToken, 'utf-8');

  if (secretBuffer.length !== candidateBuffer.length) {
    return NextResponse.json({ error: 'Unauthorized: Invalid cron credentials' }, { status: 401 });
  }

  const isMatch = crypto.timingSafeEqual(secretBuffer, candidateBuffer);
  if (!isMatch) {
    return NextResponse.json({ error: 'Unauthorized: Invalid cron credentials' }, { status: 401 });
  }

  return null; // Authorized
}
