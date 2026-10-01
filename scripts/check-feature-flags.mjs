import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import vm from 'node:vm';

const source = await fs.readFile(new URL('../src/scripts/feature-flags.js', import.meta.url), 'utf8');
const home = await fs.readFile(new URL('../src/templates/pages/home.html', import.meta.url), 'utf8');
const layout = await fs.readFile(new URL('../src/templates/layout.html', import.meta.url), 'utf8');
const flagKey = 'allow-testimonials';

// Inspect actual template ancestry: hiding quote text alone would leave portraits,
// attribution and empty cards behind. Preserve the adjoining SOUEAST scope card.
const nodes = [], stack = [];
for (const match of home.matchAll(/<\/?([a-z][\w:-]*)\b(?:[^>"']|"[^"]*"|'[^']*')*>/gi)) {
  const [tag, name] = match;
  if (tag.startsWith('</')) {
    const index = stack.findLastIndex(node => node.tag === name);
    if (index >= 0) { stack[index].end = match.index; stack.length = index; }
    continue;
  }
  const attributes = new Map([...tag.matchAll(/\s([\w:-]+)(?:\s*=\s*"([^"]*)")?/g)].map(([, key, value]) => [key, value ?? '']));
  const node = {tag: name, attributes, parent: stack.at(-1), start: match.index, end: match.index + tag.length};
  node.classes = (attributes.get('class') || '').split(/\s+/);
  nodes.push(node);
  if (!/^(?:area|base|br|col|embed|hr|img|input|link|meta|param|source|track|wbr)$/.test(name) && !tag.endsWith('/>')) stack.push(node);
}
const gateFor = node => {
  for (let current = node; current; current = current.parent) if (current.attributes.get('data-feature-flag') === flagKey) return current;
};
const gates = nodes.filter(node => node.attributes.get('data-feature-flag') === flagKey);
assert.equal(gates.length, 3, 'Gate the complete section and both responsive featured-project cards.');
assert.ok(gates.every(node => node.attributes.has('hidden')), 'Testimonials must be hidden in HTML before JavaScript or an API response.');
assert.equal(gates.filter(node => node.attributes.get('id') === 'testimonials').length, 1);
assert.equal(gates.filter(node => node.classes.includes('design-zjcl3k-container')).length, 2);
const quotes = nodes.filter(node => node.classes.includes('design-9425ek') || node.classes.includes('testimonial-photo-quote'));
assert.equal(quotes.length, 14, 'Cover all four testimonials and the collaboration card, including responsive copies.');
assert.ok(quotes.every(node => gateFor(node)), 'A testimonial or featured customer card escapes its flag wrapper.');
const quoteFields = new Set(quotes.flatMap(node => [...home.slice(node.start, node.end).matchAll(/\{\{page\.([^}]+)\}\}/g)].map(match => match[1])));
assert.equal(quoteFields.size, 5, 'All five distinct customer-card messages must be controlled by the same flag.');
const scope = nodes.find(node => node.classes.includes('design-bid5wa'));
assert.ok(scope && !gateFor(scope), 'The SOUEAST scope card must remain visible when testimonials are hidden.');
assert.ok(nodes.filter(node => node.tag === 'blockquote').every(node => !gateFor(node)), 'Project headlines are not testimonials.');
assert.match(layout, /<style>\s*\[data-feature-flag\]\[hidden\]\s*\{\s*display\s*:\s*none\s*!important\s*\}\s*<\/style>/, 'Author CSS must not override the initial hidden state.');
assert.ok(layout.indexOf('[data-feature-flag][hidden]') < layout.indexOf('rel="stylesheet"'), 'The hidden rule must precede page styles.');
assert.match(layout, /<script src="\/scripts\/feature-flags\.js" defer><\/script>/);

// Deterministic fetch/timers exercise the production controller without a network,
// real PostHog credentials, browser dependencies or production-only test hooks.
function fixture({empty = false, blockedStorage = false, token = 'phc_public_fixture', host = 'https://eu.i.posthog.com', hidden = false} = {}) {
  let now = 0, nextTimer = 0;
  const timers = new Map(), calls = [], windowEvents = new Map(), documentEvents = new Map();
  const storage = new Map([['nmesis:posthog:distinct-id', 'saved-anonymous-id'], ['allow-testimonials', 'true']]);
  const sections = empty ? [] : gates.map(node => ({
    hidden: true,
    className: node.attributes.get('class'),
    parentElement: Object.freeze({className: node.parent.attributes.get('class')}),
  }));
  const originalClasses = sections.map(section => [section.className, section.parentElement.className]);
  const listen = events => (type, callback) => events.set(type, [...(events.get(type) || []), callback]);
  const document = {
    hidden, documentElement: {dataset: {}},
    querySelectorAll: selector => selector === `[data-feature-flag="${flagKey}"]` ? sections : [],
    querySelector: selector => selector === 'meta[name="posthog-project-token"]' ? {content: token} : selector === 'meta[name="posthog-api-host"]' ? {content: host} : null,
    addEventListener: listen(documentEvents),
  };
  const timer = (callback, delay, repeat = false) => {
    const id = ++nextTimer; timers.set(id, {callback, at: now + delay, delay, repeat}); return id;
  };
  const context = vm.createContext({
    document, URL, AbortController,
    Date: class extends Date { static now() { return now; } },
    crypto: {randomUUID: () => 'new-anonymous-id'},
    localStorage: {
      getItem(key) { if (blockedStorage) throw new Error('Storage blocked'); return storage.get(key) ?? null; },
      setItem(key, value) { if (blockedStorage) throw new Error('Storage blocked'); storage.set(key, value); },
    },
    addEventListener: listen(windowEvents),
    setTimeout: (callback, delay) => timer(callback, delay),
    clearTimeout: id => timers.delete(id),
    setInterval: (callback, delay) => timer(callback, delay, true),
    clearInterval: id => timers.delete(id),
    fetch: (url, options) => new Promise((resolve, reject) => {
      const call = {url: String(url), options, resolve, reject}; calls.push(call);
      options.signal.addEventListener('abort', () => reject(new Error('Request aborted')), {once: true});
    }),
  });
  vm.runInContext(source, context, {filename: 'src/scripts/feature-flags.js'});
  const flush = async () => { for (let i = 0; i < 8; i++) await Promise.resolve(); };
  const respond = async (index, result, {ok = true, invalidJSON = false} = {}) => {
    calls[index].resolve({ok, json: async () => { if (invalidJSON) throw new SyntaxError('Invalid JSON'); return result; }});
    await flush();
  };
  const fail = async index => { calls[index].reject(new Error('Network unavailable')); await flush(); };
  const advance = async milliseconds => {
    const end = now + milliseconds;
    while (true) {
      const next = [...timers].filter(([, item]) => item.at <= end).sort((a, b) => a[1].at - b[1].at)[0];
      if (!next) break;
      const [id, item] = next; now = item.at;
      if (item.repeat) item.at += item.delay; else timers.delete(id);
      item.callback(); await flush();
    }
    now = end; await flush();
  };
  const emit = async (type, detail = {}) => {
    const events = type === 'visibilitychange' ? documentEvents : windowEvents;
    for (const callback of events.get(type) || []) callback({type, ...detail});
    await flush();
  };
  const assertHidden = message => assert.ok(sections.every(section => section.hidden), message);
  const assertEnabled = message => assert.ok(sections.every(section => !section.hidden), message);
  const assertPreserved = () => {
    assert.deepEqual(sections.map(section => [section.className, section.parentElement.className]), originalClasses, 'Flag toggling must preserve responsive classes.');
  };
  return {sections, calls, document, timers, storage, respond, fail, advance, emit, assertHidden, assertEnabled, assertPreserved};
}
const enabled = {errorsWhileComputingFlags: false, flags: {[flagKey]: {key: flagKey, enabled: true}}};
const disabled = {errorsWhileComputingFlags: false, flags: {[flagKey]: {key: flagKey, enabled: false}}};

const first = fixture();
first.assertHidden('A pending flag request must not flash testimonials.');
assert.equal(first.document.documentElement.dataset.testimonialsState, 'loading');
assert.equal(first.calls.length, 1);
assert.equal(first.calls[0].url, 'https://eu.i.posthog.com/flags?v=2');
assert.equal(first.calls[0].options.method, 'POST');
assert.equal(first.calls[0].options.credentials, 'omit');
assert.equal(first.calls[0].options.cache, 'no-store');
assert.deepEqual(JSON.parse(first.calls[0].options.body), {api_key: 'phc_public_fixture', distinct_id: 'saved-anonymous-id'}, 'Request only flag evaluation with the public project token and anonymous identity.');
await first.respond(0, enabled);
first.assertEnabled('An explicit enabled result must reveal all three wrappers.');
first.assertPreserved();

// Values such as "true", partial results, legacy payloads and another flag's
// response must never turn the section on.
const closedResults = [
  disabled, {}, null, [],
  {flags: {[flagKey]: {key: flagKey, enabled: true}}},
  {errorsWhileComputingFlags: true, flags: enabled.flags},
  {errorsWhileComputingFlags: 'false', flags: enabled.flags},
  {errorsWhileComputingFlags: false, flags: {'different-flag': {key: 'different-flag', enabled: true}}},
  {errorsWhileComputingFlags: false, flags: {[flagKey]: {key: 'different-flag', enabled: true}}},
  {errorsWhileComputingFlags: false, flags: {[flagKey]: {key: flagKey, enabled: 'true'}}},
  {errorsWhileComputingFlags: false, flags: {[flagKey]: {key: flagKey, enabled: 1}}},
  {errorsWhileComputingFlags: false, flags: {[flagKey]: true}},
  {featureFlags: {[flagKey]: true}},
];
for (const result of closedResults) {
  const f = fixture(); await f.respond(0, result); f.assertHidden('Only the exact flag with explicit boolean true may enable testimonials.'); f.assertPreserved();
}
for (const options of [{ok: false}, {invalidJSON: true}]) {
  const f = fixture(); await f.respond(0, enabled, options); f.assertHidden('HTTP or JSON errors must fail closed.');
  assert.equal(f.document.documentElement.dataset.testimonialsState, 'unavailable');
}
const network = fixture(); await network.fail(0); network.assertHidden('Network errors must fail closed.');
const timeout = fixture(); await timeout.advance(5000);
assert.equal(timeout.calls[0].options.signal.aborted, true, 'A stalled request must be aborted.');
timeout.assertHidden('A stalled request must remain hidden.');
assert.equal(timeout.document.documentElement.dataset.testimonialsState, 'unavailable');
const expiredGrant = fixture(); await expiredGrant.respond(0, enabled);
await expiredGrant.advance(60000); await expiredGrant.advance(5000);
expiredGrant.assertHidden('A timed-out refresh must revoke the previous enabled result.');

// Refreshes must remove a previous grant; a later failure cannot resurrect it.
await first.advance(60000); assert.equal(first.calls.length, 2);
await first.respond(1, disabled); first.assertHidden('A disabled refresh must hide previously visible testimonials.');
await first.advance(60000); await first.fail(2); first.assertHidden('A failed refresh must not restore a cached enabled value.');
await first.advance(60000); await first.respond(3, enabled); first.assertEnabled('A later successful evaluation may restore testimonials.');
await first.advance(60000); await first.fail(4); first.assertHidden('Network failure after an enabled refresh must remove the old grant.');
first.assertPreserved();

// No duplicate requests from rapid focus events, or while evaluation is pending.
const events = fixture(); await events.emit('focus'); assert.equal(events.calls.length, 1);
await events.respond(0, enabled); await events.emit('focus'); assert.equal(events.calls.length, 1);
await events.advance(5000); await events.emit('focus'); assert.equal(events.calls.length, 2);
await events.respond(1, enabled);
events.document.hidden = true; await events.advance(60000); assert.equal(events.calls.length, 2, 'Hidden tabs should not poll.');
events.document.hidden = false; await events.emit('visibilitychange'); assert.equal(events.calls.length, 3);
await events.respond(2, enabled);
await events.emit('pageshow', {persisted: true}); events.assertHidden('Restoring from browser cache must not briefly expose a stale grant.');
assert.equal(events.calls.length, 4); await events.respond(3, disabled); events.assertHidden();

const blocked = fixture({blockedStorage: true}); blocked.assertHidden();
assert.equal(JSON.parse(blocked.calls[0].options.body).distinct_id, 'new-anonymous-id');
await blocked.respond(0, enabled); blocked.assertEnabled('Blocked browser storage must still allow flag evaluation.');
const empty = fixture({empty: true});
assert.equal(empty.calls.length, 0, 'Pages without testimonials must not request flags.');
assert.equal(empty.timers.size, 0, 'Pages without testimonials must not start polling.');
for (const options of [{token: ''}, {token: 'not-a-public-project-token'}, {host: ''}, {host: 'invalid-host'}, {host: 'http://eu.i.posthog.com'}]) {
  const f = fixture(options); f.assertHidden('Missing or invalid configuration must fail closed.');
  assert.equal(f.calls.length, 0);
}
console.log('Feature flags passed: all testimonial placements hidden by default, explicit grants only, fail-closed errors/timeouts, live refresh, browser restoration, responsive preservation and no evaluation on unrelated pages.');
