import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.join(__dirname, '..');

// Import handler from api/agent.js
import agentHandler from '../api/agent.js';

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  ✅ PASS: ${message}`);
    passed++;
  } else {
    console.error(`  ❌ FAIL: ${message}`);
    failed++;
  }
}

// Helper to simulate mock request & response
function createMockRes() {
  return {
    statusCode: 200,
    headers: {},
    body: '',
    setHeader(name, value) {
      this.headers[name.toLowerCase()] = value;
    },
    status(code) {
      this.statusCode = code;
      return this;
    },
    send(data) {
      this.body = data;
      return this;
    },
  };
}

console.log('\n--- 1. Agent Instruction & When-to-Use File Checks ---');
const llmsContent = fs.readFileSync(path.join(ROOT, 'llms.txt'), 'utf8');
assert(llmsContent.includes('## When to Use This'), 'llms.txt contains "## When to Use This" section');
assert(llmsContent.includes('Industrial Control Systems (ICS/SCADA) Security'), 'llms.txt lists ICS/SCADA capability');
assert(llmsContent.includes('Offensive & Defensive AI Security'), 'llms.txt lists AI security capability');
assert(llmsContent.includes('agent-instructions.md'), 'llms.txt references agent-instructions.md');

const agentInstrContent = fs.readFileSync(path.join(ROOT, 'agent-instructions.md'), 'utf8');
assert(agentInstrContent.includes('When to Use This'), 'agent-instructions.md contains when-to-use section');
assert(agentInstrContent.includes('How AI Agents Should Call'), 'agent-instructions.md contains invocation guidance');
assert(agentInstrContent.includes('hello@hexlab.xyz'), 'agent-instructions.md contains contact email');

console.log('\n--- 2. Organization Schema Completeness in index.html ---');
const indexHtml = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const jsonLdMatch = indexHtml.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
assert(!!jsonLdMatch, 'index.html contains JSON-LD script block');
const jsonLd = JSON.parse(jsonLdMatch[1]);
const orgs = jsonLd['@graph'].filter(item => item['@type'] === 'Organization');
assert(orgs.length >= 1, 'JSON-LD graph contains at least one Organization');

const mainOrg = orgs[0];
assert(!!mainOrg.address, 'Organization has address');
assert(mainOrg.address['@type'] === 'PostalAddress', 'Organization address is PostalAddress');
assert(!!mainOrg.address.addressLocality, 'Organization address has addressLocality');
assert(!!mainOrg.address.addressCountry, 'Organization address has addressCountry');
assert(!!mainOrg.contactPoint, 'Organization has contactPoint');
const contactPoint = Array.isArray(mainOrg.contactPoint) ? mainOrg.contactPoint[0] : mainOrg.contactPoint;
assert(!!contactPoint.email, 'Organization contactPoint has email');
assert(!!contactPoint.contactType, 'Organization contactPoint has contactType');

console.log('\n--- 3. Trust Anchor Pages (>= 500 characters) ---');
['about.html', 'contact.html', 'privacy.html'].forEach(file => {
  const content = fs.readFileSync(path.join(ROOT, file), 'utf8');
  assert(content.length >= 500, `${file} character count (${content.length}) >= 500`);
});

console.log('\n--- 4. HTTP Content Negotiation & Agent-friendly 404s via api/agent.js ---');

async function testEndpoint(pathQuery, expectedStatus, expectedContentSnippet) {
  const req = {
    url: `https://neutrinoguy.zip/?path=${pathQuery}`,
    query: { path: pathQuery },
  };
  const res = createMockRes();
  await agentHandler(req, res);

  assert(res.statusCode === expectedStatus, `Path "${pathQuery}" returns HTTP ${expectedStatus} (got ${res.statusCode})`);
  assert(res.headers['content-type']?.includes('text/markdown'), `Path "${pathQuery}" Content-Type includes text/markdown`);
  assert(res.headers['vary']?.includes('Accept'), `Path "${pathQuery}" Vary header includes Accept`);
  assert(res.body.length >= 20, `Path "${pathQuery}" Markdown body has >= 20 characters (got ${res.body.length})`);
  if (expectedContentSnippet) {
    assert(res.body.includes(expectedContentSnippet), `Path "${pathQuery}" body includes "${expectedContentSnippet}"`);
  }
}

// Test Root /
await testEndpoint('', 200, 'Aagam Shah');

// Test About
await testEndpoint('about', 200, 'About Aagam Shah');

// Test Contact
await testEndpoint('contact', 200, 'Contact');

// Test Privacy
await testEndpoint('privacy', 200, 'Privacy Policy');

// Test 404 Probe: /__ora-404-probe-wuu6l7x9
await testEndpoint('__ora-404-probe-wuu6l7x9', 404, '404 Not Found');

// Test 404 Probe contains sitemap or llms.txt link
const probeRes = createMockRes();
await agentHandler({ query: { path: '__ora-404-probe-wuu6l7x9' } }, probeRes);
assert(probeRes.body.includes('llms.txt') && probeRes.body.includes('sitemap.xml'), '404 body links to llms.txt and sitemap.xml');

console.log('\n--- 5. Vercel Configuration Verification ---');
const vercelConfig = JSON.parse(fs.readFileSync(path.join(ROOT, 'vercel.json'), 'utf8'));
assert(vercelConfig.cleanUrls === true, 'vercel.json has cleanUrls: true');

const rewrite = vercelConfig.rewrites?.find(r => r.destination?.includes('/api/agent'));
assert(!!rewrite, 'vercel.json contains rewrite to /api/agent');
assert(rewrite.has?.some(h => h.key === 'Accept' && h.value?.includes('text/markdown')), 'rewrite checks Accept: text/markdown header');

const globalHeader = vercelConfig.headers?.find(h => h.source === '/(.*)');
assert(globalHeader?.headers?.some(k => k.key === 'Vary' && k.value.includes('Accept')), 'vercel.json applies Vary: Accept to all routes');

console.log(`\n========================================`);
console.log(`SUMMARY: ${passed} passed, ${failed} failed`);
console.log(`========================================\n`);

process.exit(failed > 0 ? 1 : 0);
