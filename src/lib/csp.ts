// The security policy of the pages (Content Security Policy), applied in production only: in development, Astro injects
// its own tools. Nothing comes from anywhere but the site; the scripts written in the page are allowed one by one, by
// their hash, so any other injected script is blocked. style-src keeps 'unsafe-inline': the stylesheet is inlined in the
// page and the hero words carry style="--i:…".
import { createHash } from 'node:crypto';

export const sha256 = (s: string) => `'sha256-${createHash('sha256').update(s).digest('base64')}'`;

export const contentSecurityPolicy = (inlineScripts: string[]) => [
  "default-src 'self'",
  ['script-src', "'self'", ...inlineScripts.map(sha256)].join(' '),
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self'",
  "connect-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'none'",
].join('; ');
