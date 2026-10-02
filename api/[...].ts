import { VercelRequest, VercelResponse } from '@vercel/node';

let serverCache: any;

async function getServer() {
  if (!serverCache) {
    // Dynamically import the built server
    const serverModule = await import('../dist/server/server.js');
    serverCache = serverModule.default;
  }
  return serverCache;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const server = await getServer();
    
    // Convert Vercel request to Web standard Request
    const protocol = req.headers['x-forwarded-proto'] as string || 'https';
    const host = req.headers['x-forwarded-host'] as string || req.headers.host || 'localhost';
    const url = new URL(`${protocol}://${host}${req.url || '/'}`);
    
    const request = new Request(url, {
      method: req.method || 'GET',
      headers: new Headers(req.headers as Record<string, string>),
      body: ['GET', 'HEAD'].includes(req.method || 'GET') 
        ? undefined 
        : req.body instanceof Buffer 
          ? req.body 
          : Buffer.from(JSON.stringify(req.body)),
    });

    // Call the TanStack Start server's fetch handler
    const response = await server.fetch(request);

    // Set status
    res.status(response.status);
    
    // Copy headers
    response.headers.forEach((value, key) => {
      res.setHeader(key, value);
    });

    // Send body
    const buffer = await response.arrayBuffer();
    res.send(Buffer.from(buffer));
  } catch (error) {
    console.error('Server error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
}
