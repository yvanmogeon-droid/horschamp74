// Configuration Eleventy pour Hors Champ 74
// Génère le site à partir des .md de _breves/ et des fichiers HTML existants
module.exports = function(eleventyConfig) {
  // On limite ce qu'Eleventy traite comme template aux fichiers Nunjucks et Markdown.
  // Comme ça, les .html existants (index, fil, etc.) ne sont PAS interprétés comme
  // des templates et passent intacts par addPassthroughCopy.
  eleventyConfig.setTemplateFormats(["njk", "md"]);

  // Fichiers HTML statiques existants — copiés tels quels
  eleventyConfig.addPassthroughCopy("index.html");
  eleventyConfig.addPassthroughCopy("coupgueule.html");
  eleventyConfig.addPassthroughCopy("curieux.html");
  eleventyConfig.addPassthroughCopy("goodnews.html");
  eleventyConfig.addPassthroughCopy("montagne.html");
  eleventyConfig.addPassthroughCopy("fil.html");

  // Dossier admin (Decap CMS) — copié tel quel
  eleventyConfig.addPassthroughCopy("admin");

  // Dossier images (si présent)
  eleventyConfig.addPassthroughCopy("images");

  // CNAME pour le domaine personnalisé
  eleventyConfig.addPassthroughCopy("CNAME");

  // Filtre pour formatter les dates en français long
  eleventyConfig.addFilter("dateFR", function(date) {
    return new Date(date).toLocaleDateString("fr-FR", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric"
    });
  });

  // Filtre pour une date courte
  eleventyConfig.addFilter("dateCourte", function(date) {
    return new Date(date).toLocaleDateString("fr-FR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric"
    });
  });

  // Collection des brèves triées par date décroissante
  eleventyConfig.addCollection("breves", function(collectionApi) {
    return collectionApi.getFilteredByGlob("_breves/*.md").sort((a, b) => {
      return new Date(b.data.date) - new Date(a.data.date);
    });
  });

  return {
    dir: {
      input: ".",
      output: "_site",
      includes: "_includes",
      data: "_data"
    },
    markdownTemplateEngine: "njk"
  };
};
