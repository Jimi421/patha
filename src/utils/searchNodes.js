// ─────────────────────────────────────────────
//  Node search — in-memory, ranked, content-aware
//  Searches across id, title, body, cmd, warn, aliases.
//  No backend: nodes are already bundled by loadNodes.js.
// ─────────────────────────────────────────────
import { nodes } from "./loadNodes";

// Build a flat searchable index once at module load.
// Each entry keeps the raw fields so we can rank by WHERE the match hit.
const INDEX = Object.entries(nodes).map(([id, n]) => ({
  id,
  title: n.title || "",
  phase: n.phase || "",
  body: n.body || "",
  cmd: n.cmd || "",
  warn: n.warn || "",
  aliases: Array.isArray(n.aliases) ? n.aliases.join(" ") : "",
  // Precomputed lowercase haystacks for speed
  _id: id.toLowerCase(),
  _title: (n.title || "").toLowerCase(),
  _phase: (n.phase || "").toLowerCase(),
  _body: (n.body || "").toLowerCase(),
  _cmd: (n.cmd || "").toLowerCase(),
  _warn: (n.warn || "").toLowerCase(),
  _aliases: (Array.isArray(n.aliases) ? n.aliases.join(" ") : "").toLowerCase(),
}));

// Field weights — a hit in the title matters far more than one buried in cmd.
const W = { title: 100, id: 80, aliases: 70, warn: 30, body: 20, cmd: 12, phase: 15 };

// Return a short snippet of context around the first match in a field.
function snippet(text, q, len = 90) {
  const i = text.toLowerCase().indexOf(q);
  if (i === -1) return "";
  const start = Math.max(0, i - len / 3);
  const end = Math.min(text.length, i + q.length + (len * 2) / 3);
  let s = text.slice(start, end).replace(/\n/g, " ").trim();
  if (start > 0) s = "…" + s;
  if (end < text.length) s = s + "…";
  return s;
}

// Multi-term AND search: every whitespace-separated term must match somewhere.
// Score = sum of best field weight per term. Results sorted desc.
export function searchNodes(query, limit = 12) {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  const terms = q.split(/\s+/).filter(Boolean);

  const results = [];
  for (const e of INDEX) {
    let score = 0;
    let matchedAllTerms = true;
    let snippetField = "";
    let snippetSrc = "";

    for (const t of terms) {
      let best = 0;
      if (e._title.includes(t)) best = Math.max(best, W.title);
      if (e._id.includes(t)) best = Math.max(best, W.id);
      if (e._aliases.includes(t)) best = Math.max(best, W.aliases);
      if (e._phase.includes(t)) best = Math.max(best, W.phase);
      if (e._warn.includes(t)) { best = Math.max(best, W.warn); if (!snippetSrc) { snippetSrc = e.warn; } }
      if (e._body.includes(t)) { best = Math.max(best, W.body); if (!snippetSrc) { snippetSrc = e.body; } }
      if (e._cmd.includes(t)) { best = Math.max(best, W.cmd); if (!snippetSrc) { snippetSrc = e.cmd; } }
      if (best === 0) { matchedAllTerms = false; break; }
      score += best;
    }

    if (!matchedAllTerms) continue;

    // Bonus: exact title/id equality floats canonical nodes to the very top.
    if (e._title === q || e._id === q) score += 500;
    // Bonus: title starts with the query (e.g. "ligolo" → Ligolo node).
    if (e._title.startsWith(q) || e._id.startsWith(q)) score += 60;

    // Build a snippet from the best available source for the first term.
    const firstTerm = terms[0];
    let snip =
      snippet(e.body, firstTerm) ||
      snippet(e.warn, firstTerm) ||
      snippet(e.cmd, firstTerm) ||
      "";

    results.push({ id: e.id, title: e.title, phase: e.phase, score, snippet: snip });
  }

  results.sort((a, b) => b.score - a.score);
  return results.slice(0, limit);
}
