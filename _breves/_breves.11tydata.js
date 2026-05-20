// Données par défaut appliquées à toutes les brèves dans _breves/
// Permalink calculé pour inclure la date dans l'URL (cohérence avec le nom de fichier)
module.exports = {
  layout: "layouts/breve.njk",
  tags: ["breve"],
  eleventyComputed: {
    permalink: data => {
      const name = data.page.inputPath
        .replace(/^\.\/_breves\//, "")
        .replace(/\.md$/, "");
      return `/breves/${name}/`;
    }
  }
};
