import { writeFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';

const DEFAULT_BASE_URL = '';
const DEFAULT_API_KEY = '';

export async function generateImage({
  prompt = 'A tiny robot painting a sunrise',
  outputPath = 'output.png',
  baseUrl = process.env.CLIPROXY_BASE_URL ?? DEFAULT_BASE_URL,
  apiKey = process.env.CLIPROXY_API_KEY ?? DEFAULT_API_KEY,
  fetchImpl = globalThis.fetch,
  size = '1024x1024',
  quality = 'high',
  outputFormat = 'png',
} = {}) {
  if (!fetchImpl) {
    throw new Error('fetch is not available; use Node.js 18+');
  }

  const root = baseUrl.replace(/\/+$/, '').replace(/\/v1$/i, '');
  const endpoint = `${root}/v1/images/generations`;
  const res = await fetchImpl(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'gpt-image-2',
      prompt,
      size,
      quality,
      output_format: outputFormat,
      response_format: 'b64_json',
    }),
  });

  const text = await res.text();
  if (!res.ok) {
    throw new Error(`${res.status} ${text}`);
  }

  const json = JSON.parse(text);
  const b64 = json.data?.[0]?.b64_json ?? json.data?.[0]?.url?.replace(/^data:[^;]+;base64,/, '');
  if (!b64) {
    throw new Error(`No image in response: ${text}`);
  }

  await writeFile(outputPath, Buffer.from(b64, 'base64'));
  return outputPath;
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const prompt = process.argv[2] ?? 'A tiny robot painting a sunrise';
  const outputPath = process.argv[3] ?? 'output.png';
  const size = process.argv[4] ?? '1024x1024';

  try {
    const written = await generateImage({ prompt, outputPath, size });
    console.log(`wrote ${written}`);
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  }
}
