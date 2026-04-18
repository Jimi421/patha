// Auto-load all node JSON files at build time.
// Vite's import.meta.glob scans the directory and inlines everything.
// No runtime fetch — all nodes are bundled with the app.

const nodeModules = import.meta.glob('../data/nodes/*.json', { eager: true });
import phasesData from '../data/phases.json';

// Build the nodes object by id
export const nodes = Object.values(nodeModules).reduce((acc, mod) => {
  const node = mod.default;
  if (!node || !node.id) {
    console.error('Node missing id field:', mod);
    return acc;
  }
  // Strip id from the stored node (keep same shape as old object)
  const { id, ...rest } = node;
  acc[id] = rest;
  return acc;
}, {});

export const PHASES = phasesData;

// Dev-time validation (logs to console but doesn't break app)
if (import.meta.env && import.meta.env.DEV) {
  const nodeIds = Object.keys(nodes);
  const deadLinks = [];
  const undefinedPhases = [];

  for (const [id, node] of Object.entries(nodes)) {
    if (node.choices) {
      for (const c of node.choices) {
        if (c.next && !nodes[c.next]) {
          deadLinks.push(`${id} -> ${c.next}`);
        }
      }
    }
    if (node.phase && !PHASES[node.phase]) {
      undefinedPhases.push(`${id}: ${node.phase}`);
    }
  }

  console.log(`[The Path] Loaded ${nodeIds.length} nodes, ${Object.keys(PHASES).length} phases`);
  if (deadLinks.length) console.warn(`[The Path] Dead links:`, deadLinks);
  if (undefinedPhases.length) console.warn(`[The Path] Undefined phases:`, undefinedPhases);
}
