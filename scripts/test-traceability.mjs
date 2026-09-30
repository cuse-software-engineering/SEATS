#!/usr/bin/env node
// Test traceability of the MVP scenarios: which flow of the six described use cases (project document, Section 2.2)
// has a backend scenario test (monolith/test/**/*.test.ts) and a frontend end-to-end test (frontend/e2e/**/*.spec.ts).
// A test is found by its name, which begins with the use case id and the flow id, then the flow's title, for example
// `test('UC-01 AF-3 Table Just Taken by Another Customer', …)`; `test.todo('UC-02 basic flow …: <reason>')` counts as
// todo and its reason is shown. Plain Node, no dependencies. Writes docs/test-traceability.md.
//
//   node scripts/test-traceability.mjs
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, 'docs', 'test-traceability.md');
const BACKEND = { dir: 'monolith/test', suffix: '.test.ts' };
const FRONTEND = { dir: 'frontend/e2e', suffix: '.spec.ts' };

// ---------------------------------------------------------------- the scenarios of the MVP (Section 2.2, Tables 2.2 to 2.7)
const USE_CASES = [
  { id: 'UC-01', title: 'Reserve a Specific Table', scenarios: [
    ['basic flow', 'Reserve a Specific Table'], ['S-1', 'Notify the Customer by LINE'],
    ['AF-1', 'Round Not Yet Open for Booking'], ['AF-2', 'Round Sold Out'], ['AF-3', 'Table Just Taken by Another Customer'], ['AF-4', 'Customer Cancels During the Hold'], ['AF-5', 'Profile Not Completed'],
    ['EF-1', 'Hold Expires Before Payment'], ['EF-2', 'LINE Login Fails or Is Cancelled'], ['EF-3', 'Confirmation Message Cannot Be Sent'],
  ], increment2: [] },
  { id: 'UC-02', title: 'Check In with E-Ticket', scenarios: [
    ['basic flow', 'Check In with E-Ticket'], ['S-1', 'Verify the Booking Reference'],
    ['AF-2', 'QR Code Unreadable'], ['AF-3', 'Check-In Window Not Open Yet'], ['AF-4', 'More Guests Than the Party Size Paid For'], ['AF-5', 'Arrival After the Grace Period'],
    ['EF-1', 'Ticket Already Used'], ['EF-2', 'Ticket for Another Round or an Unknown Booking'], ['EF-5', 'Check-In Cannot Be Saved'],
  ], increment2: [['AF-1', 'Customer Cannot Show the QR Code'], ['EF-3', 'Escalation to the Manager'], ['EF-4', 'No-Show Marking After the Grace Period']] },
  { id: 'UC-03', title: 'Create Concert Round', scenarios: [
    ['basic flow', 'Create Concert Round'], ['S-1', 'Validate the Round'],
    ['AF-1', 'Save as Draft'], ['AF-3', 'Edit a Published Round'],
    ['EF-1', 'Validation Fails'], ['EF-2', 'Round Cannot Be Saved'],
  ], increment2: [['AF-2', 'Copy from an Earlier Round'], ['AF-4', 'Unpublish a Round'], ['EF-3', 'Zone Map Changed While Editing']] },
  { id: 'UC-04', title: 'Create Venue Zone Map', scenarios: [
    ['basic flow', 'Create Venue Zone Map'], ['S-1', 'Validate the Zone Map'],
    ['AF-1', 'Edit an Active Zone Map'], ['AF-3', 'Save as Draft'],
    ['EF-1', 'Validation Fails'], ['EF-2', 'Zone Map Cannot Be Saved'], ['EF-3', 'Zone Map Image Cannot Be Uploaded'],
  ], increment2: [['AF-2', 'Copy an Existing Zone Map']] },
  { id: 'UC-09', title: 'Maintain Customer Profile', scenarios: [
    ['basic flow', 'Maintain Customer Profile'],
    ['AF-1', 'Consent Refused'], ['AF-2', 'Invalid Profile Data'],
    ['EF-1', 'Profile Cannot Be Saved'],
  ], increment2: [] },
  { id: 'UC-10', title: 'Pay the Full Table Fee', scenarios: [
    ['basic flow', 'Pay the Full Table Fee'],
    ['AF-1', 'Payment Declined'],
    ['EF-4', 'Hold Expires During Payment'],
  ], increment2: [['EF-1', 'Payment Result Arrives After the Hold Expired'], ['EF-2', 'Payment Gateway Unreachable (Degraded Mode)'], ['EF-3', 'Payment Result Not Received']] },
];

// ---------------------------------------------------------------- the test names
function* files(dir, suffix) {
  const abs = join(ROOT, dir);
  if (!existsSync(abs)) return;
  for (const entry of readdirSync(abs, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) { if (entry.name !== 'node_modules') yield* files(path, suffix); }
    else if (entry.name.endsWith(suffix)) yield path;
  }
}
const TEST_CALL = /\btest(\.todo|\.skip|\.only)?\(\s*(['"`])((?:\\.|(?!\2).)*?)\2/g;   // test('name' | test.todo('name'
function testsOf(dir, suffix) {
  const found = [];
  for (const file of files(dir, suffix)) {
    const source = readFileSync(join(ROOT, file), 'utf8');
    for (const m of source.matchAll(TEST_CALL)) found.push({ file, kind: m[1] === '.todo' ? 'todo' : 'test', name: m[3] });
  }
  return found;
}
const backendTests = testsOf(BACKEND.dir, BACKEND.suffix);
const frontendTests = testsOf(FRONTEND.dir, FRONTEND.suffix);

const matches = (tests, uc, flowId, title) => {
  const prefix = `${uc.id} ${flowId}`;
  return tests.filter((t) => t.name === prefix || t.name.startsWith(`${prefix} `) || t.name.startsWith(`${prefix}:`)).map((t) => {
    const full = `${prefix} ${title}`;
    const rest = t.name.startsWith(full) ? t.name.slice(full.length).replace(/^[\s:]+/, '').trim() : `title differs: "${t.name.slice(prefix.length + 1)}"`;
    return { ...t, note: rest };
  });
};
const paren = (s) => (s.startsWith('(') && s.endsWith(')') ? s : `(${s})`);
const cell = (found) => found.length ? found.map((t) => `\`${t.file.split('/').pop()}\`${t.kind === 'todo' ? ' (todo' + (t.note ? `: ${t.note}` : '') + ')' : t.note ? ` ${paren(t.note)}` : ''}`).join('<br>') : '—';
const statusOf = (found) => found.some((t) => t.kind === 'test') ? 'covered' : found.length ? 'todo' : 'missing';

// ---------------------------------------------------------------- the report
const rows = [], perUseCase = [], claimed = new Set();
for (const uc of USE_CASES) {
  const counts = { covered: 0, todo: 0, missing: 0 };
  for (const [flowId, title] of uc.scenarios) {
    const backend = matches(backendTests, uc, flowId, title), frontend = matches(frontendTests, uc, flowId, title);
    for (const t of [...backend, ...frontend]) claimed.add(`${t.file}\n${t.name}`);
    const status = statusOf([...backend, ...frontend]);
    counts[status]++;
    rows.push(`| ${uc.id} ${uc.title} | ${flowId} ${title} | ${cell(backend)} | ${cell(frontend)} | ${status} |`);
  }
  perUseCase.push({ uc, counts });
}
const total = perUseCase.reduce((s, { counts }) => ({ covered: s.covered + counts.covered, todo: s.todo + counts.todo, missing: s.missing + counts.missing }), { covered: 0, todo: 0, missing: 0 });
const scenarios = total.covered + total.todo + total.missing;
const others = [...backendTests, ...frontendTests].filter((t) => !claimed.has(`${t.file}\n${t.name}`) && /^UC-\d\d\b/.test(t.name));
const outOfScope = USE_CASES.flatMap((uc) => uc.increment2.map(([flowId, title]) => `${uc.id} ${flowId} ${title}`));

const md = `# Test traceability of the MVP scenarios

Generated by \`node scripts/test-traceability.mjs\` from the names of the tests under \`${BACKEND.dir}/\` (backend, node:test through
the API Gateway in monolith mode, ADR-14) and \`${FRONTEND.dir}/\` (frontend, Playwright; skipped while the folder does not exist).
Do not edit by hand: regenerate it after adding or renaming a scenario test.

The scenarios are the flows of the six described use cases of the project document (Section 2.2, Tables 2.2 to 2.7) that the
MVP builds; Appendix A maps each step to its operation. A test belongs to a scenario when its name begins with the use case id,
the flow id and the flow's title, for example \`UC-01 AF-3 Table Just Taken by Another Customer\`. A \`test.todo\` counts as
**todo** and its reason (the text after the title) is shown; **covered** needs at least one real test, backend or frontend;
**missing** means no test names the scenario.

| Use case | Scenario | Backend test | Frontend test | Status |
|---|---|---|---|---|
${rows.join('\n')}

**Summary**: ${scenarios} scenarios: ${total.covered} covered, ${total.todo} todo, ${total.missing} missing. Per use case (covered / todo / missing): ${perUseCase.map(({ uc, counts }) => `${uc.id} ${counts.covered} / ${counts.todo} / ${counts.missing}`).join(', ')}. Frontend tests found: ${frontendTests.length}${existsSync(join(ROOT, FRONTEND.dir)) ? '' : ` (\`${FRONTEND.dir}/\` does not exist yet)`}.

${others.length ? `Other tests named after a use case without a scenario id (progress 1 contract checks): ${others.map((t) => `\`${t.file.split('/').pop()}\` "${t.name}"`).join('; ')}.\n\n` : ''}Out of scope (Increment 2, not traced): ${outOfScope.join('; ')}.
`;
writeFileSync(OUT, md);
console.log(`${relative(ROOT, OUT)}: ${scenarios} scenarios, ${total.covered} covered, ${total.todo} todo, ${total.missing} missing (${backendTests.length} backend tests scanned, ${frontendTests.length} frontend)`);
for (const { uc, counts } of perUseCase) console.log(`  ${uc.id} ${uc.title}: ${counts.covered} covered, ${counts.todo} todo, ${counts.missing} missing`);
if (total.missing) process.exitCode = 1;
