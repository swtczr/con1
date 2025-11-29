diff --git a/client/app.js b/client/app.js
new file mode 100644
index 0000000000000000000000000000000000000000..668ca16eaa8a23494180e5419598ea03c3fcca9c
--- /dev/null
+++ b/client/app.js
@@ -0,0 +1,187 @@
+const messagesEl = document.getElementById('messages');
+const form = document.getElementById('chat-form');
+const input = document.getElementById('chat-input');
+const typingEl = document.getElementById('typing');
+const statusEl = document.getElementById('status');
+const errorEl = document.getElementById('error');
+const fallbackEl = document.getElementById('fallback');
+const docHeaderEl = document.getElementById('doc-header');
+const retryBtn = document.getElementById('retry');
+const refreshBtn = document.getElementById('refresh');
+
+let messages = [];
+let lastPayload = null;
+let isProcessing = false;
+
+const ALLOWED_PROTOCOLS = ['http:', 'https:', 'mailto:'];
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
+function safeUrl(url) {
+  try {
+    const parsed = new URL(url, window.location.origin);
+    if (!ALLOWED_PROTOCOLS.includes(parsed.protocol)) return '#';
+    return parsed.href;
+  } catch (err) {
+    return '#';
+  }
+}
+
+function markdownToHtml(text) {
+  const escaped = escapeHtml(text || '');
+  return escaped
+    .replace(/```([\s\S]*?)```/g, '<pre><code>$1</code></pre>')
+    .replace(/`([^`]+)`/g, '<code>$1</code>')
+    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
+    .replace(/\*([^*]+)\*/g, '<em>$1</em>')
+    .replace(/\[(.*?)\]\((.*?)\)/g, (_, label, url) => `<a href="${safeUrl(url)}" target="_blank" rel="noopener">${label}</a>`)
+    .replace(/\n/g, '<br/>');
+}
+
+function renderMessages() {
+  messagesEl.innerHTML = '';
+  messages.forEach((msg) => {
+    const wrapper = document.createElement('article');
+    wrapper.className = `message ${msg.role}`;
+    const meta = document.createElement('div');
+    meta.className = 'meta';
+    meta.textContent = `${msg.role === 'user' ? 'You' : 'Assistant'} • ${msg.timestamp}`;
+    const body = document.createElement('div');
+    body.className = 'body';
+    body.innerHTML = markdownToHtml(msg.text || '');
+    wrapper.appendChild(meta);
+    wrapper.appendChild(body);
+    if (msg.images && msg.images.length) {
+      const gallery = document.createElement('div');
+      gallery.className = 'gallery';
+      msg.images.forEach((url) => {
+        const img = document.createElement('img');
+        img.loading = 'lazy';
+        img.src = url;
+        img.alt = 'Document image';
+        gallery.appendChild(img);
+      });
+      wrapper.appendChild(gallery);
+    }
+    messagesEl.appendChild(wrapper);
+  });
+  messagesEl.scrollTop = messagesEl.scrollHeight;
+}
+
+function setStatus(text) {
+  statusEl.textContent = text;
+}
+
+function showError(message) {
+  if (!message) {
+    errorEl.classList.add('hidden');
+    errorEl.textContent = '';
+    return;
+  }
+  errorEl.textContent = message;
+  errorEl.classList.remove('hidden');
+}
+
+function showFallback(content) {
+  if (!content) {
+    fallbackEl.classList.add('hidden');
+    fallbackEl.textContent = '';
+    return;
+  }
+  fallbackEl.innerHTML = markdownToHtml(content);
+  fallbackEl.classList.remove('hidden');
+}
+
+function showDocumentHeader(header) {
+  if (!header) {
+    docHeaderEl.textContent = '';
+    docHeaderEl.classList.add('muted');
+    return;
+  }
+  docHeaderEl.textContent = header;
+  docHeaderEl.classList.remove('muted');
+}
+
+async function sendMessage(payload) {
+  lastPayload = payload;
+  isProcessing = true;
+  typingEl.classList.remove('hidden');
+  setStatus('Sending…');
+  showError(null);
+  showFallback(null);
+  const timestamp = new Date().toLocaleTimeString();
+  messages.push({ role: 'user', text: payload.message, timestamp });
+  renderMessages();
+  try {
+    const res = await fetch('/api/chat', {
+      method: 'POST',
+      headers: { 'Content-Type': 'application/json' },
+      body: JSON.stringify(payload),
+    });
+    let data = null;
+    try {
+      data = await res.json();
+    } catch (parseErr) {
+      throw new Error('Invalid server response');
+    }
+    if (!res.ok || data.status === 'error') {
+      showFallback(data && data.fallbackDocument);
+      const errMsg = (data && data.message) || 'Server error';
+      const errorWithData = new Error(errMsg);
+      errorWithData.data = data;
+      throw errorWithData;
+    }
+    messages.push({ role: 'assistant', text: data.reply, timestamp: new Date().toLocaleTimeString(), images: data.images || [] });
+    showFallback(data.fallbackDocument);
+    showDocumentHeader(data.documentHeader);
+    setStatus('Delivered');
+  } catch (err) {
+    if (err.data && err.data.fallbackDocument) {
+      showFallback(err.data.fallbackDocument);
+    }
+    showError(err.message);
+    setStatus('Error');
+  } finally {
+    isProcessing = false;
+    typingEl.classList.add('hidden');
+    renderMessages();
+  }
+}
+
+form.addEventListener('submit', (e) => {
+  e.preventDefault();
+  if (isProcessing) return;
+  const value = input.value.trim();
+  if (!value) return;
+  const payload = { message: value, documentContent: '', documentId: 'draft-doc' };
+  input.value = '';
+  sendMessage(payload);
+});
+
+retryBtn.addEventListener('click', () => {
+  if (lastPayload && !isProcessing) {
+    sendMessage(lastPayload);
+  }
+});
+
+refreshBtn.addEventListener('click', () => {
+  messages = [];
+  lastPayload = null;
+  renderMessages();
+  setStatus('Idle');
+  showError(null);
+  showFallback(null);
+  showDocumentHeader('');
+});
+
+window.addEventListener('focus', () => input.focus());
+messagesEl.addEventListener('touchstart', () => messagesEl.style.scrollBehavior = 'smooth');
+input.focus();
+showDocumentHeader('');
