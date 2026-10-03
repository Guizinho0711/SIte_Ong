(() => {
  const c = window.ROSA_CONFIG || {};
  const ok = c.url && c.key && !c.url.startsWith('COLE') && window.supabase;
  window.rosaDB = ok ? window.supabase.createClient(c.url, c.key) : null;
  window.esc = s => String(s ?? '').replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));
})();
