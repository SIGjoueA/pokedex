// Weekly GO egg update: fetch the current Leek Duck pool, write it on the sheets (go.eg),
// and union it into docs/data/go-eggs.json under the current season. Past seasons are never removed.
// Usage: node update-go-eggs.mjs [--offline]   (--offline = use build/.cache/leekduck-eggs.txt, no fetch)
import { loadEggHistory, updateCurrentEggs } from './eggs.mjs';
const fetch = !process.argv.includes('--offline');
try {
  await updateCurrentEggs({ fetch, hist: loadEggHistory() || undefined, seasonsMeta: (loadEggHistory() || {}).seasons });
} catch (e) {
  if (fetch) { console.log('update-go-eggs : Leek Duck indisponible, historique inchangé (' + e.message + ')'); process.exit(0); }
  throw e;
}
