// ─────────────────────────────────────────────────────────────────────────────
// Hors Champ 74 — Publication manuelle d'une brève (par Yvan, via GitHub Actions)
// Reproduit EXACTEMENT le format de daily-brief.js : _breves/*.md + breves.json
// (+ signalements.json si un lieu est fourni, pour la carte)
// ─────────────────────────────────────────────────────────────────────────────
const axios = require('axios');

const GITHUB_TOKEN = process.env.GH_PAT || process.env.GITHUB_TOKEN;
const GITHUB_REPO = 'yvanmogeon-droid/horschamp74';

const RUBRIQUES = ['pollution','dechets','animaux','good-news','montagne','curieux','eau','energie','tech-ia','mobilite'];

// ─── Entrées (depuis le formulaire GitHub Actions) ───────────────────────────
const TITRE = (process.env.TITRE || '').trim();
const TEXTE = (process.env.TEXTE || '').trim();      // paragraphes séparés par |
const RUBRIQUE = (process.env.RUBRIQUE || 'curieux').trim().toLowerCase();
const LIEU = (process.env.LIEU || '').trim();
const SOURCE = (process.env.SOURCE || 'Hors Champ 74').trim();
const IMAGE_URL = (process.env.IMAGE_URL || '').trim();

// ─── GitHub helpers (identiques à daily-brief.js) ────────────────────────────
async function githubGet(path) {
  try {
    const res = await axios.get(
      `https://api.github.com/repos/${GITHUB_REPO}/contents/${path}`,
      { headers: { 'Authorization': `Bearer ${GITHUB_TOKEN}` }, timeout: 15000 }
    );
    const content = Buffer.from(res.data.content, 'base64').toString('utf-8');
    return { content, sha: res.data.sha };
  } catch (e) {
    if (e.response?.status === 404) return null;
    throw e;
  }
}

async function githubPut(path, content, message, sha) {
  const body = { message, content: Buffer.from(content).toString('base64') };
  if (sha) body.sha = sha;
  await axios.put(
    `https://api.github.com/repos/${GITHUB_REPO}/contents/${path}`,
    body,
    { headers: { 'Authorization': `Bearer ${GITHUB_TOKEN}`, 'Content-Type': 'application/json' }, timeout: 15000 }
  );
}

// ─── Slug depuis le titre ─────────────────────────────────────────────────────
function slugify(s) {
  return s.toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')   // accents
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 50);
}

// ─── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  if (!TITRE || !TEXTE) { console.error('❌ TITRE et TEXTE sont obligatoires.'); process.exit(1); }
  if (!RUBRIQUES.includes(RUBRIQUE)) {
    console.error(`❌ Rubrique "${RUBRIQUE}" inconnue. Choix : ${RUBRIQUES.join(' | ')}`);
    process.exit(1);
  }
  if (!GITHUB_TOKEN) { console.error('❌ Token GitHub manquant.'); process.exit(1); }

  const titre = TITRE.toUpperCase();                       // même style que les brèves auto
  const corps = TEXTE.split('|').map(p => p.trim()).filter(Boolean).join('\n\n');
  const extrait = corps.replace(/\n/g, ' ').slice(0, 300);

  const now = new Date();
  const dateISO = now.toISOString().replace('Z', '+02:00').slice(0, 19) + '.000+02:00';
  const datePrefix = now.toISOString().slice(0, 10);

  // Slug propre : date + titre — ne touche pas aux slots -a/-b du brief auto
  let slug = `${datePrefix}-${slugify(TITRE)}`;
  const filename = `_breves/${slug}.md`;
  const existing = await githubGet(filename);              // si déjà publié aujourd'hui : on met à jour

  const imageField = IMAGE_URL ? `\nimage: "${IMAGE_URL}"` : '';
  const sourceField = SOURCE ? `\nsource: "${SOURCE}"` : '';
  const contenu = `---\ntitle: "${titre.replace(/"/g, "'")}"\ndate: ${dateISO}\ncategory: ${RUBRIQUE}${sourceField}${imageField}\n---\n\n${corps}`;

  await githubPut(filename, contenu, `Brève manuelle — ${titre.slice(0, 50)}`, existing?.sha);
  console.log(`✅ Brève publiée : ${filename}`);

  // breves.json — même logique que le brief auto
  const idx = await githubGet('breves.json');
  let breves = [];
  if (idx) { try { breves = JSON.parse(idx.content); } catch (e) { breves = []; } }
  const entree = {
    titre, slug, date: dateISO, datePrefix, category: RUBRIQUE,
    source: SOURCE || '', image: IMAGE_URL || '', extrait,
    lieu: LIEU || '',
    url: `/breves/${slug}/`,
  };
  breves = breves.filter(b => b.slug !== slug);
  breves.unshift(entree);
  breves = breves.slice(0, 60);
  await githubPut('breves.json', JSON.stringify(breves, null, 2),
    `MAJ breves.json — brève manuelle`, idx?.sha);
  console.log('✅ breves.json mis à jour');

  // signalements.json (la carte) — uniquement si un lieu est fourni
  if (LIEU) {
    try {
      const sigIdx = await githubGet('signalements.json');
      let sigs = [];
      if (sigIdx) { try { sigs = JSON.parse(sigIdx.content); } catch (e) { sigs = []; } }
      sigs = sigs.filter(s => s.slug !== slug);
      sigs.unshift({ slug, titre, lieu: LIEU, date: dateISO, url: `/breves/${slug}/` });
      sigs = sigs.slice(0, 200);
      await githubPut('signalements.json', JSON.stringify(sigs, null, 2),
        `MAJ signalements.json — ${LIEU}`, sigIdx?.sha);
      console.log('✅ signalements.json mis à jour —', LIEU);
    } catch (e) {
      console.log('⚠️ signalements.json non mis à jour :', e.message);
    }
  }

  console.log(`\n🎉 Terminé. La brève sera visible après le rebuild du site (~2 min) : https://horschamp74.fr/breves/${slug}/`);
}

main().catch(e => { console.error('❌ Erreur :', e.message); process.exit(1); });
