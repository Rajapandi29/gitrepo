const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const { randomUUID } = require('node:crypto');
const { scryptSync, randomBytes, timingSafeEqual } = require('node:crypto');

const PORT = process.env.PORT || 3000;
const publicDir = path.join(__dirname, 'public');
const dataDir = path.join(__dirname, 'data');
const databasePath = path.join(dataDir, 'db.json');

const seed = {
  menu: [
    { id: 'm1', name: 'Truffle Mushroom Pizza', description: 'Wild mushrooms, mozzarella, truffle oil & herbs.', price: 429, category: 'Pizza', emoji: '🍕', color: '#fbd38d', image: 'https://images.unsplash.com/photo-1574071318508-1cdbab80d002?auto=format&fit=crop&w=800&q=85' },
    { id: 'm2', name: 'Crispy Chicken Burger', description: 'Buttermilk chicken, slaw, pickles & house sauce.', price: 289, category: 'Burgers', emoji: '🍔', color: '#fed7d7', image: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=800&q=85' },
    { id: 'm3', name: 'Creamy Tomato Pasta', description: 'Penne in a silky tomato-basil parmesan sauce.', price: 319, category: 'Pasta', emoji: '🍝', color: '#feebc8', image: 'https://images.unsplash.com/photo-1473093295043-cdd812d0e601?auto=format&fit=crop&w=800&q=85' },
    { id: 'm4', name: 'Paneer Tikka Bowl', description: 'Charred paneer, cumin rice, greens & mint yogurt.', price: 279, category: 'Bowls', emoji: '🥗', color: '#c6f6d5', image: 'https://images.unsplash.com/photo-1547592180-85f173990554?auto=format&fit=crop&w=800&q=85' },
    { id: 'm5', name: 'Loaded Masala Fries', description: 'Crispy fries with chilli, cheese and spicy mayo.', price: 169, category: 'Sides', emoji: '🍟', color: '#fefcbf', image: 'https://images.unsplash.com/photo-1573080496219-bb080dd4f877?auto=format&fit=crop&w=800&q=85' },
    { id: 'm6', name: 'Chocolate Lava Cake', description: 'Warm dark chocolate cake with vanilla cream.', price: 159, category: 'Dessert', emoji: '🍫', color: '#e9d8fd', image: 'https://images.unsplash.com/photo-1606313564200-e75d5e30476c?auto=format&fit=crop&w=800&q=85' }
  ],
  orders: [], users: [], sessions: {}
};

function ensureDatabase() {
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir);
  if (!fs.existsSync(databasePath)) fs.writeFileSync(databasePath, JSON.stringify(seed, null, 2));
  const db = readDb(); let changed = false;
  for (const key of ['users', 'sessions']) if (!db[key]) { db[key] = seed[key]; changed = true; }
  db.menu = db.menu.map((item, i) => { if (item.image) return item; changed = true; return { ...item, image: seed.menu[i].image }; });
  if (changed) writeDb(db);
}
function readDb() { return JSON.parse(fs.readFileSync(databasePath, 'utf8')); }
function writeDb(db) { fs.writeFileSync(databasePath, JSON.stringify(db, null, 2)); }
function send(res, status, payload) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(payload));
}
function parseBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => { body += chunk; if (body.length > 1e6) req.destroy(); });
    req.on('end', () => { try { resolve(body ? JSON.parse(body) : {}); } catch { reject(new Error('Invalid JSON')); } });
    req.on('error', reject);
  });
}
function passwordHash(password, salt = randomBytes(16).toString('hex')) { return `${salt}:${scryptSync(password, salt, 64).toString('hex')}`; }
function passwordMatches(password, stored) { const [salt, hash] = stored.split(':'); return timingSafeEqual(Buffer.from(hash, 'hex'), scryptSync(password, salt, 64)); }
function publicUser(user) { return { id: user.id, name: user.name, email: user.email }; }
function authorize(req, db) { const token = req.headers.authorization?.replace('Bearer ', ''); const userId = token && db.sessions[token]; return userId ? db.users.find(user => user.id === userId) : null; }
function serveFile(res, urlPath) {
  const requested = urlPath === '/' ? '/index.html' : urlPath;
  const filePath = path.join(publicDir, path.normalize(requested));
  if (!filePath.startsWith(publicDir) || !fs.existsSync(filePath)) return false;
  const extensions = { '.html': 'text/html', '.css': 'text/css', '.js': 'application/javascript' };
  res.writeHead(200, { 'Content-Type': `${extensions[path.extname(filePath)] || 'application/octet-stream'}; charset=utf-8` });
  fs.createReadStream(filePath).pipe(res);
  return true;
}

ensureDatabase();
http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  try {
    if (req.method === 'GET' && url.pathname === '/api/menu') return send(res, 200, readDb().menu);
    if (req.method === 'POST' && url.pathname === '/api/auth/register') {
      const { name, email, password } = await parseBody(req); const db = readDb();
      if (!name?.trim() || !/^\S+@\S+\.\S+$/.test(email || '') || !password || password.length < 6) return send(res, 400, { error: 'Enter your name, a valid email, and a password of at least 6 characters.' });
      if (db.users.some(user => user.email === email.toLowerCase())) return send(res, 409, { error: 'An account already exists for this email.' });
      const user = { id: randomUUID(), name: name.trim(), email: email.toLowerCase(), password: passwordHash(password) }; const token = randomUUID();
      db.users.push(user); db.sessions[token] = user.id; writeDb(db); return send(res, 201, { token, user: publicUser(user) });
    }
    if (req.method === 'POST' && url.pathname === '/api/auth/login') {
      const { email, password } = await parseBody(req); const db = readDb(); const user = db.users.find(item => item.email === (email || '').toLowerCase());
      if (!user || !passwordMatches(password || '', user.password)) return send(res, 401, { error: 'Email or password is incorrect.' });
      const token = randomUUID(); db.sessions[token] = user.id; writeDb(db); return send(res, 200, { token, user: publicUser(user) });
    }
    if (req.method === 'GET' && url.pathname === '/api/auth/me') { const db = readDb(); const user = authorize(req, db); return user ? send(res, 200, { user: publicUser(user) }) : send(res, 401, { error: 'Please sign in.' }); }
    if (req.method === 'GET' && url.pathname.startsWith('/api/orders/')) {
      if (url.pathname.endsWith('/tracking')) {
        const id = url.pathname.split('/')[3]; const db = readDb(); const order = db.orders.find(item => item.id === id);
        if (!order) return send(res, 404, { error: 'Order not found' });
        const elapsed = Math.floor((Date.now() - new Date(order.createdAt).getTime()) / 1000); const progress = Math.min(.88, .22 + elapsed / 180);
        const restaurant = { lat: 12.9716, lng: 77.5946 }, destination = { lat: 12.9352, lng: 77.6245 };
        const driver = { lat: restaurant.lat + (destination.lat - restaurant.lat) * progress, lng: restaurant.lng + (destination.lng - restaurant.lng) * progress };
        return send(res, 200, { orderId: id, status: progress > .76 ? 'Arriving soon' : 'On the way', etaMinutes: Math.max(4, Math.ceil(28 * (1 - progress))), restaurant, destination, driver });
      }
      const order = readDb().orders.find(item => item.id === url.pathname.split('/').pop());
      return order ? send(res, 200, order) : send(res, 404, { error: 'Order not found' });
    }
    if (req.method === 'POST' && url.pathname === '/api/orders') {
      const body = await parseBody(req);
      if (!body.customer?.name || !body.customer?.address || !Array.isArray(body.items) || !body.items.length) {
        return send(res, 400, { error: 'Name, delivery address, and at least one item are required.' });
      }
      const db = readDb();
      const user = authorize(req, db);
      const items = body.items.map(({ menuItemId, quantity }) => {
        const menuItem = db.menu.find(item => item.id === menuItemId);
        const amount = Number(quantity);
        if (!menuItem || !Number.isInteger(amount) || amount < 1) throw new Error('Invalid cart item');
        return { ...menuItem, quantity: amount, lineTotal: menuItem.price * amount };
      });
      const order = {
        id: randomUUID().slice(0, 8).toUpperCase(),
        customer: { name: body.customer.name.trim(), address: body.customer.address.trim(), phone: (body.customer.phone || '').trim() }, userId: user?.id || null,
        items, total: items.reduce((sum, item) => sum + item.lineTotal, 0), status: 'Confirmed', createdAt: new Date().toISOString()
      };
      db.orders.unshift(order); writeDb(db);
      return send(res, 201, order);
    }
    if (req.method === 'GET' && serveFile(res, url.pathname)) return;
    send(res, 404, { error: 'Not found' });
  } catch (error) { send(res, 400, { error: error.message || 'Something went wrong' }); }
}).listen(PORT, () => console.log(`Plateful running at http://localhost:${PORT}`));
