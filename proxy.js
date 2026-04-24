#!/usr/bin/env node
/**
 * Tiny local proxy for Mattilsynet's Fiskehelseregister API.
 *
 * Why this exists: the browser won't let file:// pages call the API directly
 * (no CORS headers from Mattilsynet). This proxy solves CORS and also injects
 * the required Client-Id header so the frontend never has to know about it.
 *
 * Run:   node proxy.js            (listens on http://localhost:8787)
 *
 * Uses node:https (not global fetch) because undici's fetch has trouble
 * talking to Mattilsynet's Google-Frontend upstream on some macOS/Node
 * combinations — connections stall for 30-60s before failing.
 */

import http from "node:http";
import https from "node:https";

const API_HOST = "akvakultur-offentlig-api.fisk.mattilsynet.io";
const CLIENT_ID = process.env.CLIENT_ID || "trollefsen-fiskehelse-viewer";
const PORT = Number(process.env.PORT || 8787);
const UPSTREAM_TIMEOUT_MS = 90_000;

// Keep-alive agent so we reuse TLS connections across the paginated calls.
const agent = new https.Agent({ keepAlive: true, maxSockets: 4 });

const cache = new Map();
const CACHE_TTL_MS = 5 * 60 * 1000;

function upstreamRequest(pathWithQuery) {
  return new Promise((resolve, reject) => {
    const req = https.request(
      {
        host: API_HOST,
        path: pathWithQuery,
        method: "GET",
        agent,
        headers: {
          "Client-Id": CLIENT_ID,
          "Accept": "application/json",
          "Host": API_HOST,
        },
        timeout: UPSTREAM_TIMEOUT_MS,
      },
      (res) => {
        const chunks = [];
        res.on("data", (c) => chunks.push(c));
        res.on("end", () => {
          resolve({
            status: res.statusCode || 502,
            body: Buffer.concat(chunks),
            contentType: res.headers["content-type"] || "application/json",
            xCount: res.headers["x-count"] || null,
          });
        });
        res.on("error", reject);
      },
    );
    req.on("timeout", () => req.destroy(new Error("upstream timeout")));
    req.on("error", reject);
    req.end();
  });
}

const server = http.createServer(async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") { res.writeHead(204); return res.end(); }
  if (req.method !== "GET")     { res.writeHead(405); return res.end("Method not allowed"); }

  const url = new URL(req.url, `http://localhost:${PORT}`);
  const allowed =
       url.pathname === "/api/fiskehelseregisteret/v1/anlegg"
    || url.pathname.startsWith("/api/fiskehelseregisteret/v1/anlegg/")
    || url.pathname === "/api/sykdomstilfeller/v1/rapporteringer"
    || url.pathname.startsWith("/api/sykdomstilfeller/v1/rapporteringer/");

  if (!allowed) {
    res.writeHead(404, { "Content-Type": "text/plain" });
    return res.end("Not an allowed endpoint");
  }

  const pathWithQuery = url.pathname + url.search;
  const cacheKey = pathWithQuery;
  const now = Date.now();

  const cached = cache.get(cacheKey);
  if (cached && now - cached.ts < CACHE_TTL_MS) {
    const hdrs = {
      "Content-Type": cached.contentType,
      "X-Cache": "HIT",
      "Access-Control-Expose-Headers": "X-Count",
    };
    if (cached.xCount) hdrs["X-Count"] = cached.xCount;
    res.writeHead(cached.status, hdrs);
    return res.end(cached.body);
  }

  // Retry on transient upstream failures (network errors or 5xx). Mattilsynet's
  // API is fronted by Google Frontend and returns occasional 500s under load.
  const MAX_ATTEMPTS = 4;
  let upstream;
  let lastErr;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      upstream = await upstreamRequest(pathWithQuery);
      if (upstream.status < 500) break;
      lastErr = new Error(`upstream ${upstream.status}`);
    } catch (err) {
      lastErr = err;
    }
    if (attempt < MAX_ATTEMPTS) {
      const backoff = 500 * 2 ** (attempt - 1);
      console.warn(`[retry ${attempt}/${MAX_ATTEMPTS}] ${pathWithQuery} — ${lastErr.message}`);
      await new Promise((r) => setTimeout(r, backoff));
    }
  }

  if (!upstream || upstream.status >= 500) {
    res.writeHead(502, { "Content-Type": "application/json" });
    return res.end(JSON.stringify({ error: "Upstream failed after retries", detail: String(lastErr) }));
  }

  if (upstream.status >= 200 && upstream.status < 300) {
    cache.set(cacheKey, {
      ts: now,
      status: upstream.status,
      body: upstream.body,
      contentType: upstream.contentType,
      xCount: upstream.xCount,
    });
  }
  const outHeaders = { "Content-Type": upstream.contentType, "X-Cache": "MISS" };
  if (upstream.xCount) outHeaders["X-Count"] = upstream.xCount;
  // Expose X-Count to browser JS (it's a non-standard header)
  outHeaders["Access-Control-Expose-Headers"] = "X-Count";
  res.writeHead(upstream.status, outHeaders);
  res.end(upstream.body);
});

server.listen(PORT, () => {
  console.log(`Fiskehelse proxy → https://${API_HOST}`);
  console.log(`Listening on   http://localhost:${PORT}`);
  console.log(`Client-Id      ${CLIENT_ID}`);
});
