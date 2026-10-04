import assert from 'node:assert/strict';
import {handleContact} from '../api/contact.js';

// Exercise the contact function with a recorded email provider instead of the network.
const site = 'https://www.nmesis.io';
const valid = {Name: 'Mona Adel', Email: 'mona@example.com', Service: 'Digital twins', Referral: 'LinkedIn', message: 'We are launching three models.\nCan you help?', started: String(Date.now() - 60000)};
async function submit(fields = valid, {env = {RESEND_API_KEY: 'test-key'}, origin = site, accept = 'application/json', providerStatus = 200, headers = {}} = {}) {
  const sent = [];
  const body = new FormData();
  for (const [name, value] of Object.entries(fields)) body.append(name, value);
  const request = new Request(`${site}/api/contact`, {method: 'POST', body, headers: {accept, ...(origin ? {origin} : {}), ...headers}});
  const response = await handleContact(request, env, async (url, options) => { sent.push({url, options, email: JSON.parse(options.body)}); return new Response('{}', {status: providerStatus}); });
  const type = response.headers.get('content-type') || '';
  return {status: response.status, body: type.includes('json') ? await response.json() : await response.text(), sent};
}

// Delivery: to the studio, from the configured sender, replying to the visitor.
let result = await submit(valid, {env: {RESEND_API_KEY: 'test-key', CONTACT_FROM: 'NMESIS Website <website@nmesis.io>'}});
assert.equal(result.status, 200);
assert.deepEqual(result.body, {ok: true});
assert.equal(result.sent.length, 1, 'One email is sent per enquiry');
const [{url, options, email}] = result.sent;
assert.equal(url, 'https://api.resend.com/emails');
assert.equal(options.headers.authorization, 'Bearer test-key');
assert.deepEqual(email.to, ['info@nmesis.io'], 'Enquiries go to the studio inbox');
assert.equal(email.from, 'NMESIS Website <website@nmesis.io>');
assert.equal(email.reply_to, 'mona@example.com', 'Replies go to the visitor');
assert.equal(email.subject, 'New enquiry: Digital twins — Mona Adel');
for (const value of Object.values(valid).slice(0, 5)) assert.ok(email.text.includes(value), `The email includes ${value}`);
assert.equal((await submit(valid, {env: {RESEND_API_KEY: 'k', CONTACT_TO: 'sales@nmesis.io'}})).sent[0].email.to[0], 'sales@nmesis.io');

// Untrusted text is escaped in HTML and cannot add headers through line breaks.
result = await submit({...valid, Name: 'Mona\r\nBcc: victim@example.com', message: '<script>alert(1)</script>'});
assert.ok(!/[\r\n]/.test(result.sent[0].email.subject), 'Subjects stay on one line');
assert.ok(!result.sent[0].email.html.includes('<script>') && result.sent[0].email.html.includes('&lt;script&gt;'), 'HTML is escaped');
assert.equal(result.sent[0].email.reply_to, 'mona@example.com');

// Validation names the field to fix and sends nothing.
for (const [field, value] of [['Name', ''], ['Email', 'not-an-email'], ['Service', ''], ['message', 'x'.repeat(4001)]]) {
  result = await submit({...valid, [field]: value});
  assert.equal(result.status, 400, `${field} is validated`);
  assert.equal(result.body.field, field);
  assert.equal(result.sent.length, 0);
}

// Bots get a success reply and nothing is sent.
assert.equal((await submit({...valid, website: 'https://spam.example'})).sent.length, 0, 'The honeypot field blocks delivery');
result = await submit({...valid, started: String(Date.now())});
assert.ok(result.body.ok && result.sent.length === 0, 'Instant submissions are ignored');

// Only the site itself may post; a missing Origin (older clients) is accepted.
result = await submit(valid, {origin: 'https://evil.example'});
assert.equal(result.status, 403);assert.equal(result.sent.length, 0);
assert.equal((await submit(valid, {origin: null})).status, 200);

// Not configured: 503 so the page falls back to the visitor's email app.
result = await submit(valid, {env: {}});
assert.equal(result.status, 503);assert.equal(result.body.error, 'not-configured');assert.equal(result.sent.length, 0);

// Provider failure: 502 with a clear fallback message.
const report = console.error;console.error = () => {};
result = await submit(valid, {providerStatus: 422});
console.error = report;
assert.equal(result.status, 502);assert.match(result.body.message, /info@nmesis\.io/);

// Dry run (local preview) sends nothing; oversized requests are refused.
const log = console.log;console.log = () => {};
result = await submit(valid, {env: {CONTACT_DRY_RUN: '1'}});
console.log = log;
assert.ok(result.body.ok && result.sent.length === 0);
assert.equal((await submit(valid, {headers: {'content-length': String(64 * 1024)}})).status, 413);

// Without JavaScript the form posts directly and receives a readable page.
result = await submit(valid, {accept: 'text/html'});
assert.equal(result.status, 200);assert.match(result.body, /message has been sent/);

console.log('Contact passed: delivery to the studio with visitor reply-to, escaping and header safety, field validation, honeypot and timing filters, same-origin posts, not-configured and provider-failure fallbacks, dry run and no-JavaScript replies.');
