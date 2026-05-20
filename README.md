# Hors Champ 74

Site et brèves quotidiennes du média local **Hors Champ 74** en Haute-Savoie.

🌐 [horschamp74.fr](https://horschamp74.fr)

## Stack

- **Eleventy** (générateur de site statique) pour rendre les brèves Markdown en pages web
- **GitHub Actions** pour le build et le déploiement automatique sur GitHub Pages
- **Resend** pour l'envoi quotidien des brèves par email
- **Anthropic Claude API** pour la rédaction automatique
- **Decap CMS** (`/admin`) pour l'édition assistée

## Structure

- `_breves/` — brèves quotidiennes au format Markdown (générées auto + éditables via Decap)
- `_includes/layouts/` — templates Nunjucks (layout de page de brève)
- `scripts/daily-brief.js` — script de génération quotidienne (RSS → Claude → fichier MD + email)
- `.github/workflows/` — workflows GitHub Actions (build Eleventy + génération de brève quotidienne)
- `admin/` — interface Decap CMS
- Fichiers HTML à la racine — pages statiques du site (index, fil, coupgueule, etc.)

## Workflows

| Workflow | Déclencheur | Action |
| --- | --- | --- |
| `build-eleventy.yml` | Sur push vers `main` ou manuel | Build Eleventy + deploy GitHub Pages |
| `daily-brief.yml` | Cron tous les jours à 5h45 UTC | Génère la brève du jour, la pousse dans `_breves/` et l'envoie par mail |

## Lancement local

```bash
npm install
npm run build       # construit dans _site/
npm run serve       # serveur local avec hot-reload
```
