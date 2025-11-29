diff --git a/test/api.test.js b/test/api.test.js
new file mode 100644
index 0000000000000000000000000000000000000000..5438ed7ad08c983bb5f0e3d4faedb2c43e4ede16
--- /dev/null
+++ b/test/api.test.js
@@ -0,0 +1,75 @@
+const assert = require('assert');
+const { createServer } = require('../src/app');
+
+function createMockFetch() {
+  return async (_url, _options) => {
+    return {
+      status: 200,
+      async json() {
+        return {
+          reply: 'Echoed',
+          documentId: 'doc-1',
+          documentHeader: 'Doc Header',
+          documentContent: '<img src="https://example.com/a.png"/>',
+          fallbackDocument: 'Fallback body',
+        };
+      },
+    };
+  };
+}
+
+async function testChatEndpoint() {
+  const server = createServer(createMockFetch());
+  await new Promise((resolve) => server.listen(0, resolve));
+  const { port } = server.address();
+  const res = await fetch(`http://localhost:${port}/api/chat`, {
+    method: 'POST',
+    headers: { 'Content-Type': 'application/json' },
+    body: JSON.stringify({ message: 'Hello', documentId: 'doc-1' }),
+  });
+  const data = await res.json();
+  server.close();
+  assert.strictEqual(res.status, 200);
+  assert.strictEqual(data.status, 'success');
+  assert.strictEqual(data.documentHeader, 'Doc Header');
+  assert(Array.isArray(data.images));
+  assert(data.images.includes('https://example.com/a.png'));
+}
+
+async function testRejectsInvalidJson() {
+  const server = createServer(createMockFetch());
+  await new Promise((resolve) => server.listen(0, resolve));
+  const { port } = server.address();
+  const res = await fetch(`http://localhost:${port}/api/chat`, {
+    method: 'POST',
+    headers: { 'Content-Type': 'application/json' },
+    body: '{invalid',
+  });
+  const data = await res.json();
+  server.close();
+  assert.strictEqual(res.status, 400);
+  assert.strictEqual(data.status, 'error');
+}
+
+async function testReturnsFallbackOnAbort() {
+  const abortingFetch = async () => {
+    const err = new Error('aborted');
+    err.name = 'AbortError';
+    throw err;
+  };
+  const server = createServer(abortingFetch);
+  await new Promise((resolve) => server.listen(0, resolve));
+  const { port } = server.address();
+  const res = await fetch(`http://localhost:${port}/api/chat`, {
+    method: 'POST',
+    headers: { 'Content-Type': 'application/json' },
+    body: JSON.stringify({ message: 'Hi', fallbackDocument: 'Offline copy' }),
+  });
+  const data = await res.json();
+  server.close();
+  assert.strictEqual(res.status, 502);
+  assert.strictEqual(data.status, 'error');
+  assert.strictEqual(data.fallbackDocument, 'Offline copy');
+}
+
+module.exports = { testChatEndpoint, testRejectsInvalidJson, testReturnsFallbackOnAbort };
