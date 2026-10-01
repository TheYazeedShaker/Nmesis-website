(() => {
  const key = 'allow-testimonials';
  const sections = [...document.querySelectorAll(`[data-feature-flag="${key}"]`)];
  if (!sections.length) return;

  // The initial HTML is hidden too, including when JavaScript is blocked.
  const apply = (enabled, state) => {
    for (const section of sections) section.hidden = !enabled;
    document.documentElement.dataset.testimonialsState = state;
  };
  apply(false, 'loading');

  const token = document.querySelector('meta[name="posthog-project-token"]')?.content;
  const host = document.querySelector('meta[name="posthog-api-host"]')?.content;
  if (!token?.startsWith('phc_') || !host) {
    apply(false, 'unavailable');
    return;
  }
  let endpoint;
  try {
    endpoint = new URL('/flags?v=2', host);
    if (endpoint.protocol !== 'https:') throw new Error('HTTPS required');
  } catch {
    apply(false, 'unavailable');
    return;
  }

  // Persist only an anonymous rollout identity, never a cached enabled value.
  const storageKey = 'nmesis:posthog:distinct-id';
  let distinctId = crypto.randomUUID();
  try {
    distinctId = localStorage.getItem(storageKey) || distinctId;
    localStorage.setItem(storageKey, distinctId);
  } catch { /* Blocked storage still permits flag evaluation for this page. */ }

  let pending = false;
  let lastRequest = -Infinity;
  async function refresh() {
    if (pending || document.hidden || Date.now() - lastRequest < 5000) return;
    pending = true;
    lastRequest = Date.now();
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    try {
      // Use PostHog's public, flags-only API; do not enable analytics or replay.
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({api_key: token, distinct_id: distinctId}),
        credentials: 'omit',
        cache: 'no-store',
        referrerPolicy: 'strict-origin-when-cross-origin',
        signal: controller.signal,
      });
      if (!response.ok) throw new Error('Flag evaluation failed');
      const result = await response.json();
      const flag = result?.flags?.[key];
      const enabled = result?.errorsWhileComputingFlags === false
        && flag?.key === key && flag.enabled === true;
      apply(enabled, enabled ? 'enabled' : 'disabled');
    } catch {
      apply(false, 'unavailable');
    } finally {
      clearTimeout(timeout);
      pending = false;
    }
  }

  refresh();
  // Changes in PostHog reach an open page without another site deployment.
  setInterval(refresh, 60000);
  addEventListener('focus', refresh);
  document.addEventListener('visibilitychange', refresh);
  addEventListener('pageshow', event => {
    if (event.persisted) {
      apply(false, 'loading');
      lastRequest = -Infinity;
      refresh();
    }
  });
})();
