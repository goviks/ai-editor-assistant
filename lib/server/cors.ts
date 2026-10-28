const PAGES_ORIGIN = process.env.PAGES_ORIGIN ?? "https://goviks.github.io";

export function withPagesCors(request: Request, response: Response): Response {
  const headers = new Headers(response.headers);
  const origin = request.headers.get("origin");

  if (origin === PAGES_ORIGIN) {
    headers.set("Access-Control-Allow-Origin", PAGES_ORIGIN);
    headers.set("Access-Control-Allow-Methods", "POST, OPTIONS");
    headers.set("Access-Control-Allow-Headers", "Content-Type, Accept");
    headers.set("Access-Control-Max-Age", "86400");
    headers.append("Vary", "Origin");
  }

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

export function optionsResponse(request: Request): Response {
  return withPagesCors(request, new Response(null, { status: 204 }));
}
