import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { generateImage } from './generate-image.mjs';

test('generateImage posts to CLIProxyAPI and writes b64 response', async () => {
  const tmp = await mkdtemp(join(tmpdir(), 'cliproxy-image-'));
  const outputPath = join(tmp, 'image.png');
  const imageBytes = Buffer.from('fake-png');

  let request;
  const fetchImpl = async (url, init) => {
    request = { url, init };
    return new Response(JSON.stringify({
      data: [{ b64_json: imageBytes.toString('base64') }],
    }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  };

  try {
    await generateImage({
      prompt: 'A tiny robot painting a sunrise',
      outputPath,
      fetchImpl,
    });

    assert.equal(request.url, 'https://cliproxyapi.uratmangun.ovh/v1/images/generations');
    assert.equal(request.init.method, 'POST');
    assert.equal(request.init.headers.Authorization, 'Bearer sk-local-dev');

    const body = JSON.parse(request.init.body);
    assert.equal(body.model, 'gpt-image-2');
    assert.equal(body.prompt, 'A tiny robot painting a sunrise');
    assert.equal(body.size, '1024x1024');
    assert.equal(body.quality, 'high');
    assert.equal(body.output_format, 'png');
    assert.equal(body.response_format, 'b64_json');

    assert.deepEqual(await readFile(outputPath), imageBytes);
  } finally {
    await rm(tmp, { recursive: true, force: true });
  }
});
