import process from 'node:process';
import { URL } from 'node:url';

const backendUrl = process.env.BAGDAILY_BACKEND_URL?.trim();

if (!backendUrl) {
  throw new Error('Set BAGDAILY_BACKEND_URL to the HTTPS origin of the BagDaily backend.');
}

const backend = new URL(backendUrl);
if (
  backend.protocol !== 'https:' ||
  backend.username ||
  backend.password ||
  backend.pathname !== '/' ||
  backend.search ||
  backend.hash
) {
  throw new Error('BAGDAILY_BACKEND_URL must be an HTTPS origin without a path or credentials.');
}

export const config = {
  framework: 'vite',
  buildCommand: 'npm run build',
  outputDirectory: 'dist',
  rewrites: [
    { source: '/api/:path*', destination: `${backend.origin}/api/:path*` },
    { source: '/((?!api(?:/|$)).*)', destination: '/index.html' },
  ],
};
