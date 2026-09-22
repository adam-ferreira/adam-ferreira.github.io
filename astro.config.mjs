// @ts-check
import { defineConfig } from 'astro/config';

export default defineConfig({
  site: 'https://adam-ferreira.github.io',   // dépôt « <nom>.github.io » : pas de base à configurer
  build: {
    inlineStylesheets: 'always',   // la feuille est intégrée à la page : un aller-retour réseau de moins avant le premier affichage
  },
  vite: {
    build: { assetsInlineLimit: 0 },   // aucun fichier transformé en data: URI — chacun garde son adresse versionnée, mise en cache à part
  },
});
