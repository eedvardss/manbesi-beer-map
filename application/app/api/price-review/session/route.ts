// Shared-password sessions have been retired. Never accept legacy review cookies.
export async function POST() {
  return Response.json(
    { error: 'Pieslēdzies ar Clerk kontu un divfaktoru autentifikāciju.' },
    { status: 410, headers: { 'Cache-Control': 'no-store' } },
  );
}
