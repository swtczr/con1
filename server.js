diff --git a/server.js b/server.js
new file mode 100644
index 0000000000000000000000000000000000000000..12ffaf4305f2f3007a74324742c52c9b96965697
--- /dev/null
+++ b/server.js
@@ -0,0 +1,7 @@
+const { createServer } = require('./src/app');
+
+const port = process.env.PORT || 3000;
+const server = createServer();
+server.listen(port, () => {
+  console.log(`Server running on http://localhost:${port}`);
+});
