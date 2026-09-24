import { NextResponse, type NextRequest } from 'next/server';

import { API_URL } from '@/lib/api';
import { accessToken } from '@/lib/session';

/**
 * The browser's way to upload, without ever holding a token.
 *
 * The session lives in an httpOnly cookie precisely so no script on the page
 * can read it — which means the browser cannot put it on a request to the API
 * itself. So the file comes here, this handler reads the cookie on the server,
 * and streams the body on to the API's `/media` route with the token attached.
 * The bytes are piped through, never buffered: a 50 MB video does not sit in
 * this process's memory on its way past.
 */
export async function POST(request: NextRequest): Promise<Response> {
  const token = await accessToken();
  if (token === null) {
    return NextResponse.json({ error: { code: 'signedOut' } }, { status: 401 });
  }

  const purpose = request.nextUrl.searchParams.get('purpose') ?? '';
  const length = request.headers.get('content-length');

  const upstream = await fetch(`${API_URL}/media?purpose=${encodeURIComponent(purpose)}`, {
    method: 'POST',
    headers: {
      authorization: `Bearer ${token}`,
      'content-type': request.headers.get('content-type') ?? 'application/octet-stream',
      // Passed on so the API can refuse an oversized file before reading it.
      ...(length === null ? {} : { 'content-length': length }),
    },
    body: request.body,
    // Required by Node's fetch to stream a request body rather than buffer it.
    duplex: 'half',
  } as RequestInit & { duplex: 'half' });

  return new Response(upstream.body, {
    status: upstream.status,
    headers: { 'content-type': upstream.headers.get('content-type') ?? 'application/json' },
  });
}
