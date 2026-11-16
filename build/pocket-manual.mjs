// v60.12: manual Pocket sources that no scraped source gives (run after fetch-pocket.mjs and pocket-promo-src.mjs; idempotent).
// - A1 283 Mew (immersive): not in any booster, reward of the hidden themed collection « Complétez le Pokédex de Kanto ! » (Poképédia « Mew (Puissance Génétique 283) », Bulbapedia).
//   Stored as set.x[localId] = free-text source, shown by the app when the card has no booster.
// - P-A 050 Mewtwo-ex (chromatique): shop, paid Poké Gold pack from 27/03/2025, ended (Poképédia « Mewtwo-ex (Promo-A 050) », Serebii, Pokéos).
// - P-B 103 Pikachu-ex (immersive, YOSHIROTTEN): reward of day 10 of « Missions Pikachu : Pika Pika ! » (20/10/2026 → 20/10/2027) (pokemon.com 20/10/2026, Serebii, Pokébip).
import fs from 'fs';
const F = new URL('../docs/data/pocket.json', import.meta.url);
const P = JSON.parse(fs.readFileSync(F)), S = Object.fromEntries(P.s.map(s => [s.id, s]));
const src = (sid, lid, label) => { const s = S[sid], c = s.cards.find(x => x[0] === lid); s.b ||= []; let i = s.b.indexOf(label); if (i < 0) i = s.b.push(label) - 1; c[6] = [i]; };
src('P-A', '050', 'Boutique (pack Poké Gold payant, mars–avril 2025, terminé)');
src('P-B', '103', 'Missions Pikachu : Pika Pika ! (10 jours de connexion)');
(S.A1.x ||= {})['283'] = 'Collection à thème « Complétez le Pokédex de Kanto ! » (au moins une carte de chacun des 150 Pokémon de Kanto de cette extension) ; elle ne se trouve dans aucun booster.';
fs.writeFileSync(F, JSON.stringify(P));
console.log('manual Pocket sources applied');
