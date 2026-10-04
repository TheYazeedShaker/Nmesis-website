// Contact form delivery (Vercel Function): validates an enquiry and emails it to the studio
// through Resend, with replies going straight to the visitor. Visitors never receive email
// from this endpoint, so it cannot be used to send messages to anyone else.
//
// Environment variables (Vercel → Settings → Environment Variables):
//   RESEND_API_KEY  required to send; without it the endpoint answers 503 and the page falls
//                   back to opening the visitor's email app
//   CONTACT_TO      recipient (default info@nmesis.io)
//   CONTACT_FROM    sender on a domain verified in Resend, e.g. "NMESIS Website <website@nmesis.io>"
//                   (default Resend's test sender, which only delivers to the Resend account's own address)
//   CONTACT_DRY_RUN "1" logs the email instead of sending it (local preview and tests)

const limits = {Name: 120, Email: 200, Service: 120, Referral: 120, message: 4000};
const labels = {Name: 'Name', Email: 'Email', Service: 'Service', Referral: 'How they heard about NMESIS', message: 'Message'};
const emailPattern = /^[^\s@<>()",;:]+@[^\s@<>()",;:]+\.[^\s@<>()",;:]{2,}$/;
const escapeHTML = value => value.replace(/[&<>"']/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]));
// Single-line fields lose control characters and line breaks; the message keeps its line breaks.
const clean = (value, multiline) => String(value ?? '').replace(/\r\n?/g, '\n').replace(multiline ? /[\u0000-\u0009\u000b-\u001f\u007f]/g : /[\u0000-\u001f\u007f]/g, ' ').trim();

function reply(request, status, body) {
  if ((request.headers.get('accept') || '').includes('application/json')) return Response.json(body, {status, headers: {'cache-control': 'no-store'}});
  // Without JavaScript the form posts here directly; answer with a small readable page.
  const text = body.ok ? 'Thank you. Your message has been sent to the NMESIS team.' : body.message || 'Your message could not be sent. Please email info@nmesis.io.';
  return new Response(`<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>NMESIS</title><p style="font:16px/1.6 system-ui,sans-serif;max-width:560px;margin:15vh auto;padding:0 24px">${escapeHTML(text)}<br><br><a href="/contact">Back to NMESIS</a></p>`, {status, headers: {'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store'}});
}

export async function handleContact(request, env = process.env, send = fetch) {
  const origin = request.headers.get('origin');
  if (origin && new URL(origin).host !== new URL(request.url).host) return reply(request, 403, {ok: false, error: 'origin', message: 'Please send your enquiry from the NMESIS website.'});
  if (Number(request.headers.get('content-length') || 0) > 32 * 1024) return reply(request, 413, {ok: false, error: 'too-large', message: 'Your message is too long.'});
  let form;
  try { form = await request.formData(); } catch { return reply(request, 400, {ok: false, error: 'invalid', message: 'Please complete the form and try again.'}); }

  // Bots fill the hidden field or submit instantly; they get a success reply and nothing is sent.
  const started = Number(form.get('started'));
  if (clean(form.get('website')) || (started && Date.now() - started < 3000)) return reply(request, 200, {ok: true});

  const fields = {};
  for (const [name, limit] of Object.entries(limits)) {
    const value = clean(form.get(name), name === 'message');
    if (!value || value.length > limit) return reply(request, 400, {ok: false, error: 'invalid', field: name, message: `Please check the ${labels[name].toLowerCase()} field.`});
    fields[name] = value;
  }
  if (!emailPattern.test(fields.Email)) return reply(request, 400, {ok: false, error: 'invalid', field: 'Email', message: 'Please enter a valid email address.'});

  const to = env.CONTACT_TO || 'info@nmesis.io';
  const email = {
    from: env.CONTACT_FROM || 'NMESIS Website <onboarding@resend.dev>',
    to: [to],
    reply_to: fields.Email,
    subject: `New enquiry: ${fields.Service} — ${fields.Name}`.slice(0, 200),
    text: Object.entries(labels).map(([name, label]) => `${label}: ${fields[name]}`).join('\n\n') + '\n\nSent from the contact form on nmesis.io. Reply to this email to answer the enquiry.',
    html: `<div style="font:15px/1.6 Arial,sans-serif;color:#141414">${Object.entries(labels).map(([name, label]) => `<p style="margin:0 0 14px"><strong>${label}</strong><br>${escapeHTML(fields[name]).replace(/\n/g, '<br>')}</p>`).join('')}<p style="margin:24px 0 0;color:#606760;font-size:13px">Sent from the contact form on nmesis.io. Reply to this email to answer the enquiry.</p></div>`,
  };
  if (env.CONTACT_DRY_RUN === '1') { console.log('[contact] dry run, not sent:', JSON.stringify({...email, html: undefined})); return reply(request, 200, {ok: true, dryRun: true}); }
  if (!env.RESEND_API_KEY) return reply(request, 503, {ok: false, error: 'not-configured', message: `Please email your enquiry to ${to}.`});

  try {
    const response = await send('https://api.resend.com/emails', {method: 'POST', headers: {authorization: `Bearer ${env.RESEND_API_KEY}`, 'content-type': 'application/json'}, body: JSON.stringify(email)});
    if (!response.ok) throw new Error(`Resend responded ${response.status}`);
  } catch (error) {
    // Log the provider status only; the enquiry itself stays out of the logs.
    console.error('[contact] delivery failed:', error.message);
    return reply(request, 502, {ok: false, error: 'send-failed', message: `Your message could not be sent. Please email ${to}.`});
  }
  return reply(request, 200, {ok: true});
}

export function POST(request) {
  return handleContact(request);
}
