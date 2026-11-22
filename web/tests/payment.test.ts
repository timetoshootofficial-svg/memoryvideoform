import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import * as V from '../lib/razorpay-verify.ts';

const SECRET = 'test_key_secret_not_a_real_one';
const HOOK   = 'test_webhook_secret_not_a_real_one';
const sign = (secret: string, body: string) =>
  createHmac('sha256', secret).update(body).digest('hex');

test('a real checkout signature is accepted', () => {
  const orderId = 'order_ABC123';
  const paymentId = 'pay_XYZ789';
  const signature = sign(SECRET, `${orderId}|${paymentId}`);
  assert.ok(V.checkoutSignatureValid({ orderId, paymentId, signature, keySecret: SECRET }));
});

test('a payment id swapped after the fact is rejected', () => {
  /* The browser hands us all three values, so it can lie about any of them.
     This is the check that makes the other two trustworthy. */
  const orderId = 'order_ABC123';
  const signature = sign(SECRET, `${orderId}|pay_REAL`);
  assert.equal(
    V.checkoutSignatureValid({ orderId, paymentId: 'pay_FAKE', signature, keySecret: SECRET }),
    false, 'a different payment id must not pass');
  assert.equal(
    V.checkoutSignatureValid({ orderId: 'order_OTHER', paymentId: 'pay_REAL', signature, keySecret: SECRET }),
    false, 'a different order id must not pass');
  assert.equal(
    V.checkoutSignatureValid({ orderId, paymentId: 'pay_REAL', signature, keySecret: 'wrong_secret' }),
    false, 'the wrong key secret must not pass');
});

test('a missing piece never counts as valid', () => {
  const ok = { orderId: 'order_A', paymentId: 'pay_B', signature: 'x', keySecret: SECRET };
  for (const k of ['orderId', 'paymentId', 'signature', 'keySecret'] as const)
    assert.equal(V.checkoutSignatureValid({ ...ok, [k]: '' }), false, `empty ${k} must fail`);
  /* An empty signature compared against an empty one must not pass either. */
  assert.equal(V.checkoutSignatureValid({ ...ok, signature: '', keySecret: '' }), false);
});

test('a signature of the wrong length is rejected, not waved through', () => {
  /* Every wrong signature produced by a wrong secret is still 64 hex
     characters, so a length check that fell open would never show up in the
     tests above. A short or long signature must fail like any other. */
  const orderId = 'order_ABC123';
  const paymentId = 'pay_XYZ789';
  for (const signature of ['abc', '', 'f'.repeat(63), 'f'.repeat(65), 'f'.repeat(200)])
    assert.equal(
      V.checkoutSignatureValid({ orderId, paymentId, signature, keySecret: SECRET }),
      false, `a ${signature.length}-character signature must fail`);

  const raw = '{"amount":9900}';
  for (const signature of ['abc', 'f'.repeat(63), 'f'.repeat(65)])
    assert.equal(
      V.webhookSignatureValid({ rawBody: raw, signature, webhookSecret: HOOK }),
      false, `a ${signature.length}-character webhook signature must fail`);
});

test('the webhook signature is checked against the raw body', () => {
  const raw = '{"event":"payment.captured","payload":{"payment":{"entity":{"id":"pay_1"}}}}';
  const signature = sign(HOOK, raw);
  assert.ok(V.webhookSignatureValid({ rawBody: raw, signature, webhookSecret: HOOK }));

  /* Re-serialising the JSON changes the bytes. This is the mistake that makes
     webhooks fail for days, so it is worth a test of its own. */
  const reserialised = JSON.stringify(JSON.parse(raw), null, 2);
  assert.notEqual(reserialised, raw);
  assert.equal(
    V.webhookSignatureValid({ rawBody: reserialised, signature, webhookSecret: HOOK }),
    false, 'a reparsed body must not match');

  /* The webhook secret is not the key secret. */
  assert.equal(
    V.webhookSignatureValid({ rawBody: raw, signature, webhookSecret: SECRET }),
    false, 'the key secret must not validate a webhook');
});

test('one byte changed in the body is caught', () => {
  const raw = '{"amount":9900}';
  const signature = sign(HOOK, raw);
  assert.equal(
    V.webhookSignatureValid({ rawBody: '{"amount":9901}', signature, webhookSecret: HOOK }),
    false, 'an altered amount must not pass');
});

test('rupees become paise, and nonsense becomes nothing', () => {
  assert.equal(V.toPaise(99), 9900);
  assert.equal(V.toPaise(2999), 299900);
  for (const bad of [0, -99, 99.5, NaN, Infinity])
    assert.equal(V.toPaise(bad as number), 0, `${bad} must not become an amount`);
});
