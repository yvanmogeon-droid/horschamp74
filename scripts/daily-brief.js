const axios = require('axios');
const xml2js = require('xml2js');

const RSS_URLS = [
  // Sujets variés en requêtes séparées pour éviter qu'un seul sujet domine le flux
  'https://news.google.com/rss/search?q=Haute-Savoie+animaux&hl=fr&gl=FR&ceid=FR:fr',
  'https://news.google.com/rss/search?q=Haute-Savoie+montagne+sentier&hl=fr&gl=FR&ceid=FR:fr',
  'https://news.google.com/rss/search?q=Haute-Savoie+rivière+lac&hl=fr&gl=FR&ceid=FR:fr',
  'https://news.google.com/rss/search?q=Haute-Savoie+déchets+propreté&hl=fr&gl=FR&ceid=FR:fr',
  'https://news.google.com/rss/search?q=Haute-Savoie+forêt+biodiversité&hl=fr&gl=FR&ceid=FR:fr',
  'https://news.google.com/rss/search?q=Haute-Savoie+agriculture+alpage&hl=fr&gl=FR&ceid=FR:fr',
  'https://news.google.com/rss/search?q=Annecy+OR+Chamonix+OR+Thonon+environnement&hl=fr&gl=FR&ceid=FR:fr',
  'https://news.google.com/rss/search?q=Haute-Savoie+initiative+OR+solidarité+OR+bénévole&hl=fr&gl=FR&ceid=FR:fr',
  // ── Extension AURA + nouvelles rubriques (décision 04/06/2026) ──
  'https://news.google.com/rss/search?q=Léman+OR+Annecy+OR+Bourget+lac+eau&hl=fr&gl=FR&ceid=FR:fr',
  'https://news.google.com/rss/search?q=Auvergne-Rhône-Alpes+eau+sécheresse+OR+nappe&hl=fr&gl=FR&ceid=FR:fr',
  'https://news.google.com/rss/search?q=Auvergne-Rhône-Alpes+énergie+barrage+OR+hydrogène+OR+solaire&hl=fr&gl=FR&ceid=FR:fr',
  'https://news.google.com/rss/search?q=Alpes+glacier+OR+climat+OR+enneigement&hl=fr&gl=FR&ceid=FR:fr',
  'https://news.google.com/rss/search?q=Auvergne-Rhône-Alpes+intelligence+artificielle+OR+data+center&hl=fr&gl=FR&ceid=FR:fr',
  'https://news.google.com/rss/search?q=Léman+Express+OR+frontaliers+transport&hl=fr&gl=FR&ceid=FR:fr',
  'https://news.google.com/rss/search?q=Auvergne-Rhône-Alpes+train+OR+vélo+OR+covoiturage&hl=fr&gl=FR&ceid=FR:fr',
  'https://news.google.com/rss/search?q=Savoie+OR+Isère+OR+Ain+environnement+OR+pollution&hl=fr&gl=FR&ceid=FR:fr',
];
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const RESEND_API_KEY = process.env.RESEND_API_KEY;
const GITHUB_TOKEN = process.env.GH_PAT || process.env.GITHUB_TOKEN;
const UNSPLASH_ACCESS_KEY = process.env.UNSPLASH_ACCESS_KEY;
const GITHUB_REPO = 'yvanmogeon-droid/horschamp74';
const DESTINATAIRE = 'yvan.mogeon@gmail.com';
const EXPEDITEUR = 'onboarding@resend.dev';

const PROMPT_REDACTIONNEL = `Tu es le rédacteur du média local 'Hors Champ 74'. Son territoire : la région Auvergne-Rhône-Alpes, regardée depuis la Haute-Savoie — « La région, vue du 74 ». Ton ton est direct, piquant, détaché, jamais complaisant, jamais moralisateur. Tu écris pour des gens du coin, pas pour des élus.

MISSION : Parcours ce flux et trouve UN article qui touche à l'un de ces sujets larges en Auvergne-Rhône-Alpes — à pertinence égale, priorité à la Haute-Savoie et aux Pays de Savoie : environnement, nature, montagne, faune, pollution, déchets, propreté, recyclage, animaux, rivières, forêts, agriculture, biodiversité, météo ; eau (lacs, Léman, nappes, sécheresse, neige artificielle) ; énergie et climat (barrages, hydrogène, solaire, glaciers, rénovation) ; technologies et IA UNIQUEMENT quand elles touchent le territoire (capteurs environnementaux, data centers et leur consommation d'eau ou d'énergie, IA de prévision montagne, startups locales — jamais de tech hors-sol ou d'actu produit mondiale) ; mobilité (Léman Express, frontaliers, trains, vélo, covoiturage) ; ou tout sujet touchant au vivant et au territoire. Sois généreux : un fait divers impliquant un animal, une décision de mairie sur la propreté, un événement nature, un sentier dégradé, une espèce observée, une rivière surveillée — tout ça compte. Si vraiment RIEN ne touche à ces thèmes, réponds UNIQUEMENT : AUCUN SUJET.

SINON, rédige une brève dans cette structure exacte :

TITRE (en majuscules, percutant, max 10 mots)

Premier paragraphe : le fait brut, où, quoi, qui. Maximum 3 phrases.

Deuxième paragraphe : pourquoi c'est intéressant ou important pour les habitants. Maximum 2 phrases.

Chute : une question ou une observation piquante. 1 phrase.

Total : 120 à 150 mots. Pas de commentaire avant ou après la brève.

RUBRIQUE : À la toute fin de ta réponse, après la brève, ajoute une ligne exactement ainsi :
RUBRIQUE: <mot>
où <mot> est obligatoirement l'un de ces dix choix : pollution | dechets | animaux | good-news | montagne | curieux | eau | energie | tech-ia | mobilite
Choisis la rubrique la plus pertinente. Pas d'autre texte sur cette ligne.

SOURCE : À la toute fin, après RUBRIQUE, ajoute une ligne exactement ainsi :
SOURCE: <nom>
où <nom> est le nom court du média source (ex: Le Dauphiné, France 3, France Bleu, Le Messager...). Pas d'autre texte sur cette ligne.

IMAGE_QUERY: <termes>
où <termes> est une courte requête en anglais (3-5 mots) pour trouver une photo illustrant la brève sur Unsplash. Ex: "river pollution mountain", "wild animal rescue", "forest trail hiking". Pas d'autre texte sur cette ligne.

LIEU: <commune>
où <commune> est le nom exact de la commune ou du secteur géographique mentionné dans la brève (ex: Bonneville, Cluses, Annecy, Vallée de l'Arve). Si aucun lieu précis, écrire le département concerné, sinon: Auvergne-Rhône-Alpes. Pas d'autre texte sur cette ligne.

ARTICLE: <numéro>
où <numéro> est le numéro de l'article choisi. Pas d'autre texte sur cette ligne.`;

// ─── fetchRSS ─────────────────────────────────────────────────────────────────
async function fetchRSS() {
  console.log('📡 Récupération des flux RSS Google News...');
  // On récupère chaque flux séparément pour pouvoir les entrelacer ensuite
  const fluxParSource = [];
  for (const url of RSS_URLS) {
    try {
      const response = await axios.get(url, {
        timeout: 15000,
        headers: { 'User-Agent': 'Mozilla/5.0' }
      });
      const parser = new xml2js.Parser();
      const result = await parser.parseStringPromise(response.data);
      const items = result.rss.channel[0].item || [];
      fluxParSource.push(items.slice(0, 6)); // max 6 par thème
    } catch (e) {
      console.log('⚠️ Flux ignoré :', url, e.message);
      fluxParSource.push([]);
    }
  }
  // Entrelacement round-robin : 1er de chaque flux, puis 2e de chaque flux, etc.
  // Garantit que tous les thèmes sont représentés, pas seulement le premier.
  let allItems = [];
  const maxLen = Math.max(0, ...fluxParSource.map(f => f.length));
  for (let i = 0; i < maxLen; i++) {
    for (const flux of fluxParSource) {
      if (flux[i]) allItems.push(flux[i]);
    }
  }
  const seen = new Set();
  allItems = allItems.filter(item => {
    const titre = item.title?.[0] || '';
    if (seen.has(titre)) return false;
    seen.add(titre);
    return true;
  });
  console.log(`✅ ${allItems.length} articles récupérés au total (${fluxParSource.length} sources entrelacées)`);
  return allItems.slice(0, 24).map(item => {
    let image = '';
    const mediaContent = item['media:content'];
    const mediaThumbnail = item['media:thumbnail'];
    if (mediaContent?.[0]?.['$']?.url) image = mediaContent[0]['$'].url;
    else if (mediaThumbnail?.[0]?.['$']?.url) image = mediaThumbnail[0]['$'].url;
    return {
      titre: item.title?.[0] || '',
      description: item.description?.[0] || '',
      lien: item.link?.[0] || '',
      date: item.pubDate?.[0] || '',
      image,
    };
  });
}

// ─── fetchBrevesPubliees ───────────────────────────────────────────────────────
async function fetchBrevesPubliees() {
  try {
    const url = `https://raw.githubusercontent.com/${GITHUB_REPO}/main/breves.json?t=${Date.now()}`;
    const res = await axios.get(url, { timeout: 15000 });
    const breves = Array.isArray(res.data) ? res.data : JSON.parse(res.data);
    // On garde les 8 dernières pour le contexte anti-répétition
    return breves.slice(0, 8).map(b => ({ titre: b.titre || '', extrait: b.extrait || '' }));
  } catch (e) {
    console.log('⚠️ Impossible de lire les brèves publiées :', e.message);
    return [];
  }
}

// ─── buildUserMessage ─────────────────────────────────────────────────────────
function buildUserMessage(articles, dejaPublie) {
  const articlesText = articles.map((a, i) =>
    `--- Article ${i + 1} ---\nTitre : ${a.titre}\nDate : ${a.date}\nDescription : ${a.description}\nLien : ${a.lien}`
  ).join('\n\n');

  let histo = '';
  if (dejaPublie && dejaPublie.length) {
    const liste = dejaPublie.map((b, i) => `${i + 1}. ${b.titre} — ${b.extrait}`).join('\n');
    histo = `\n\n=== DÉJÀ PUBLIÉ CES DERNIERS JOURS (À NE PAS REPRENDRE) ===\n${liste}\n=== FIN DÉJÀ PUBLIÉ ===\n\nRÈGLE ABSOLUE : choisis un article dont le SUJET est différent de tout ce qui est listé ci-dessus. Même lieu OK, mais l'angle et le fait doivent être nouveaux. Si TOUS les articles du flux redisent un sujet déjà publié ci-dessus, réponds UNIQUEMENT : AUCUN SUJET.`;
  }

  return `Voici les articles du flux RSS Hors Champ 74 de ce matin :\n\n${articlesText}${histo}`;
}

// ─── callClaude ───────────────────────────────────────────────────────────────
async function callClaude(userMessage) {
  console.log('🤖 Appel Claude Haiku...');
  const response = await axios.post(
    'https://api.anthropic.com/v1/messages',
    {
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1024,
      system: PROMPT_REDACTIONNEL,
      messages: [{ role: 'user', content: userMessage }],
    },
    {
      headers: {
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      timeout: 30000,
    }
  );
  const texte = response.data.content[0].text.trim();
  console.log('📝 Réponse Claude :\n' + texte);
  return texte;
}

// ─── parseBreve ───────────────────────────────────────────────────────────────
function parseBreve(texte) {
  const lignes = texte.split('\n');
  let category = 'curieux';
  let source = '';
  let articleIndex = -1;
  let imageQuery = '';
  let lieu = 'Haute-Savoie';
  const lignesFiltrees = lignes.filter(l => {
    const mRub = l.match(/^RUBRIQUE\s*:\s*(\S+)/i);
    if (mRub) { category = mRub[1].toLowerCase().trim(); return false; }
    const mSrc = l.match(/^SOURCE\s*:\s*(.+)/i);
    if (mSrc) { source = mSrc[1].trim(); return false; }
    const mImg = l.match(/^IMAGE_QUERY\s*:\s*(.+)/i);
    if (mImg) { imageQuery = mImg[1].trim(); return false; }
    const mLieu = l.match(/^LIEU\s*:\s*(.+)/i);
    if (mLieu) { lieu = mLieu[1].trim(); return false; }
    const mArt = l.match(/^ARTICLE\s*:\s*(\d+)/i);
    if (mArt) { articleIndex = parseInt(mArt[1], 10) - 1; return false; }
    return true;
  });
  const breve = lignesFiltrees.join('\n').trim();
  return { breve, category, source, articleIndex, imageQuery, lieu };
}

// ─── fetchUnsplashImage ───────────────────────────────────────────────────────
async function fetchUnsplashImage(query) {
  if (!UNSPLASH_ACCESS_KEY || !query) return '';
  try {
    console.log(`🖼️ Recherche image Unsplash : "${query}"...`);
    const res = await axios.get('https://api.unsplash.com/photos/random', {
      params: {
        query,
        orientation: 'landscape',
        content_filter: 'high',
      },
      headers: {
        Authorization: `Client-ID ${UNSPLASH_ACCESS_KEY}`,
      },
      timeout: 10000,
    });
    const url = res.data?.urls?.regular || '';
    if (!url) { console.log('⚠️ Unsplash : aucune image trouvée'); return ''; }
    console.log(`✅ Image trouvée : ${url.slice(0, 60)}...`);
    return url;
  } catch (e) {
    console.log('⚠️ Unsplash indisponible :', e.message);
    return '';
  }
}

// ─── githubGet ────────────────────────────────────────────────────────────────
async function githubGet(path) {
  try {
    const res = await axios.get(
      `https://api.github.com/repos/${GITHUB_REPO}/contents/${path}`,
      {
        headers: { 'Authorization': `Bearer ${GITHUB_TOKEN}` },
        timeout: 15000,
      }
    );
    const content = Buffer.from(res.data.content, 'base64').toString('utf-8');
    return { content, sha: res.data.sha };
  } catch (e) {
    if (e.response?.status === 404) return null;
    throw e;
  }
}

// ─── githubPut ────────────────────────────────────────────────────────────────
async function githubPut(path, content, message, sha) {
  const body = {
    message,
    content: Buffer.from(content).toString('base64'),
  };
  if (sha) body.sha = sha;
  await axios.put(
    `https://api.github.com/repos/${GITHUB_REPO}/contents/${path}`,
    body,
    {
      headers: { 'Authorization': `Bearer ${GITHUB_TOKEN}`, 'Content-Type': 'application/json' },
      timeout: 15000,
    }
  );
}

// ─── getSlotDuJour ────────────────────────────────────────────────────────────
async function getSlotDuJour(datePrefix) {
  const slotA = `_breves/${datePrefix}-a.md`;
  const slotB = `_breves/${datePrefix}-b.md`;
  const existA = await githubGet(slotA);
  if (!existA) return { filename: slotA, slug: `${datePrefix}-a`, sha: null };
  const existB = await githubGet(slotB);
  if (!existB) return { filename: slotB, slug: `${datePrefix}-b`, sha: null };
  console.log('⚠️ 2 brèves déjà publiées aujourd\'hui — écrasement de -b');
  return { filename: slotB, slug: `${datePrefix}-b`, sha: existB.sha };
}

// ─── publishToSite ────────────────────────────────────────────────────────────
async function updateSignalements(slug, titre, lieu, date, url) {
  try {
    const existing = await githubGet('signalements.json');
    let sigs = [];
    if (existing) { try { sigs = JSON.parse(existing.content); } catch(e) { sigs = []; } }
    sigs = sigs.filter(s => s.slug !== slug);
    sigs.unshift({ slug, titre, lieu, date, url });
    sigs = sigs.slice(0, 200);
    await githubPut('signalements.json', JSON.stringify(sigs, null, 2),
      `MAJ signalements.json — ${lieu}`, existing?.sha);
    console.log('✅ signalements.json mis à jour —', lieu);
  } catch(e) {
    console.log('⚠️ signalements.json non mis à jour:', e.message);
  }
}

async function publishToSite(breve, category, source, image, lieu) {
  console.log('📤 Publication de la brève...');
  const lignes = breve.split('\n').filter(l => l.trim());
  const titre = lignes[0] || 'Brève Hors Champ 74';
  const corps = lignes.slice(1).join('\n').trim();
  const extrait = corps.replace(/\n/g, ' ').slice(0, 300);

  const now = new Date();
  const dateISO = now.toISOString().replace('Z', '+02:00').slice(0, 19) + '.000+02:00';
  const datePrefix = now.toISOString().slice(0, 10);

  const { filename, slug, sha: existingSha } = await getSlotDuJour(datePrefix);

  const imageField = image ? `\nimage: "${image}"` : '';
  const sourceField = source ? `\nsource: "${source}"` : '';
  const contenu = `---\ntitle: "${titre}"\ndate: ${dateISO}\ncategory: ${category}${sourceField}${imageField}\n---\n\n${corps}`;

  await githubPut(filename, contenu, `Brève automatique du ${now.toLocaleDateString('fr-FR')}`, existingSha);
  console.log(`✅ Brève publiée : ${filename}`);

  // Mise à jour breves.json
  console.log('📋 Mise à jour de breves.json...');
  const existing = await githubGet('breves.json');
  let breves = [];
  if (existing) {
    try { breves = JSON.parse(existing.content); } catch (e) { breves = []; }
  }

  const nouvelleEntree = {
    titre, slug, date: dateISO, datePrefix, category,
    source: source || '', image: image || '', extrait,
    lieu: lieu || '',
    url: `/breves/${slug}/`,
  };

  breves = breves.filter(b => b.slug !== slug);
  breves.unshift(nouvelleEntree);
  breves = breves.slice(0, 60);

  await githubPut(
    'breves.json',
    JSON.stringify(breves, null, 2),
    `MAJ breves.json — ${now.toLocaleDateString('fr-FR')}`,
    existing?.sha
  );
  console.log('✅ breves.json mis à jour');

  return { slug, datePrefix, titre, corps };
}

// ─── sendEmail ────────────────────────────────────────────────────────────────
async function sendEmail(breve, image, slug) {
  console.log('📧 Envoi du mail via Resend...');
  const lignes = breve.split('\n').filter(l => l.trim());
  const titre = lignes[0] || 'Brève Hors Champ 74';
  const corps = lignes.slice(1).join('\n').trim();
  const dateStr = new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
  const lienBreve = `https://horschamp74.fr/breves/${slug}/`;
  const imageBlock = image
    ? `<img src="${image}" alt="" style="width:100%; max-height:280px; object-fit:cover; border-radius:4px; margin-bottom:20px;">`
    : '';

  const htmlBody = `
  <div style="font-family: Georgia, serif; max-width: 600px; margin: 0 auto; padding: 24px; background:#faf7f2;">
    <div style="border-left: 3px solid #C4522A; padding-left: 16px; margin-bottom: 24px;">
      <small style="color: #7a736b; text-transform: uppercase; letter-spacing: 1px; font-size:11px;">Hors Champ 74 — ${dateStr}</small>
      <h1 style="font-size: 22px; line-height: 1.3; color: #1a1714; margin-top:8px;">${titre}</h1>
    </div>
    ${imageBlock}
    <div style="font-size: 16px; line-height: 1.75; color: #2c2825; white-space: pre-line;">${corps}</div>
    <div style="margin-top: 28px;">
      <a href="${lienBreve}" style="display:inline-block; background:#C4522A; color:#fff; padding:11px 22px; border-radius:2px; text-decoration:none; font-size:13px; letter-spacing:0.5px;">Lire la brève complète →</a>
    </div>
    <hr style="border: none; border-top: 1px solid #ddd5c8; margin: 32px 0 16px;">
    <small style="color: #c8c0b4; font-size:11px;">horschamp74.fr — Haute-Savoie, sans filtre</small>
  </div>`;

  await axios.post(
    'https://api.resend.com/emails',
    {
      from: EXPEDITEUR,
      to: [DESTINATAIRE],
      subject: `[Hors Champ 74] ${titre}`,
      html: htmlBody,
      text: breve,
    },
    {
      headers: { 'Authorization': `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      timeout: 15000,
    }
  );
  console.log('✅ Mail envoyé');
}

// ─── main ─────────────────────────────────────────────────────────────────────
async function main() {
  try {
    const articles = await fetchRSS();
    if (articles.length === 0) { console.log('⚠️ Flux RSS vide — arrêt.'); process.exit(0); }

    const dejaPublie = await fetchBrevesPubliees();
    console.log(`📚 ${dejaPublie.length} brèves déjà publiées chargées (anti-répétition)`);

    const userMessage = buildUserMessage(articles, dejaPublie);
    const texteRaw = await callClaude(userMessage);

    if (texteRaw.toUpperCase().includes('AUCUN SUJET')) {
      console.log('ℹ️ Claude : AUCUN SUJET — arrêt.');
      process.exit(0);
    }

    const { breve, category, source, articleIndex, imageQuery, lieu } = parseBreve(texteRaw);

    // Image : 1) RSS si disponible, 2) Unsplash avec la query de Claude, 3) vide
    let image = '';
    const articleChoisi = articleIndex >= 0 ? articles[articleIndex] : articles.find(a => a.image);
    if (articleChoisi?.image) {
      image = articleChoisi.image;
      console.log('🖼️ Image depuis RSS');
    } else if (imageQuery) {
      image = await fetchUnsplashImage(imageQuery);
      // Fallback si Unsplash ne trouve rien avec la query précise
      if (!image) {
        const fallbackQueries = ['nature haute-savoie mountain', 'french alps landscape', 'mountain nature france'];
        for (const q of fallbackQueries) {
          image = await fetchUnsplashImage(q);
          if (image) break;
        }
      }
    }

    const { slug, dateISO, titreBreve } = await publishToSite(breve, category, source, image, lieu);
    await updateSignalements(slug, titreBreve, lieu, dateISO, `/breves/${slug}/`);
    await sendEmail(breve, image, slug);
    console.log('🎉 Workflow terminé avec succès.');
  } catch (err) {
    console.error('❌ Erreur :', err.response?.data || err.message);
    process.exit(1);
  }
}

main();
