import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import fs from "node:fs";
import path from "node:path";

const DEFAULT_SITE_URL = "https://redms-deal-analyzer.vercel.app";

function seoPlugin() {
  let siteUrl = DEFAULT_SITE_URL;
  let outDir = "dist";

  return {
    name: "seo-index-robots-sitemap",
    configResolved(config) {
      const env = loadEnv(config.mode, process.cwd(), "");
      siteUrl = (env.VITE_SITE_URL || DEFAULT_SITE_URL).replace(/\/$/, "");
      outDir = path.resolve(config.root, config.build.outDir);
    },
    transformIndexHtml(html) {
      return html.replaceAll("__SEO_SITE_URL__", siteUrl);
    },
    closeBundle() {
      const robots = `User-agent: *\nAllow: /\n\nSitemap: ${siteUrl}/sitemap.xml\n`;
      const paths = ["/", "/demo", "/terms", "/privacy", "/login"];
      const urlEntries = paths
        .map((p) => `  <url>\n    <loc>${siteUrl}${p === "/" ? "/" : p}</loc>\n  </url>`)
        .join("\n");
      const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urlEntries}
</urlset>
`;
      fs.mkdirSync(outDir, { recursive: true });
      fs.writeFileSync(path.join(outDir, "robots.txt"), robots);
      fs.writeFileSync(path.join(outDir, "sitemap.xml"), sitemap);
    },
  };
}

export default defineConfig({
  plugins: [react(), seoPlugin()],
  test: {
    environment: "jsdom",
    globals: true,
  },
});
