const MEDIA_TABLE = 'media';

async function ensureSchema(env) {
  await env.DB.prepare(`
    CREATE TABLE IF NOT EXISTS ${MEDIA_TABLE} (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      type TEXT NOT NULL,
      date TEXT,
      mime TEXT,
      size INTEGER,
      key TEXT NOT NULL,
      url TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `).run();
}

function json(status, body) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'Access-Control-Allow-Origin': '*'
    }
  });
}

export default {
  async fetch(request, env) {
    await ensureSchema(env);

    const url = new URL(request.url);

    if (request.method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization'
        }
      });
    }

    if (url.pathname === '/api/health') {
      return json(200, { ok: true, app: 'memory-album', mode: 'cloudflare-public' });
    }

    if (url.pathname === '/api/media' && request.method === 'GET') {
      const rows = await env.DB.prepare(`
        SELECT * FROM ${MEDIA_TABLE} ORDER BY created_at DESC LIMIT 200
      `).all();

      return json(200, { items: rows.results || [] });
    }

    if (url.pathname === '/api/media' && request.method === 'POST') {
      const form = await request.formData();
      const file = form.get('file');
      const title = form.get('title')?.toString() || '未命名';
      const type = form.get('type')?.toString() || 'image';
      const date = form.get('date')?.toString() || new Date().toISOString().slice(0, 10);

      if (!(file instanceof File)) {
        return json(400, { error: 'No file uploaded' });
      }

      const bytes = await file.arrayBuffer();
      const id = crypto.randomUUID();
      const ext = file.name.includes('.') ? file.name.split('.').pop() : '';
      const key = `${type}/${id}.${ext || 'bin'}`;

      await env.MEDIA_BUCKET.put(key, bytes, {
        httpMetadata: {
          contentType: file.type || 'application/octet-stream'
        }
      });

      const publicUrl = new URL(key, env.PUBLIC_BASE_URL).toString();

      await env.DB.prepare(`
        INSERT INTO ${MEDIA_TABLE} (id, title, type, date, mime, size, key, url, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
      `).bind(id, title, type, date, file.type || '', file.size, key, publicUrl).run();

      return json(200, {
        ok: true,
        item: {
          id,
          title,
          type,
          date,
          mime: file.type || '',
          size: file.size,
          key,
          url: publicUrl
        }
      });
    }

    if (url.pathname.startsWith('/api/media/') && request.method === 'DELETE') {
      const id = url.pathname.split('/').pop();
      const row = await env.DB.prepare(`SELECT * FROM ${MEDIA_TABLE} WHERE id = ?`).bind(id).first();

      if (!row) {
        return json(404, { error: 'Not found' });
      }

      await env.MEDIA_BUCKET.delete(row.key);
      await env.DB.prepare(`DELETE FROM ${MEDIA_TABLE} WHERE id = ?`).bind(id).run();
      return json(200, { ok: true, deleted: id });
    }

    return new Response('Not Found', { status: 404 });
  }
};
