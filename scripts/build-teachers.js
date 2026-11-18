// scripts/build-teachers.js
// Builds teachers.html at build time from the same lesson data the book uses:
// every lesson's text, questions, answers, feedback for known mistakes,
// syllabus links and sources, plus the game's levels and their solutions.
// A plain, printable page that works with no WebGL.
import { createServer } from 'vite';
import { writeFileSync, existsSync, mkdirSync } from 'node:fs';

const server = await createServer({ server: { middlewareMode: true }, appType: 'custom', logLevel: 'error' });
try {
  const { LESSONS } = await server.ssrLoadModule('/src/lessons/index.js');
  const { SOURCES } = await server.ssrLoadModule('/src/lessons/sources.js');
  const { GLOSSARY } = await server.ssrLoadModule('/src/lessons/glossaryTerms.js');
  const game = await server.ssrLoadModule('/src/physics/game.js');
  const { formatQuantity: fq } = await server.ssrLoadModule('/src/physics/format.js');

  const esc = (s) => String(s ?? '');
  const list = (items) => (items?.length ? `<ul>${items.map((i) => `<li>${esc(i)}</li>`).join('')}</ul>` : '');

  function question(q, kind) {
    let body = `<p class="q"><strong>${esc(q.id)}</strong> ${esc(q.prompt)}</p>`;
    if (kind === 'predict') {
      body += list(q.options.map((o) => o.text));
      body += '<p class="a">Not marked. Students commit an answer with a reason before the run shows what happens.</p>';
      return body;
    }
    switch (q.type) {
      case 'numeric':
        body += `<p class="a">Answer: ${fq(q.answer, q.unit, 3)}</p>`;
        if (q.mistakes?.length) body += `<p>Feedback for known mistakes:</p>${list(q.mistakes.map((m) => `${fq(m.value, q.unit, 3)}. ${m.feedback}`))}`;
        break;
      case 'mcq':
      case 'mcqReason':
        body += list(q.options.map((o) => `${o.correct ? '<strong>Right.</strong> ' : ''}${o.text} <em>${esc(o.feedback)}</em>`));
        break;
      case 'short':
        body += `<p class="a">Model answer: ${esc(q.model)}</p><p>Key ideas checked:</p>${list(q.keyIdeas.map((k) => `${k.any.join(' or ')}`))}`;
        break;
      case 'cloze':
        body += `<div>${esc(q.text)}</div><p class="a">Answers: ${q.blanks.map((b) => `${b.id} = ${b.answer}`).join(', ')}</p>`;
        break;
      case 'match':
      case 'label':
        body += list(q.pairs.map((p) => `${p.item}: <strong>${q.choices.find((c) => c.id === p.answer)?.text ?? p.answer}</strong>`));
        break;
      case 'order':
        body += `<p class="a">Order:</p><ol>${q.order.map((id) => `<li>${q.items[id]}</li>`).join('')}</ol>`;
        break;
      default:
    }
    return body;
  }

  let html = '';
  const toc = [];
  for (const entry of LESSONS.filter((l) => !l.hidden)) {
    const lesson = (await entry.load()).default;
    if (!lesson?.pages) continue;
    toc.push(`<li><a href="#${lesson.id}">${entry.number ? `${entry.number}. ` : ''}${lesson.title}</a></li>`);
    html += `<section id="${lesson.id}"><h2>${entry.number ? `Lesson ${entry.number}. ` : ''}${lesson.title}</h2>`;
    html += `<p><strong>Syllabus:</strong> ${lesson.syllabus.join(', ')}</p>`;
    html += `<p><strong>Today's questions</strong></p>${list(lesson.questions)}`;
    lesson.pages.forEach((p, i) => {
      html += `<article class="page"><h3>Page ${i + 1}. ${esc(p.title)} <span class="type">${p.type}</span></h3>`;
      html += (p.text ?? []).map((t) => `<p>${typeof t === 'function' ? '' : t}</p>`).join('');
      if (p.steps) html += `<ol>${p.steps.map((s) => `<li>${s}</li>`).join('')}</ol>`;
      if (p.goal) html += `<p><em>Task:</em> ${p.goal}</p>`;
      if (p.after) html += p.after.map((t) => `<p>${t}</p>`).join('');
      if (p.question) html += question(p.question, p.type);
      for (const q of p.questions ?? []) html += question(q, p.type);
      if (p.type === 'game') {
        const L = game.LEVELS[p.level - 1];
        const { least, wins } = game.solve(L);
        const setting = Object.entries(least.inputs).map(([k, v]) => `${k} ${v}`).join(', ');
        html += `<p>${L.story}</p><p class="a">Target needs ${fq(least.need, 'J', 3)}. Losses ${fq(least.totalLost, 'J', 3)}. Least input ${fq(least.totalIn, 'J', 3)} with ${setting}. Winning settings: ${wins.length}.</p>`;
      }
      if (p.note) html += `<p class="note">${p.note}</p>`;
      html += '</article>';
    });
    html += '</section>';
  }

  const sources = Object.entries(SOURCES).map(([, s]) => `<li>${s.fact} <em>${s.source}</em>${s.url ? ` <a href="${s.url}">${s.url}</a>` : ''}${s.checked ? ` (checked ${s.checked})` : ''}${s.note ? ` ${s.note}` : ''}</li>`).join('');
  const glossary = Object.values(GLOSSARY).map((g) => `<dt>${g.term}</dt><dd>${g.meaning}</dd>`).join('');

  const page = `<!doctype html>
<html lang="en-SG">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>The Energy Ledger: teachers' page</title>
<style>
  body { font: 17px/1.5 Georgia, 'Times New Roman', serif; color: #1E1B24; background: #F4EEDF; max-width: 860px; margin: 0 auto; padding: 24px 16px; }
  h1 { font-weight: 600; margin-bottom: 0; }
  h2 { border-top: 2px solid #1E1B24; padding-top: 12px; margin-top: 36px; }
  h3 { font-size: 1.05em; margin: 18px 0 6px; }
  .type { font: 12px system-ui, sans-serif; text-transform: uppercase; letter-spacing: 0.06em; background: #1E1B24; color: #F4EEDF; padding: 1px 6px; border-radius: 3px; vertical-align: 2px; }
  .page { border-left: 3px solid #D9CFB8; padding-left: 12px; }
  .q { margin-bottom: 2px; }
  .a { background: #fff8e6; padding: 4px 8px; border-left: 4px solid #2f7d4f; }
  .note { font-style: italic; }
  table { border-collapse: collapse; } td, th { border: 1px solid #888; padding: 2px 6px; }
  a { color: #7a3d0a; }
  @media print { body { background: #fff; font-size: 12pt; } h2 { page-break-before: always; } .page { break-inside: avoid; } }
</style>
</head>
<body>
<h1>The Energy Ledger: teachers' page</h1>
<p>Every lesson's text, questions, answers and feedback, built from the same data as the book. It works without WebGL and prints cleanly.</p>
<p><a href="./index.html">Open the book</a></p>
<h2>Contents</h2><ol>${toc.join('')}</ol>
${html}
<h2>Glossary</h2><dl>${glossary}</dl>
<h2>Sources</h2><ul>${sources}</ul>
</body>
</html>
`;
  writeFileSync('teachers.html', page);
  if (existsSync('dist') || mkdirSync('dist', { recursive: true })) writeFileSync('dist/teachers.html', page);
  console.log(`teachers.html built (${(page.length / 1024).toFixed(0)} kB).`);
} finally {
  await server.close();
}
