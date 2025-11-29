diff --git a/test/parser.test.js b/test/parser.test.js
new file mode 100644
index 0000000000000000000000000000000000000000..88da008b3302c367c53a941142455dbfe2e94d2c
--- /dev/null
+++ b/test/parser.test.js
@@ -0,0 +1,25 @@
+const assert = require('assert');
+const { extractImageUrls, normalizeGoogleLink, sanitizeHtml } = require('../src/utils/parser');
+
+function testExtractsFromMarkdown() {
+  const content = 'Here is an image ![alt](https://example.com/img.png) and another ![g](https://drive.google.com/file/d/abc123/view)';
+  const urls = extractImageUrls(content);
+  assert(urls.includes('https://example.com/img.png'));
+  assert(urls.includes('https://drive.google.com/uc?export=view&id=abc123'));
+}
+
+function testExtractsFromHtml() {
+  const content = '<div><img src="https://docs.google.com/document/d/xyz789/view" /></div>';
+  const urls = extractImageUrls(content);
+  assert.deepStrictEqual(urls, ['https://docs.google.com/document/d/xyz789/export?format=pdf']);
+}
+
+function testSanitizes() {
+  const dirty = '<div onclick="alert(1)"><script>alert(2)</script><iframe src="//evil"></iframe>ok</div>';
+  const clean = sanitizeHtml(dirty);
+  assert(!clean.includes('script'));
+  assert(!clean.includes('onclick'));
+  assert(!clean.includes('iframe'));
+}
+
+module.exports = { testExtractsFromMarkdown, testExtractsFromHtml, testSanitizes };
