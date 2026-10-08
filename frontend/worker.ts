// Cloudflare Worker entrypoint with custom asset routing and SPA fallback
// Guarantees /assets/* missing files return 404 and are NEVER rewritten to index.html

interface Env {
  ASSETS: Fetcher;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    // 1. Static Assets under /assets/
    // Must return the asset or 404. NEVER rewrite to index.html!
    if (url.pathname.startsWith('/assets/')) {
      const assetResponse = await env.ASSETS.fetch(request);
      if (assetResponse.status !== 404) {
        const headers = new Headers(assetResponse.headers);
        headers.set('Cache-Control', 'public, max-age=31536000, immutable');
        return new Response(assetResponse.body, {
          status: assetResponse.status,
          statusText: assetResponse.statusText,
          headers,
        });
      }
      // Missing JS/CSS/image asset returns 404 text/plain, preventing ES module syntax errors
      return new Response('Asset not found', {
        status: 404,
        headers: {
          'Content-Type': 'text/plain; charset=utf-8',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
        },
      });
    }

    // 2. Direct static files (favicon.svg, robots.txt, etc.)
    const directResponse = await env.ASSETS.fetch(request);
    if (directResponse.status !== 404) {
      if (url.pathname === '/' || url.pathname === '/index.html') {
        const headers = new Headers(directResponse.headers);
        headers.set('Cache-Control', 'no-cache, no-store, must-revalidate');
        return new Response(directResponse.body, {
          status: directResponse.status,
          statusText: directResponse.statusText,
          headers,
        });
      }
      return directResponse;
    }

    // 3. SPA Fallback: for client-side routing (e.g. /notifications, /messages, /explore)
    // Rewriting to index.html with strict revalidation headers
    const indexRequest = new Request(new URL('/index.html', request.url), request);
    const indexResponse = await env.ASSETS.fetch(indexRequest);
    const headers = new Headers(indexResponse.headers);
    headers.set('Cache-Control', 'no-cache, no-store, must-revalidate');
    headers.set('Content-Type', 'text/html; charset=utf-8');

    return new Response(indexResponse.body, {
      status: 200,
      headers,
    });
  },
};
