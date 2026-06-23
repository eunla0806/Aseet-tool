import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import fs from 'node:fs'
import type { IncomingMessage, ServerResponse } from 'node:http'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import type { ViteDevServer } from 'vite'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const dataRoot = path.resolve(__dirname, '..', 'data')
const bodyTemplateRoot = path.join(dataRoot, 'body template')
const clothingSampleRoot = path.join(dataRoot, 'clothing', 'outfit', 'skirt')

const templateAssetContentType = (filePath: string) => {
  const ext = path.extname(filePath).toLowerCase()

  if (ext === '.png') return 'image/png'
  if (ext === '.jpg' || ext === '.jpeg') return 'image/jpeg'
  if (ext === '.webp') return 'image/webp'
  if (ext === '.json') return 'application/json; charset=utf-8'

  return 'application/octet-stream'
}

const serveTemplateAssets = () => ({
  name: 'serve-template-assets',
  enforce: 'pre',
  configureServer(server: ViteDevServer) {
    server.middlewares.use((req: IncomingMessage, res: ServerResponse, next: () => void) => {
      const requestUrl = req.url?.split('?')[0] ?? ''
      if (!requestUrl.startsWith('/template/')) {
        next()
        return
      }

      const relativePath = decodeURIComponent(requestUrl)
        .replace(/^\/+/, '')
        .replace(/^template\/+/, '')
      const normalizedRelativePath = relativePath.replace(/\\/g, '/')

      let assetPath: string | null = null
      if (normalizedRelativePath.startsWith('body template/')) {
        assetPath = path.resolve(bodyTemplateRoot, normalizedRelativePath.replace(/^body template\/+/, ''))
      } else if (normalizedRelativePath.startsWith('Completed Template/')) {
        assetPath = path.resolve(clothingSampleRoot, normalizedRelativePath.replace(/^Completed Template\/+/, ''))
      } else {
        assetPath = path.resolve(dataRoot, normalizedRelativePath)
      }

      const allowedRoots = [dataRoot, bodyTemplateRoot, clothingSampleRoot]
      if (!allowedRoots.some((root) => assetPath.startsWith(root + path.sep) || assetPath === root)) {
        res.statusCode = 403
        res.end('Forbidden')
        return
      }

      if (!fs.existsSync(assetPath) || !fs.statSync(assetPath).isFile()) {
        next()
        return
      }

      res.setHeader('Content-Type', templateAssetContentType(assetPath))
      fs.createReadStream(assetPath).pipe(res)
    })
  },
})

// https://vite.dev/config/
export default defineConfig({
  plugins: [serveTemplateAssets(), react()],
})
