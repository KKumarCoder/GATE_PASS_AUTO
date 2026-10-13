import test from 'node:test';
import assert from 'node:assert/strict';
import axios from 'axios';
import { sendApitxtOTP } from '../services/otp/apitxt.service.js';
import { isSmsOTPConfigured } from '../config/env.js';

test('APITxT sends form POST, supports default/explicit templates, and sanitizes all failures', async t => {
  const keys = ['APITXT_AUTH_KEY', 'APITXT_TEMPLATE_ID'];
  const saved = Object.fromEntries(keys.map(key => [key, process.env[key]]));
  t.after(() => { for (const key of keys) { if (saved[key] === undefined) delete process.env[key]; else process.env[key] = saved[key]; } });
  process.env.APITXT_AUTH_KEY = 'secret-key';
  delete process.env.APITXT_TEMPLATE_ID;
  const calls = [];
  const transport = t.mock.method(axios, 'post', async (url, body, options) => {
    calls.push({ url, body: new URLSearchParams(body), options });
    return { data: { status: 'success', data: { request_id: 'SMS-OTP-example' } } };
  });
  await sendApitxtOTP('9876543210', '123456');
  assert.equal(calls[0].url, 'https://apitxt.com/api/sendOTP');
  assert.deepEqual(Object.fromEntries(calls[0].body), { authkey: 'secret-key', mobile: '919876543210', otp: '123456', channel: 'sms', country: '91' });
  assert.equal(calls[0].options.maxRedirects, 0);
  assert.equal(calls[0].options.timeout, 10000);
  assert.equal(calls[0].options.headers['Content-Type'], 'application/x-www-form-urlencoded');
  process.env.APITXT_TEMPLATE_ID = '42';
  await sendApitxtOTP('+919876543210', '123456');
  assert.equal(calls[1].body.get('template_id'), '42');
  for (const data of [{status:'error',message:'secret-key 123456'}, {}, null, '<html>error</html>']) {
    transport.mock.mockImplementation(async () => ({ data }));
    await assert.rejects(sendApitxtOTP('9876543210', '123456'), { message: 'APITxT SMS OTP request failed.' });
  }
  transport.mock.mockImplementation(async () => { throw new Error('secret-key 123456'); });
  await assert.rejects(sendApitxtOTP('9876543210', '123456'), { message: 'APITxT SMS OTP request failed.' });
  const count = transport.mock.callCount();
  await assert.rejects(sendApitxtOTP('invalid', '123456'), /Invalid Indian mobile/);
  await assert.rejects(sendApitxtOTP('9876543210', 'oops'), /Invalid OTP/);
  process.env.APITXT_TEMPLATE_ID = 'not-an-id';
  assert.equal(isSmsOTPConfigured(), false);
  await assert.rejects(sendApitxtOTP('9876543210', '123456'), /not configured/);
  delete process.env.APITXT_AUTH_KEY;
  assert.equal(isSmsOTPConfigured(), false);
  assert.equal(transport.mock.callCount(), count);
});
