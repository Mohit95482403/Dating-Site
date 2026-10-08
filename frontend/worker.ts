// Cloudflare Worker entrypoint with custom asset routing and SPA fallback
// Guarantees static assets and API requests return 404 and are NEVER rewritten to index.html

interface Env {
  ASSETS: Fetcher;
}

const STATIC_EXT_REGEX = /\.(js|css|png|jpg|jpeg|svg|webp|gif|woff|woff2|ttf|eot|ico|json|map|wasm|mp3|mp4|webm)$/i;

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    // 1. Protect API / Socket.IO routes: never rewrite to index.html
    if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/socket.io/')) {
      return new Response(
        JSON.stringify({ error: 'API endpoints are hosted on backend server' }),
        {
          status: 404,
          headers: {
            'Content-Type': 'application/json; charset=utf-8',
            'Cache-Control': 'no-cache, no-store, must-revalidate',
          },
        }
      );
    }

    // 2. Static Assets under /assets/ or any path with a static file extension
    // Must return the asset if present, or 404 if missing. NEVER rewrite to index.html!
    const isAssetPath = url.pathname.startsWith('/assets/');
    const hasStaticExtension = STATIC_EXT_REGEX.test(url.pathname);

    if (isAssetPath || hasStaticExtension) {
      const assetResponse = await env.ASSETS.fetch(request);
      if (assetResponse.status !== 404) {
        // Cache immutable hashed assets under /assets/ for 1 year
        if (isAssetPath) {
          const headers = new Headers(assetResponse.headers);
          headers.set('Cache-Control', 'public, max-age=31536000, immutable');
          return new Response(assetResponse.body, {
            status: assetResponse.status,
            statusText: assetResponse.statusText,
            headers,
          });
        }
        return assetResponse;
      }

      // Missing asset returns 404 text/plain, preventing ES module syntax errors & broken HTML fallback
      return new Response('Asset not found', {
        status: 404,
        headers: {
          'Content-Type': 'text/plain; charset=utf-8',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
        },
      });
    }

    // 3. Direct root static files without extensions or root index
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

    // 4. SPA Fallback: client-side routing (e.g. /notifications, /messages, /explore, /dashboard)
    // Rewriting cleanly to index.html with strict revalidation headers
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
