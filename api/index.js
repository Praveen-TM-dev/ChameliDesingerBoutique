const fs = require('fs');
const path = require('path');

const ROOT_DIR = process.cwd();
const IMAGES_DIR = path.join(ROOT_DIR, 'assets', 'images');
const COLLECTIONS_FILE = path.join(IMAGES_DIR, 'collections.json');

function sendJson(res, data, statusCode = 200) {
  res.statusCode = statusCode;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', '*');
  res.end(JSON.stringify(data));
}

module.exports = (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With');

  if (req.method === 'OPTIONS') {
    res.statusCode = 200;
    res.end();
    return;
  }

  const urlPath = req.url.split('?')[0];

  // API: Get Collections List
  if (urlPath.includes('/collections') && req.method === 'GET') {
    try {
      if (fs.existsSync(COLLECTIONS_FILE)) {
        const raw = fs.readFileSync(COLLECTIONS_FILE, 'utf8');
        const collections = JSON.parse(raw);
        return sendJson(res, Array.isArray(collections) ? collections : [collections]);
      }
    } catch (e) {}
    return sendJson(res, []);
  }

  // API: Get all scanned images
  if (urlPath.includes('/all-images') && req.method === 'GET') {
    try {
      let metaDict = {};
      if (fs.existsSync(COLLECTIONS_FILE)) {
        try {
          const rawJson = fs.readFileSync(COLLECTIONS_FILE, 'utf8');
          const parsed = JSON.parse(rawJson);
          const metaList = Array.isArray(parsed) ? parsed : [parsed];
          metaList.forEach(m => { if (m && m.fileName) metaDict[m.fileName] = m; });
        } catch (e) {}
      }

      let files = [];
      if (fs.existsSync(IMAGES_DIR)) {
        files = fs.readdirSync(IMAGES_DIR);
      }

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

      return sendJson(res, resultList);
    } catch (err) {
      return sendJson(res, [], 500);
    }
  }

  // API: Upload asset
  if (urlPath.includes('/upload') && req.method === 'POST') {
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

        sendJson(res, { success: true, message: 'Asset uploaded successfully', item: newItem });
      } catch (err) {
        sendJson(res, { success: false, message: err.message }, 500);
      }
    });
    return;
  }

  // API: Delete asset
  if (urlPath.includes('/delete-file') && req.method === 'POST') {
    return sendJson(res, { success: true, message: 'File deleted' });
  }

  return sendJson(res, { message: 'Chameli Boutique API' });
};
