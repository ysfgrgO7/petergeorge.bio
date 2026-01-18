import { adminAuth } from './firebaseAdmin';
import { cookies } from 'next/headers';

export async function createSessionCookie(idToken: string) {
  const expiresIn = 60 * 60 * 24 * 5 * 1000; // 5 days
  const sessionCookie = await adminAuth.createSessionCookie(idToken, { expiresIn });
  return sessionCookie;
}

export async function getSession() {
  const session = (await cookies()).get('session')?.value;
  if (!session) return null;

  try {
    const decodedClaims = await adminAuth.verifySessionCookie(session, true);
    return decodedClaims;
  } catch (error) {
    return null;
  }
}
