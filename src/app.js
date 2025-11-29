diff --git a/src/app.js b/src/app.js
new file mode 100644
index 0000000000000000000000000000000000000000..26498030220aad0a8b9e963ea260450cfc49eb0b
--- /dev/null
+++ b/src/app.js
@@ -0,0 +1,141 @@
+const http = require('http');
+const { URL } = require('url');
+const fs = require('fs');
+const path = require('path');
+const { extractImageUrls, sanitizeHtml, escapeHtml, stripDangerousMarkup } = require('./utils/parser');
+
+const CLIENT_DIR = path.join(__dirname, '..', 'client');
+const headerCache = new Map();
+const DEFAULT_WEBHOOK_URL = process.env.MAKE_WEBHOOK_URL || 'https://hook.us1.make.com/1452215';
+
+function readBody(req) {
+  return new Promise((resolve, reject) => {
+    let data = '';
+    req.on('data', (chunk) => {
+      data += chunk;
+      if (data.length > 1e6) {
+        req.destroy();
+        reject(new Error('Payload too large'));
+      }
+    });
+    req.on('end', () => resolve(data));
+    req.on('error', reject);
+  });
+}
+
+async function callWebhook(body, fetchImpl, timeoutMs = 8000) {
+  const controller = new AbortController();
+  const timer = setTimeout(() => controller.abort(), timeoutMs);
+  try {
+    const res = await fetchImpl(DEFAULT_WEBHOOK_URL, {
+      method: 'POST',
+      headers: { 'Content-Type': 'application/json' },
+      body: JSON.stringify(body),
+      signal: controller.signal,
+    });
+    const data = await res.json().catch(() => ({}));
+    return { status: res.status, data };
+  } finally {
+    clearTimeout(timer);
+  }
+}
+
+function serveStatic(req, res) {
+  const requestPath = req.url === '/' ? '/index.html' : req.url;
+  const filePath = path.join(CLIENT_DIR, requestPath.split('?')[0]);
+  if (!filePath.startsWith(CLIENT_DIR)) {
+    res.statusCode = 403;
+    res.end('Forbidden');
+    return true;
+  }
+  if (fs.existsSync(filePath)) {
+    const ext = path.extname(filePath);
+    const type = {
+      '.html': 'text/html',
+      '.js': 'text/javascript',
+      '.css': 'text/css',
+      '.json': 'application/json',
+      '.svg': 'image/svg+xml',
+      '.png': 'image/png',
+    }[ext] || 'text/plain';
+    res.setHeader('Content-Type', type);
+    res.end(fs.readFileSync(filePath));
+    return true;
+  }
+  return false;
+}
+
+function buildResponse(data, fallbackDocument, documentId, documentContent) {
+  const parsedContent = data.documentContent || documentContent || '';
+  const images = extractImageUrls(parsedContent);
+  const header = data.documentHeader || (documentId && headerCache.get(documentId)) || null;
+  if (documentId && data.documentHeader) {
+    headerCache.set(documentId, data.documentHeader);
+  }
+  const fallback = fallbackDocument || data.fallbackDocument || '';
+  return {
+    status: 'success',
+    reply: stripDangerousMarkup(data.reply || data.message || 'Processed'),
+    documentId: documentId || data.documentId || null,
+    documentHeader: header ? escapeHtml(header.toString()) : null,
+    fallbackDocument: fallback ? sanitizeHtml(fallback) : null,
+    images,
+  };
+}
+
+function createServer(fetchImpl = global.fetch) {
+  const server = http.createServer(async (req, res) => {
+    const url = new URL(req.url, `http://${req.headers.host}`);
+    if (req.method === 'POST' && url.pathname === '/api/chat') {
+      let payload = {};
+      try {
+        const raw = await readBody(req);
+        if (raw) {
+          try {
+            payload = JSON.parse(raw);
+          } catch (parseError) {
+            res.statusCode = 400;
+            res.end(JSON.stringify({ status: 'error', message: 'Invalid JSON payload', fallbackDocument: null }));
+            return;
+          }
+        }
+        const webhookResult = await callWebhook(payload, fetchImpl);
+        if (webhookResult.status >= 400) {
+          res.statusCode = webhookResult.status;
+          res.end(JSON.stringify({
+            status: 'error',
+            message: webhookResult.status >= 500 ? 'Upstream error' : 'Invalid request',
+            fallbackDocument: payload.fallbackDocument || null,
+          }));
+          return;
+        }
+        const responseBody = buildResponse(
+          webhookResult.data || {},
+          payload.fallbackDocument,
+          payload.documentId,
+          payload.documentContent,
+        );
+        res.setHeader('Content-Type', 'application/json');
+        res.end(JSON.stringify(responseBody));
+      } catch (error) {
+        const isAbort = error.name === 'AbortError';
+        res.statusCode = 502;
+        res.end(JSON.stringify({
+          status: 'error',
+          message: isAbort ? 'Request timed out' : 'Unable to reach chat service',
+          fallbackDocument: payload.fallbackDocument || null,
+        }));
+      }
+      return;
+    }
+
+    if (serveStatic(req, res)) {
+      return;
+    }
+    res.statusCode = 404;
+    res.end('Not Found');
+  });
+  return server;
+}
+
+module.exports = { createServer, headerCache, callWebhook, buildResponse };
