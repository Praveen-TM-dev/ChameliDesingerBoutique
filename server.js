/**
 * Chameli Designer Boutique - Universal Node.js Web Server
 * 100% Portable & Cloud Hosting Ready (Vercel, Render, AWS, Heroku, Railway, Linux VPS)
 * Zero external dependencies! Uses Node.js native http, fs, and path modules.
 */

const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 8080;
const ROOT_DIR = __dirname;
const IMAGES_DIR = path.join(ROOT_DIR, 'assets', 'images');
const COLLECTIONS_FILE = path.join(IMAGES_DIR, 'collections.json');

// Ensure assets/images directory and collections.json exist
if (!fs.existsSync(IMAGES_DIR)) {
  fs.mkdirSync(IMAGES_DIR, { recursive: true });
}
if (!fs.existsSync(COLLECTIONS_FILE)) {
  fs.writeFileSync(COLLECTIONS_FILE, '[]', 'utf8');
}

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.pdf': 'application/pdf'
};

function sendJson(res, data, statusCode = 200) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': '*'
  });
  res.end(JSON.stringify(data));
}

const requestHandler = (req, res) => {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With');

  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  const urlPath = req.url.split('?')[0];

  // API: Get all scanned disk image files inside assets/images/
  if (urlPath === '/api/all-images' && req.method === 'GET') {
    fs.readdir(IMAGES_DIR, (err, files) => {
      if (err) return sendJson(res, [], 500);

      let metaDict = {};
      try {
        const rawJson = fs.readFileSync(COLLECTIONS_FILE, 'utf8');
        const parsed = JSON.parse(rawJson);
        const metaList = Array.isArray(parsed) ? parsed : [parsed];
        metaList.forEach(m => { if (m && m.fileName) metaDict[m.fileName] = m; });
      } catch (e) {}

      const validExtensions = ['.jpg', '.jpeg', '.png', '.webp', '.svg'];
      const resultList = files
        .filter(f => f !== 'collections.json' && validExtensions.includes(path.extname(f).toLowerCase()))
        .map(fileName => {
          let stats = { size: 0 };
          try { stats = fs.statSync(path.join(IMAGES_DIR, fileName)); } catch (e) {}
          const meta = metaDict[fileName] || null;
          return {
            id: meta?.id || 'file_' + fileName.replace(/[^a-zA-Z0-9]/g, '_'),
            fileName,
            imgSrc: `./assets/images/${fileName}`,
            title: meta?.title || fileName,
            category: meta?.category || 'general',
            categoryName: meta?.categoryName || 'Boutique Asset',
            price: meta?.price || 'Stock Asset',
            target: meta?.target || 'grid',
            size: (stats.size / 1024).toFixed(1) + ' KB',
            isCustom: !!meta
          };
        });

      sendJson(res, resultList);
    });
    return;
  }

  // API: Upload asset file directly into assets/images/
  if (urlPath === '/api/upload' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => { body += chunk.toString(); });
    req.on('end', () => {
      try {
        const payload = JSON.parse(body);
        if (!payload.fileName || !payload.base64Data) {
          return sendJson(res, { success: false, message: 'Invalid payload' }, 400);
        }

        const ext = path.extname(payload.fileName) || '.jpg';
        const baseName = path.basename(payload.fileName, ext).replace(/[^a-zA-Z0-9_\-]/g, '_');
        const timestamp = new Date().toISOString().replace(/[-:T.]/g, '').slice(0, 14);
        const finalFileName = `${timestamp}_${baseName}${ext}`;
        const targetPath = path.join(IMAGES_DIR, finalFileName);

        const base64Raw = payload.base64Data.includes(',')
          ? payload.base64Data.split(',')[1]
          : payload.base64Data;

        const buffer = Buffer.from(base64Raw, 'base64');
        fs.writeFileSync(targetPath, buffer);

        // Update collections.json
        let collections = [];
        try {
          const raw = fs.readFileSync(COLLECTIONS_FILE, 'utf8');
          collections = JSON.parse(raw);
          if (!Array.isArray(collections)) collections = [collections];
        } catch (e) { collections = []; }

        const newItem = {
          id: 'asset_' + Date.now(),
          title: payload.title,
          category: payload.category,
          categoryName: payload.categoryName,
          badge: payload.badge || 'New Arrival',
          price: payload.price,
          fabric: payload.fabric,
          target: payload.target,
          description: payload.description,
          imgSrc: `./assets/images/${finalFileName}`,
          fileName: finalFileName,
          timestamp: new Date().toISOString().slice(0, 10)
        };

        collections.unshift(newItem);
        fs.writeFileSync(COLLECTIONS_FILE, JSON.stringify(collections, null, 2), 'utf8');

        sendJson(res, { success: true, message: `Image saved directly to assets/images/${finalFileName}`, item: newItem });
      } catch (err) {
        sendJson(res, { success: false, message: err.message }, 500);
      }
    });
    return;
  }

  // API: Delete file from assets/images/
  if (urlPath === '/api/delete-file' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => { body += chunk.toString(); });
    req.on('end', () => {
      try {
        const payload = JSON.parse(body);
        const targetPath = path.join(IMAGES_DIR, payload.fileName);
        if (fs.existsSync(targetPath)) {
          fs.unlinkSync(targetPath);
        }

        try {
          const raw = fs.readFileSync(COLLECTIONS_FILE, 'utf8');
          let collections = JSON.parse(raw);
          if (!Array.isArray(collections)) collections = [collections];
          collections = collections.filter(c => c.fileName !== payload.fileName && c.id !== payload.id);
          fs.writeFileSync(COLLECTIONS_FILE, JSON.stringify(collections, null, 2), 'utf8');
        } catch (e) {}

        sendJson(res, { success: true, message: `File ${payload.fileName} deleted` });
      } catch (err) {
        sendJson(res, { success: false, message: err.message }, 500);
      }
    });
    return;
  }

  // API: Get Collections List
  if (urlPath === '/api/collections' && req.method === 'GET') {
    try {
      const raw = fs.readFileSync(COLLECTIONS_FILE, 'utf8');
      const collections = JSON.parse(raw);
      sendJson(res, Array.isArray(collections) ? collections : [collections]);
    } catch (e) {
      sendJson(res, []);
    }
    return;
  }

  // Static File Server
  let filePath = path.join(ROOT_DIR, urlPath === '/' ? 'index.html' : urlPath);
  
  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('404 Not Found');
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    res.writeHead(200, { 'Content-Type': contentType });
    fs.createReadStream(filePath).pipe(res);
  });
};

const server = http.createServer(requestHandler);

if (require.main === module) {
  server.listen(PORT, () => {
    console.log(`==========================================================`);
    console.log(` Chameli Boutique Node.js Server active on http://localhost:${PORT}`);
    console.log(` Root Directory: ${ROOT_DIR}`);
    console.log(` Assets images directory: ${IMAGES_DIR}`);
    console.log(`==========================================================`);
  });
}

module.exports = requestHandler;
