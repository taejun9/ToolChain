import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { defineConfig } from 'vitest/config'
import vue from '@vitejs/plugin-vue'
import tailwind from '@tailwindcss/vite'
import { registry } from './src/tools/registry.ts'
import templates from './src/features/templates.json' with { type: 'json' }

const resolvePackage = createRequire(import.meta.url).resolve

export default defineConfig({
  plugins: [
    vue(),
    tailwind(),
    {
      name: 'crawler-metadata',
      apply: 'build',
      generateBundle() {
        const license = ['LICENSE', 'codec/LICENSE.codec.md']
          .map((path) =>
            readFileSync(resolvePackage('@jsquash/webp/' + path), 'utf8'),
          )
          .join('\n\n')
        this.emitFile({
          type: 'asset',
          fileName: 'webp-licenses.txt',
          source: license,
        })
        const configured = process.env.SITE_URL
        const site = configured ? new URL(configured) : null
        if (
          site &&
          (site.protocol !== 'https:' ||
            site.pathname !== '/' ||
            site.search ||
            site.hash ||
            site.username ||
            site.password)
        ) {
          this.error('SITE_URL must be an HTTPS origin.')
        }
        const paths = [
          '/',
          '/tools',
          '/templates',
          ...registry.list().map((tool) => '/tools/' + tool.id),
          ...templates.map((template) => '/templates/' + template.id),
        ]
        const urls = site
          ? paths
              .map(
                (path) =>
                  '<url><loc>' + new URL(path, site).href + '</loc></url>',
              )
              .join('\n')
          : ''
        this.emitFile({
          type: 'asset',
          fileName: 'sitemap.xml',
          source:
            '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">' +
            urls +
            '</urlset>\n',
        })
        this.emitFile({
          type: 'asset',
          fileName: 'robots.txt',
          source:
            'User-agent: *\nDisallow: /editor\nDisallow: /workflows\nDisallow: /settings\n' +
            (site
              ? 'Sitemap: ' + new URL('/sitemap.xml', site).href + '\n'
              : ''),
        })
      },
    },
  ],
  worker: { format: 'es' },
  test: { include: ['tests/**/*.test.ts'], environment: 'jsdom' },
})
