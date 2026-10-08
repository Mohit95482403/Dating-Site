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

    // 3. For root path '/' or '/index.html'
    if (url.pathname === '/' || url.pathname === '/index.html') {
      const rootRequest = new Request(new URL('/', request.url), request);
      const rootResponse = await env.ASSETS.fetch(rootRequest);
      const headers = new Headers(rootResponse.headers);
      headers.set('Cache-Control', 'no-cache, no-store, must-revalidate');
      headers.set('Content-Type', 'text/html; charset=utf-8');
      headers.delete('Location');
      return new Response(rootResponse.body, {
        status: 200,
        statusText: 'OK',
        headers,
      });
    }

    // 4. Try direct static asset fetch (e.g. static files without extension in public folder if any)
    const directResponse = await env.ASSETS.fetch(request);
    if (directResponse.status >= 200 && directResponse.status < 300) {
      return directResponse;
    }

    // 5. SPA Fallback: client-side routing (e.g. /notifications, /messages, /explore, /dashboard)
    // Always fetch '/' from env.ASSETS to get the real index.html document (never '/index.html' which redirects with empty body)
    const spaRequest = new Request(new URL('/', request.url), request);
    const spaResponse = await env.ASSETS.fetch(spaRequest);
    const headers = new Headers(spaResponse.headers);
    headers.set('Cache-Control', 'no-cache, no-store, must-revalidate');
    headers.set('Content-Type', 'text/html; charset=utf-8');
    headers.delete('Location');

    return new Response(spaResponse.body, {
      status: 200,
      statusText: 'OK',
      headers,
    });
  },
};
