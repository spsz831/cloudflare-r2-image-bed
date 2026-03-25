import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

async function loadWorkerModule() {
  const source = await readFile(new URL('../src/index.js', import.meta.url), 'utf8');
  const moduleUrl = `data:text/javascript;base64,${Buffer.from(source).toString('base64')}`;
  return import(moduleUrl);
}

const workerModule = await loadWorkerModule();
const request = new Request('https://19950906.xyz/api/upload', {
  method: 'POST',
  body: new FormData(),
});

const response = await workerModule.default.fetch(request, {
  ALLOWED_ORIGINS: 'https://19950906.xyz,https://www.19950906.xyz',
  UPLOAD_PASSWORD: 'test-password',
  R2_BUCKET: {
    async put() {
      throw new Error('upload should not be attempted without auth');
    },
  },
});

assert.equal(response.status, 401, 'upload without token should be rejected');
const payload = await response.json();
assert.equal(payload.success, false);
assert.match(payload.error, /登录|令牌|认证/, 'error message should explain authentication is required');
console.log('upload auth check passed');
