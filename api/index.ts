import { VercelRequest, VercelResponse } from '@vercel/node';
import { readFileSync } from 'fs';
import { join } from 'path';
import { existsSync } from 'fs';

let serverCache: any;

async function getServer() {
  if (!serverCache) {
    try {
      const serverModule = await import('../dist/server/server.js');
      serverCache = serverModule.default;
    } catch (error) {
      console.error('Failed to load server module:', error);
      throw error;
    }
  }
  return serverCache;
}

const STATIC_EXTENSIONS = new Set(['.js', '.css', '.jpeg', '.jpg', '.png', '.svg', '.ico', '.woff', '.woff2', '.ttf', '.eot', '.map']);

function getStaticFile(pathname: string): Buffer | null {
  try {
    // Check if it's a static file
    const hasStaticExtension = STATIC_EXTENSIONS.has(
      pathname.substring(pathname.lastIndexOf('.'))
    );
    
    if (!hasStaticExtension) return null;

    // Resolve file path from dist/client
    let filePath = join(process.cwd(), 'dist', 'client', pathname);
    
    // Security: prevent directory traversal
    if (!filePath.startsWith(join(process.cwd(), 'dist', 'client'))) {
      return null;
    }

    if (existsSync(filePath)) {
      return readFileSync(filePath);
    }
  } catch (error) {
    console.error('Error serving static file:', error);
  }
  return null;
}

function getMimeType(pathname: string): string {
  const ext = pathname.substring(pathname.lastIndexOf('.'));
  const mimeTypes: Record<string, string> = {
    '.js': 'application/javascript',
    '.css': 'text/css',
    '.jpeg': 'image/jpeg',
    '.jpg': 'image/jpeg',
    '.png': 'image/png',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon',
    '.woff': 'font/woff',
    '.woff2': 'font/woff2',
    '.ttf': 'font/ttf',
    '.eot': 'application/vnd.ms-fontobject',
    '.map': 'application/json',
  };
  return mimeTypes[ext] || 'application/octet-stream';
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const pathname = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`).pathname;
    
    // Try to serve static files first
    const staticFile = getStaticFile(pathname);
    if (staticFile) {
      res.setHeader('Content-Type', getMimeType(pathname));
      res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
      return res.send(staticFile);
    }

    // Otherwise, use the server handler
    const server = await getServer();
    
    const protocol = req.headers['x-forwarded-proto'] as string || 'https';
    const host = req.headers['x-forwarded-host'] as string || req.headers.host || 'localhost';
    const url = new URL(`${protocol}://${host}${req.url || '/'}`);
    
    const body = ['GET', 'HEAD'].includes(req.method || 'GET') 
      ? undefined 
      : req.body instanceof Buffer 
        ? req.body 
        : typeof req.body === 'string'
          ? req.body
          : JSON.stringify(req.body);

    const request = new Request(url, {
      method: req.method || 'GET',
      headers: new Headers(req.headers as Record<string, string>),
      ...(body && { body }),
    });

    const response = await server.fetch(request);

    res.status(response.status);
    
    const headersToSkip = new Set(['content-encoding', 'transfer-encoding']);
    response.headers.forEach((value, key) => {
      if (!headersToSkip.has(key.toLowerCase())) {
        res.setHeader(key, value);
      }
    });

    const buffer = await response.arrayBuffer();
    res.send(Buffer.from(buffer));
  } catch (error) {
    console.error('Server error:', error);
    res.status(500).json({ error: 'Internal Server Error', message: String(error) });
  }
}
