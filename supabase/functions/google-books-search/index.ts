import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const GOOGLE_BOOKS_BASE = "https://www.googleapis.com/books/v1/volumes";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Authorization, Content-Type, apikey, x-client-info",
};

Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: CORS_HEADERS });
  }

  const url = new URL(req.url);
  const q = url.searchParams.get("q") ?? "";
  const maxResults = url.searchParams.get("maxResults") ?? "10";
  const startIndex = url.searchParams.get("startIndex") ?? "0";

  if (q.trim().length < 2) {
    return new Response(
      JSON.stringify({ kind: "books#volumes", totalItems: 0, items: [] }),
      {
        headers: { "Content-Type": "application/json", ...CORS_HEADERS },
      }
    );
  }

  try {
    const apiUrl = `${GOOGLE_BOOKS_BASE}?q=${encodeURIComponent(q)}&maxResults=${maxResults}&startIndex=${startIndex}&projection=lite`;
    const response = await fetch(apiUrl);
    if (!response.ok) {
      return new Response(
        JSON.stringify({ error: `Google Books API error: ${response.status}` }),
        { status: 502, headers: { "Content-Type": "application/json", ...CORS_HEADERS } }
      );
    }
    const data = await response.json();
    return new Response(JSON.stringify(data), {
      headers: { "Content-Type": "application/json", ...CORS_HEADERS },
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ error: "Internal proxy error" }),
      { status: 500, headers: { "Content-Type": "application/json", ...CORS_HEADERS } }
    );
  }
});
