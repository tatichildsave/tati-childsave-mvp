import { VercelRequest, VercelResponse } from '@vercel/node';

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

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
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
