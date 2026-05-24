const axios = require('axios');
const xml2js = require('xml2js');

const RSS_URLS = [
  'https://news.google.com/rss/search?q=Haute-Savoie+pollution+déchets+animaux&hl=fr&gl=FR&ceid=FR:fr',
  'https://news.google.com/rss/search?q=Haute-Savoie+nature+montagne+environnement&hl=fr&gl=FR&ceid=FR:fr',
  'https://news.google.com/rss/search?q=Haute-Savoie&hl=fr&gl=FR&ceid=FR:fr',
];
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const RESEND_API_KEY = process.env.RESEND_API_KEY;
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const GITHUB_REPO = 'yvanmogeon-droid/horschamp74';
const DESTINATAIRE = 'yvan.mogeon@gmail.com';
const EXPEDITEUR = 'onboarding@resend.dev';

const PROMPT_REDACTIONNEL = `Tu es le rédacteur du média local 'Hors Champ 74' en Haute-Savoie. Ton ton est direct, piquant, détaché, jamais complaisant, jamais moralisateur. Tu écris pour des gens du coin, pas pour des élus.

MISSION : Parcours ce flux et trouve UN article qui touche à l'un de ces sujets larges en Haute-Savoie : environnement, nature, montagne, faune, pollution, déchets, propreté, recyclage, animaux, eau, rivières, forêts, agriculture, biodiversité, météo, ou tout sujet touchant au vivant et au territoire. Sois généreux : un fait divers impliquant un animal, une décision de mairie sur la propreté, un événement nature, un sentier dégradé, une espèce observée, une rivière surveillée — tout ça compte. Si vraiment RIEN ne touche à ces thèmes, réponds UNIQUEMENT : AUCUN SUJET.

SINON, rédige une brève dans cette structure exacte :

TITRE (en majuscules, percutant, max 10 mots)

Premier paragraphe : le fait brut, où, quoi, qui. Maximum 3 phrases.

Deuxième paragraphe : pourquoi c'est intéressant ou important pour les habitants. Maximum 2 phrases.

Chute : une question ou une observation piquante. 1 phrase.

Total : 120 à 150 mots. Pas de commentaire avant ou après la brève.

RUBRIQUE : À la toute fin de ta réponse, après la brève, ajoute une ligne exactement ainsi :
RUBRIQUE: <mot>
où <mot> est obligatoirement l'un de ces six choix : pollution | dechets | animaux | good-news | montagne | curieux
Choisis la rubrique la plus pertinente. Pas d'autre texte sur cette ligne.`;

// ─── fetchRSS ─────────────────────────────────────────────────────────────────
async function fetchRSS() {
  console.log('📡 Récupération des flux RSS Google News...');
  let allItems = [];
  for (const url of RSS_URLS) {
    try {
      const response = await axios.get(url, {
        timeout: 15000,
        headers: { 'User-Agent': 'Mozilla/5.0' }
      });
      const parser = new xml2js.Parser();
      const result = await parser.parseStringPromise(response.data);
      const items = result.rss.channel[0].item || [];
      allItems = allItems.concat(items);
    } catch (e) {
      console.log('⚠️ Flux ignoré :', url, e.message);
    }
  }
  const seen = new Set();
  allItems = allItems.filter(item => {
    const titre = item.title?.[0] || '';
    if (seen.has(titre)) return false;
    seen.add(titre);
    return true;
  });
  console.log(`✅ ${allItems.length} articles récupérés au total`);
  return allItems.slice(0, 20).map(item => {
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

// ─── buildUserMessage ─────────────────────────────────────────────────────────
function buildUserMessage(articles) {
  const articlesText = articles.map((a, i) =>
    `--- Article ${i + 1} ---\nTitre : ${a.titre}\nDate : ${a.date}\nDescription : ${a.description}\nLien : ${a.lien}`
  ).join('\n\n');
  return `Voici les articles du flux RSS Hors Champ 74 de ce matin :\n\n${articlesText}`;
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
  const lignesFiltrees = lignes.filter(l => {
    const m = l.match(/^RUBRIQUE\s*:\s*(\S+)/i);
    if (m) {
      category = m[1].toLowerCase().trim();
      return false;
    }
    return true;
  });
  const breve = lignesFiltrees.join('\n').trim();
  return { breve, category };
}

// ─── githubGet ────────────────────────────────────────────────────────────────
// Lit un fichier GitHub et retourne { content, sha } ou null si inexistant
async function githubGet(path) {
  try {
    const res = await axios.get(
      `https://api.github.com/repos/${GITHUB_REPO}/contents/${path}`,
      {
        headers: {
          'Authorization': `Bearer ${GITHUB_TOKEN}`,
          'Content-Type': 'application/json',
        },
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
      headers: {
        'Authorization': `Bearer ${GITHUB_TOKEN}`,
        'Content-Type': 'application/json',
      },
      timeout: 15000,
    }
  );
}

// ─── publishToSite ────────────────────────────────────────────────────────────
async function publishToSite(breve, category, image) {
  console.log('📤 Publication de la brève...');
  const lignes = breve.split('\n').filter(l => l.trim());
  const titre = lignes[0] || 'Brève Hors Champ 74';
  const corps = lignes.slice(1).join('\n').trim();
  const extrait = corps.replace(/\n/g, ' ').slice(0, 160);

  const now = new Date();
  const dateISO = now.toISOString().replace('Z', '+02:00').slice(0, 19) + '.000+02:00';
  const datePrefix = now.toISOString().slice(0, 10);

  const slug = titre.toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .slice(0, 50);

  const filename = `_breves/${datePrefix}-${slug}.md`;
  const imageField = image ? `\nimage: "${image}"` : '';
  const contenu = `---\ntitle: "${titre}"\ndate: ${dateISO}\ncategory: ${category}${imageField}\n---\n\n${corps}`;

  await githubPut(filename, contenu, `Brève automatique du ${now.toLocaleDateString('fr-FR')}`);
  console.log(`✅ Brève publiée : ${filename}`);

  // ─── Mise à jour de breves.json ───────────────────────────────────────────
  console.log('📋 Mise à jour de breves.json...');
  const existing = await githubGet('breves.json');
  let breves = [];
  if (existing) {
    try { breves = JSON.parse(existing.content); } catch (e) { breves = []; }
  }

  // Ajouter la nouvelle brève en tête
  breves.unshift({
    titre,
    slug,
    date: dateISO,
    datePrefix,
    category,
    image: image || '',
    extrait,
    url: `/breves/${datePrefix}-${slug}/`,
  });

  // Garder les 60 dernières brèves max
  breves = breves.slice(0, 60);

  await githubPut(
    'breves.json',
    JSON.stringify(breves, null, 2),
    `MAJ breves.json — ${now.toLocaleDateString('fr-FR')}`,
    existing?.sha
  );
  console.log('✅ breves.json mis à jour');

  return { slug, datePrefix };
}

// ─── sendEmail ────────────────────────────────────────────────────────────────
async function sendEmail(breve, image, slug, datePrefix) {
  console.log('📧 Envoi du mail via Resend...');
  const lignes = breve.split('\n').filter(l => l.trim());
  const titre = lignes[0] || 'Brève Hors Champ 74';
  const corps = lignes.slice(1).join('\n').trim();
  const dateStr = new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
  const lienBreve = `https://horschamp74.fr/breves/${datePrefix}-${slug}/`;
  const imageBlock = image
    ? `<img src="${image}" alt="" style="width:100%; max-height:240px; object-fit:cover; border-radius:4px; margin-bottom:16px;">`
    : '';

  const htmlBody = `
  <div style="font-family: Georgia, serif; max-width: 600px; margin: 0 auto; padding: 20px;">
    <div style="border-left: 4px solid #2d6a4f; padding-left: 16px; margin-bottom: 20px;">
      <small style="color: #888; text-transform: uppercase; letter-spacing: 1px;">Hors Champ 74 — Brève du ${dateStr}</small>
      <h1 style="font-size: 22px; line-height: 1.3; color: #1a1a1a;">${titre}</h1>
    </div>
    ${imageBlock}
    <div style="font-size: 16px; line-height: 1.7; color: #333; white-space: pre-line;">${corps}</div>
    <div style="margin-top: 24px;">
      <a href="${lienBreve}" style="display:inline-block; background:#2d6a4f; color:#fff; padding:10px 20px; border-radius:4px; text-decoration:none; font-size:14px;">Lire l'article complet →</a>
    </div>
    <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
    <small style="color: #aaa;">horschamp74.fr — Haute-Savoie, sans filtre</small>
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
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      timeout: 15000,
    }
  );
  console.log('✅ Mail envoyé');
}

// ─── main ─────────────────────────────────────────────────────────────────────
async function main() {
  try {
    const articles = await fetchRSS();
    if (articles.length === 0) {
      console.log('⚠️ Flux RSS vide — arrêt.');
      process.exit(0);
    }
    const userMessage = buildUserMessage(articles);
    const texteRaw = await callClaude(userMessage);
    if (texteRaw.toUpperCase().includes('AUCUN SUJET')) {
      console.log('ℹ️ Claude : AUCUN SUJET — arrêt.');
      process.exit(0);
    }
    const { breve, category } = parseBreve(texteRaw);
    const image = articles.find(a => a.image)?.image || '';
    const { slug, datePrefix } = await publishToSite(breve, category, image);
    await sendEmail(breve, image, slug, datePrefix);
    console.log('🎉 Workflow terminé avec succès.');
  } catch (err) {
    console.error('❌ Erreur :', err.response?.data || err.message);
    process.exit(1);
  }
}

main();
