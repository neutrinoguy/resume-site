import fs from 'fs';
import path from 'path';

// Markdown 404 error template (strictly > 20 characters, explains error, links to manifests)
const MARKDOWN_404 = `# 404 Not Found

The requested resource could not be found on this server.

### Available Manifests & Direct Resources:
- [Home & Portfolio](https://neutrinoguy.zip/)
- [Agent Manifest (llms.txt)](https://neutrinoguy.zip/llms.txt)
- [Agent Instructions & When-To-Use](https://neutrinoguy.zip/agent-instructions.md)
- [Full Context Dossier (llms-full.txt)](https://neutrinoguy.zip/llms-full.txt)
- [Sitemap](https://neutrinoguy.zip/sitemap.xml)
- [Full Resume (Markdown)](https://neutrinoguy.zip/Resume.md)
- [About Aagam Shah](https://neutrinoguy.zip/about)
- [Contact & CVD Guidelines](https://neutrinoguy.zip/contact)
- [Privacy Policy](https://neutrinoguy.zip/privacy)
`;

function getSafeFile(filename) {
  try {
    const fullPath = path.join(process.cwd(), filename);
    if (fs.existsSync(fullPath)) {
      return fs.readFileSync(fullPath, 'utf8');
    }
  } catch (err) {
    // fallback if fs fails in isolated sandbox
  }
  return null;
}

export default async function handler(req, res) {
  // Normalize pathname across both Node (req.url / req.query) and Edge (Request)
  let rawPath = '';
  if (req.query && typeof req.query.path === 'string') {
    rawPath = req.query.path;
  } else if (req.url) {
    const parsed = new URL(req.url, 'https://neutrinoguy.zip');
    rawPath = parsed.searchParams.get('path') || parsed.pathname;
  }

  // Strip leading/trailing slashes
  const cleanPath = (rawPath || '').replace(/^\/+|\/+$/g, '').toLowerCase();

  let statusCode = 200;
  let markdownBody = '';

  if (cleanPath === '' || cleanPath === 'index' || cleanPath === 'index.html' || cleanPath === 'resume' || cleanPath === 'resume.html') {
    markdownBody = getSafeFile('Resume.md') || `# Aagam Shah (neutrinoguy) - Cyber Security Technical Lead\n\nPlease view https://neutrinoguy.zip/Resume.md for the full resume.`;
  } else if (cleanPath === 'about' || cleanPath === 'about.html') {
    markdownBody = getSafeFile('about.md') || `# About Aagam Shah\n\nCyber Security Technical Lead at ABB specializing in ICS/SCADA and AI Security. Full details at https://neutrinoguy.zip/about`;
  } else if (cleanPath === 'contact' || cleanPath === 'contact.html') {
    markdownBody = getSafeFile('contact.md') || `# Contact Aagam Shah\n\nReach out to hello@hexlab.xyz. Full details at https://neutrinoguy.zip/contact`;
  } else if (cleanPath === 'privacy' || cleanPath === 'privacy.html') {
    markdownBody = getSafeFile('privacy.md') || `# Privacy Policy\n\nZero-tracking, privacy-first portfolio. Full details at https://neutrinoguy.zip/privacy`;
  } else if (cleanPath === 'llms.txt') {
    markdownBody = getSafeFile('llms.txt') || `# llms.txt\n\nAgent manifest available at https://neutrinoguy.zip/llms.txt`;
  } else if (cleanPath === 'agent-instructions' || cleanPath === 'agent-instructions.md') {
    markdownBody = getSafeFile('agent-instructions.md') || `# Agent Instructions\n\nOperational guidelines at https://neutrinoguy.zip/agent-instructions.md`;
  } else {
    // Unknown or non-existent path: Agent-friendly 404 response
    statusCode = 404;
    markdownBody = MARKDOWN_404;
  }

  const headers = {
    'Content-Type': 'text/markdown; charset=utf-8',
    'Vary': 'Accept',
    'Access-Control-Allow-Origin': '*',
    'Cache-Control': statusCode === 200 ? 'public, max-age=3600' : 'no-cache, no-store, must-revalidate',
  };

  // If running in standard Node.js Serverless runtime (req, res)
  if (res && typeof res.setHeader === 'function') {
    for (const [key, val] of Object.entries(headers)) {
      res.setHeader(key, val);
    }
    return res.status(statusCode).send(markdownBody);
  }

  // If running in Edge runtime (Web standard Response)
  return new Response(markdownBody, {
    status: statusCode,
    headers,
  });
}
