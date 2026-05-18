const axios = require('axios');
const xml2js = require('xml2js');

const RSS_URL = 'https://rss.app/feeds/_G5YovYqc7NASlxR5.xml';
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const RESEND_API_KEY = process.env.RESEND_API_KEY;
const DESTINATAIRE = 'yvan.mogeon@gmail.com';
const EXPEDITEUR = 'onboarding@resend.dev';

const PROMPT_REDACTIONNEL = `Tu es le rédacteur du média local 'Hors Champ 74' en Haute-Savoie. Ton ton est direct, piquant, détaché, jamais complaisant, jamais moralisateur. Tu écris pour des gens du coin, pas pour des élus.

MISSION : Parcours ce flux et trouve UN article qui touche à l'un de ces sujets larges en Haute-Savoie : environnement, nature, montagne, faune, pollution, déchets, propreté, recyclage, animaux, eau, rivières, forêts, agriculture, biodiversité, météo, ou tout sujet touchant au vivant et au territoire. Sois généreux : un fait divers impliquant un animal, une décision de mairie sur la propreté, un événement nature, un sentier dégradé, une espèce observée, une rivière surveillée — tout ça compte. Si vraiment RIEN ne touche à ces thèmes, réponds UNIQUEMENT : AUCUN SUJET.

SINON, rédige une brève dans cette structure exacte :

TITRE (en majuscules, percutant, max 10 mots)

Premier paragraphe : le fait brut, où, quoi, qui. Maximum 3 phrases.

Deuxième paragraphe : pourquoi c'est intéressant ou important pour les habitants. Maximum 2 phrases.

Chute : une question ou une observation piquante. 1 phrase.

Total : 120 à 150 mots. Pas de commentaire avant ou après la brève.`;

async function fetchRSS() {
  console.log('📡 Récupération du flux RSS...');
  const response = await axios.get(RSS_URL, {
    timeout: 15000,
    headers: { 'User-Agent': 'HorsChamp74-Bot/1.0' }
  });
  console.log('📦 Status HTTP:', response.status);
  console.log('📝 Début contenu:', response.data.substring(0, 300));
  const parser = new xml2js.Parser();
  const result = await parser.parseStringPromise(response.data);
  const items = result.rss.channel[0].item || [];
  console.log(`✅ ${items.length} articles récupérés`);
  return items.slice(0, 20).map(item => ({
    titre: item.title?.[0] || '',
    description: item.description?.[0] || '',
    lien: item.link?.[0] || '',
    date: item.pubDate?.[0] || '',
  }));
}

function buildUserMessage(articles) {
  const articlesText = articles.map((a, i) =>
    `--- Article ${i + 1} ---\nTitre : ${a.titre}\nDate : ${a.date}\nDescription : ${a.description}\nLien : ${a.lien}`
  ).join('\n\n');
  return `Voici les articles du flux RSS Hors Champ 74 de ce matin :\n\n${articlesText}`;
}

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

async function sendEmail(breve) {
  console.log('📧 Envoi du mail via Resend...');
  const lignes = breve.split('\n').filter(l => l.trim());
  const titre = lignes[0] || 'Brève Hors Champ 74';
  const corps = lignes.slice(1).join('\n').trim();
  const dateStr = new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });

  const htmlBody = `
    <div style="font-family: Georgia, serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="border-left: 4px solid #2d6a4f; padding-left: 16px; margin-bottom: 20px;">
        <small style="color: #888; text-transform: uppercase; letter-spacing: 1px;">Hors Champ 74 — Brève du ${dateStr}</small>
      </div>
      <h1 style="font-size: 22px; line-height: 1.3; color: #1a1a1a;">${titre}</h1>
      <div style="font-size: 16px; line-height: 1.7; color: #333; white-space: pre-line;">${corps}</div>
      <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
      <small style="color: #aaa;">horschamp74.fr — Haute-Savoie, sans filtre</small>
    </div>
  `;

  const response = await axios.post(
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
  console.log(`✅ Mail envoyé — ID : ${response.data.id}`);
}

async function main() {
  try {
    const articles = await fetchRSS();
    if (articles.length === 0) {
      console.log('⚠️ Flux RSS vide — arrêt.');
      process.exit(0);
    }
    const userMessage = buildUserMessage(articles);
    const breve = await callClaude(userMessage);
    if (breve.toUpperCase().includes('AUCUN SUJET')) {
      console.log('ℹ️ Claude : AUCUN SUJET — pas de mail envoyé.');
      process.exit(0);
    }
    await sendEmail(breve);
    console.log('🎉 Workflow terminé avec succès.');
  } catch (err) {
    console.error('❌ Erreur :', err.response?.data || err.message);
    process.exit(1);
  }
}

main();
