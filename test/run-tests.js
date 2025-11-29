diff --git a/test/run-tests.js b/test/run-tests.js
new file mode 100644
index 0000000000000000000000000000000000000000..4afa6fcc1ab4720aeb677e48d4d66533cb16e7ab
--- /dev/null
+++ b/test/run-tests.js
@@ -0,0 +1,24 @@
+const parserTests = require('./parser.test');
+const apiTests = require('./api.test');
+
+async function run() {
+  const tests = { ...parserTests, ...apiTests };
+  let passed = 0;
+  let failed = 0;
+  for (const [name, fn] of Object.entries(tests)) {
+    try {
+      await fn();
+      console.log(`PASS ${name}`);
+      passed += 1;
+    } catch (err) {
+      console.error(`FAIL ${name}:`, err.message);
+      failed += 1;
+    }
+  }
+  if (failed > 0) {
+    process.exitCode = 1;
+  }
+  console.log(`\nSummary: ${passed} passed, ${failed} failed`);
+}
+
+run();
