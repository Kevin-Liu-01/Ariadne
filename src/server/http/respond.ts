/** Small JSON response helpers shared by route handlers. */

export function json(data: unknown, status = 200): Response {
  return Response.json(data as object, { status });
}

export function problem(status: number, message: string): Response {
  return Response.json({ error: message }, { status });
}

export function ok(message = "ok"): Response {
  return new Response(message, { status: 200 });
}
