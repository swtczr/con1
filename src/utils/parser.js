diff --git a/src/utils/parser.js b/src/utils/parser.js
new file mode 100644
index 0000000000000000000000000000000000000000..37ed37ad38f14ab2d5ac7a01d9ebe535ac721dfa
--- /dev/null
+++ b/src/utils/parser.js
@@ -0,0 +1,60 @@
+const GOOGLE_DRIVE_REGEX = /https?:\/\/drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/i;
+const GOOGLE_DOC_REGEX = /https?:\/\/docs\.google\.com\/document\/d\/([a-zA-Z0-9_-]+)/i;
+
+function escapeHtml(text = '') {
+  return text
+    .replace(/&/g, '&amp;')
+    .replace(/</g, '&lt;')
+    .replace(/>/g, '&gt;')
+    .replace(/"/g, '&quot;')
+    .replace(/'/g, '&#39;');
+}
+
+function stripDangerousMarkup(html = '') {
+  return html
+    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
+    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
+    .replace(/on[a-z]+\s*=\s*"[^"]*"/gi, '')
+    .replace(/on[a-z]+\s*=\s*'[^']*'/gi, '')
+    .replace(/\b(href|src)\s*=\s*(["'])\s*javascript:[^"']*\2/gi, '$1="#"')
+    .replace(/<\/?(iframe|object|embed|link|meta)[^>]*>/gi, '');
+}
+
+function normalizeGoogleLink(url) {
+  const driveMatch = url.match(GOOGLE_DRIVE_REGEX);
+  if (driveMatch) {
+    return `https://drive.google.com/uc?export=view&id=${driveMatch[1]}`;
+  }
+  const docMatch = url.match(GOOGLE_DOC_REGEX);
+  if (docMatch) {
+    return `https://docs.google.com/document/d/${docMatch[1]}/export?format=pdf`;
+  }
+  return url;
+}
+
+function extractImageUrls(content = '') {
+  const urls = new Set();
+  const markdownImage = /!\[[^\]]*\]\(([^)]+)\)/g;
+  let match;
+  while ((match = markdownImage.exec(content)) !== null) {
+    urls.add(normalizeGoogleLink(match[1].trim()));
+  }
+
+  const htmlImage = /<img [^>]*src=["']([^"'>]+)["'][^>]*>/gi;
+  while ((match = htmlImage.exec(content)) !== null) {
+    urls.add(normalizeGoogleLink(match[1].trim()));
+  }
+  return Array.from(urls);
+}
+
+function sanitizeHtml(html = '') {
+  return stripDangerousMarkup(html);
+}
+
+module.exports = {
+  escapeHtml,
+  extractImageUrls,
+  normalizeGoogleLink,
+  stripDangerousMarkup,
+  sanitizeHtml,
+};
