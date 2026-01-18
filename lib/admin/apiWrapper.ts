import { NextRequest, NextResponse } from 'next/server';
import { verifyIdToken } from './authUtils';

export type AuthenticatedRequest = NextRequest & {
  user?: any;
};

export function withAuth(handler: (req: AuthenticatedRequest) => Promise<NextResponse>) {
  return async (req: NextRequest) => {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.split('Bearer ')[1];
    const decodedToken = await verifyIdToken(token);

    if (!decodedToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const authReq = req as AuthenticatedRequest;
    authReq.user = decodedToken;

    return handler(authReq);
  };
}
