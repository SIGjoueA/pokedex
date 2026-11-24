// v60.31 : raids Téracristal 7★ événementiels d’Écarlate / Violet → docs/data/tera7.json
// Idempotent. Cache uniquement (pas d’appel réseau) : lancer update-tera7.mjs une première fois pour remplir le cache.
import { buildTera7, writeTera7 } from './update-tera7.mjs';

const data = buildTera7({ offline: true });
const w = writeTera7(data);
const keys = new Set(data.raids.map(r => r.k));
const wins = data.raids.reduce((n, r) => n + r.windows.length, 0);
console.log(`v60.31 tera7 : ${data.raids.length} raids, ${keys.size} espèces, ${wins} fenêtres, ${w.changed ? 'mis à jour' : 'inchangé'}`);
