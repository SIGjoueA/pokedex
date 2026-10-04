// English / Japanese / romaji names for species and forms, built only from PokéAPI data (plus mechanical composition rules).
const L = (names, l) => names?.find(n => n.language.name === l)?.name;
export const jaOfNames = names => L(names, 'ja-hrkt') || L(names, 'ja') || '';
export const roOfNames = names => L(names, 'ja-roma') || '';

// ---- kana → Hepburn romaji (no macrons, same style as PokéAPI's "ja-roma": Lizardon, Mewtwo…)
const B = {
  ア: 'a', イ: 'i', ウ: 'u', エ: 'e', オ: 'o', カ: 'ka', キ: 'ki', ク: 'ku', ケ: 'ke', コ: 'ko', サ: 'sa', シ: 'shi', ス: 'su', セ: 'se', ソ: 'so',
  タ: 'ta', チ: 'chi', ツ: 'tsu', テ: 'te', ト: 'to', ナ: 'na', ニ: 'ni', ヌ: 'nu', ネ: 'ne', ノ: 'no', ハ: 'ha', ヒ: 'hi', フ: 'fu', ヘ: 'he', ホ: 'ho',
  マ: 'ma', ミ: 'mi', ム: 'mu', メ: 'me', モ: 'mo', ヤ: 'ya', ユ: 'yu', ヨ: 'yo', ラ: 'ra', リ: 'ri', ル: 'ru', レ: 're', ロ: 'ro', ワ: 'wa', ヲ: 'o', ン: 'n',
  ガ: 'ga', ギ: 'gi', グ: 'gu', ゲ: 'ge', ゴ: 'go', ザ: 'za', ジ: 'ji', ズ: 'zu', ゼ: 'ze', ゾ: 'zo', ダ: 'da', ヂ: 'ji', ヅ: 'zu', デ: 'de', ド: 'do',
  バ: 'ba', ビ: 'bi', ブ: 'bu', ベ: 'be', ボ: 'bo', パ: 'pa', ピ: 'pi', プ: 'pu', ペ: 'pe', ポ: 'po', ヴ: 'vu',
  ァ: 'a', ィ: 'i', ゥ: 'u', ェ: 'e', ォ: 'o', ヮ: 'wa',
};
const SMALL_Y = { ャ: 'a', ュ: 'u', ョ: 'o' }, SMALL_V = { ァ: 'a', ィ: 'i', ゥ: 'u', ェ: 'e', ォ: 'o' };
const toKata = s => s.replace(/[\u3041-\u3096]/g, c => String.fromCharCode(c.charCodeAt(0) + 96));
export function romanize(src) {
  const s = toKata(src.normalize('NFKC')); let out = '', dbl = false;
  const chars = [...s];
  for (let i = 0; i < chars.length; i++) {
    const c = chars[i], nx = chars[i + 1];
    if (c === 'ッ') { dbl = true; continue; }
    if (c === 'ー') { out = out.replace(/([aiueo])$/, m => ({ a: 'ā', i: 'ī', u: 'ū', e: 'ē', o: 'ō' })[m]); continue; }
    if (c === '(' || c === ')') { out += c === '(' ? ' (' : ')'; continue; }
    if (c === '・' || c === ' ' || c === '　') { out += ' '; continue; }
    if (/[A-Za-z0-9:'’.!?%\-♀♂]/.test(c)) { out += c; continue; }
    let r = B[c];
    if (!r) return null; // kanji or unknown symbol: do not guess
    if (nx && SMALL_Y[nx]) {
      r = /^(sh|ch|j)i$/.test(r) ? r.slice(0, -1) + SMALL_Y[nx] : r.slice(0, -1) + 'y' + SMALL_Y[nx]; i++;
    } else if (nx && SMALL_V[nx] && !'aiueo'.includes(r)) {
      const cons = r.replace(/[aiueo]$/, ''); r = (cons === 'ts' ? 'ts' : cons) + SMALL_V[nx]; i++;
    }
    if (dbl) { r = r.startsWith('ch') ? 't' + r : r[0] + r; dbl = false; }
    out += r;
  }
  return out.replace(/(%)(?=[a-z])/g, '$1 ').replace(/\s+/g, ' ').trim();
}
const capFirst = s => s.charAt(0).toUpperCase() + s.slice(1);
const title = s => s.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

const REGION_JA = /^(アローラ|ガラル|ヒスイ|パルデア)のすがた$/;

// Returns { en, ja, ro, jaSpecific } for one entry. `sp` = { en, ja, ro } of the species (or of the variety's base).
export function composeNames(e, sp) {
  const F = e.F, fnEn = L(F.form_names, 'en'), nmEn = L(F.names, 'en');
  const fnJa = jaOfNames(F.form_names) || jaOfNames(F.names);
  let en, ja = sp.ja, ro = sp.ro, jaSpecific = false;
  if (e.cat === 'base') return { en: sp.en, ja, ro, jaSpecific: true };
  en = nmEn || (fnEn ? `${sp.en} (${fnEn})` : `${sp.en} (${title(e.sfx)})`);
  if (fnJa) {
    jaSpecific = true;
    const idx = sp.ja ? fnJa.indexOf(sp.ja) : -1;
    const reg = fnJa.match(REGION_JA);
    if (idx >= 0) { // PokéAPI form name already contains the species name (メガフシギバナ, ヒートロトム…)
      ja = fnJa; const a = romanize(fnJa.slice(0, idx)), b = romanize(fnJa.slice(idx + sp.ja.length));
      ro = sp.ro && a !== null && b !== null ? [a && capFirst(a), sp.ro, b].filter(Boolean).join(' ') : null;
    } else if (reg && e.cat === 'reg') { // Alola/Galar/Hisui/Paldea + species, as in the games
      ja = reg[1] + sp.ja; const a = romanize(reg[1]); ro = sp.ro && a ? `${capFirst(a)} ${sp.ro}` : null;
    } else { // species + form label
      ja = `${sp.ja}（${fnJa}）`; const a = romanize(fnJa); ro = sp.ro && a ? `${sp.ro} (${a})` : null;
    }
  }
  return { en, ja, ro, jaSpecific };
}
