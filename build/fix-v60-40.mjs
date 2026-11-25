// v60.40 : conditions de combat du tableau des faiblesses (météo, terrains, objets, Gravité, Téra).
// Idempotent : node fix-v60-40.mjs
// Pas de nouveau fichier dans docs/data (logique dans docs/app.js, bloc FIELDEFF). Ne pas lancer build-data.mjs.
if (import.meta.url === `file://${process.argv[1]}` || process.argv[1] && process.argv[1].endsWith('fix-v60-40.mjs')) {
  console.log('v60.40 : pas de fichier de données à régénérer (règles dans docs/app.js, bloc FIELDEFF)');
}
