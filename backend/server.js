const http = require('node:http');
const { randomUUID, randomBytes, scryptSync, timingSafeEqual } = require('node:crypto');
const { Pool } = require('pg');

const PORT = process.env.PORT || 3000;
const pool = new Pool({ connectionString: process.env.DATABASE_URL || 'postgres://plateful:plateful_local_dev@localhost:5432/plateful' });

const menu = [
  ['m1', 'Truffle Mushroom Pizza', 'Wild mushrooms, mozzarella, truffle oil & herbs.', 429, 'Pizza', '🍕', '#fbd38d', 'https://images.unsplash.com/photo-1574071318508-1cdbab80d002?auto=format&fit=crop&w=800&q=85'],
  ['m2', 'Crispy Chicken Burger', 'Buttermilk chicken, slaw, pickles & house sauce.', 289, 'Burgers', '🍔', '#fed7d7', 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=800&q=85'],
  ['m3', 'Creamy Tomato Pasta', 'Penne in a silky tomato-basil parmesan sauce.', 319, 'Pasta', '🍝', '#feebc8', 'https://images.unsplash.com/photo-1473093295043-cdd812d0e601?auto=format&fit=crop&w=800&q=85'],
  ['m4', 'Paneer Tikka Bowl', 'Charred paneer, cumin rice, greens & mint yogurt.', 279, 'Bowls', '🥗', '#c6f6d5', 'https://images.unsplash.com/photo-1547592180-85f173990554?auto=format&fit=crop&w=800&q=85'],
  ['m5', 'Loaded Masala Fries', 'Crispy fries with chilli, cheese and spicy mayo.', 169, 'Sides', '🍟', '#fefcbf', 'https://images.unsplash.com/photo-1573080496219-bb080dd4f877?auto=format&fit=crop&w=800&q=85'],
  ['m6', 'Chocolate Lava Cake', 'Warm dark chocolate cake with vanilla cream.', 159, 'Dessert', '🍫', '#e9d8fd', 'https://images.unsplash.com/photo-1606313564200-e75d5e30476c?auto=format&fit=crop&w=800&q=85']
];

function send(res, status, data) { res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' }); res.end(JSON.stringify(data)); }
function parseBody(req) { return new Promise((resolve, reject) => { let body = ''; req.on('data', chunk => { body += chunk; if (body.length > 1e6) req.destroy(); }); req.on('end', () => { try { resolve(body ? JSON.parse(body) : {}); } catch { reject(new Error('Invalid JSON')); } }); req.on('error', reject); }); }
function passwordHash(password, salt = randomBytes(16).toString('hex')) { return `${salt}:${scryptSync(password, salt, 64).toString('hex')}`; }
function passwordMatches(password, stored) { const [salt, hash] = stored.split(':'); return timingSafeEqual(Buffer.from(hash, 'hex'), scryptSync(password, salt, 64)); }
function publicUser(user) { return { id: user.id, name: user.name, email: user.email }; }
async function authorize(req) { const token = req.headers.authorization?.replace('Bearer ', ''); if (!token) return null; const { rows } = await pool.query('SELECT u.id, u.name, u.email FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.token = $1', [token]); return rows[0] || null; }

async function initializeDatabase() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS menu_items (id TEXT PRIMARY KEY, name TEXT NOT NULL, description TEXT NOT NULL, price INTEGER NOT NULL, category TEXT NOT NULL, emoji TEXT NOT NULL, color TEXT NOT NULL, image TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS users (id UUID PRIMARY KEY, name TEXT NOT NULL, email TEXT UNIQUE NOT NULL, password_hash TEXT NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT now());
    CREATE TABLE IF NOT EXISTS sessions (token UUID PRIMARY KEY, user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE, created_at TIMESTAMPTZ NOT NULL DEFAULT now());
    CREATE TABLE IF NOT EXISTS orders (id TEXT PRIMARY KEY, user_id UUID REFERENCES users(id) ON DELETE SET NULL, customer JSONB NOT NULL, items JSONB NOT NULL, total INTEGER NOT NULL, payment JSONB NOT NULL, status TEXT NOT NULL DEFAULT 'Confirmed', created_at TIMESTAMPTZ NOT NULL DEFAULT now());
  `);
  for (const item of menu) await pool.query('INSERT INTO menu_items (id, name, description, price, category, emoji, color, image) VALUES ($1,$2,$3,$4,$5,$6,$7,$8) ON CONFLICT (id) DO NOTHING', item);
}

async function handler(req, res) {
  const url = new URL(req.url, `http://${req.headers.host}`);
  try {
    if (req.method === 'GET' && url.pathname === '/api/health') return send(res, 200, { status: 'ok', database: 'postgresql' });
    if (req.method === 'GET' && url.pathname === '/api/menu') { const { rows } = await pool.query('SELECT * FROM menu_items ORDER BY id'); return send(res, 200, rows); }
    if (req.method === 'POST' && url.pathname === '/api/auth/register') {
      const { name, email, password } = await parseBody(req);
      if (!name?.trim() || !/^\S+@\S+\.\S+$/.test(email || '') || !password || password.length < 6) return send(res, 400, { error: 'Enter your name, a valid email, and a password of at least 6 characters.' });
      const user = { id: randomUUID(), name: name.trim(), email: email.toLowerCase(), passwordHash: passwordHash(password) };
      try { await pool.query('INSERT INTO users (id, name, email, password_hash) VALUES ($1,$2,$3,$4)', [user.id, user.name, user.email, user.passwordHash]); } catch (error) { if (error.code === '23505') return send(res, 409, { error: 'An account already exists for this email.' }); throw error; }
      const token = randomUUID(); await pool.query('INSERT INTO sessions (token, user_id) VALUES ($1,$2)', [token, user.id]); return send(res, 201, { token, user: publicUser(user) });
    }
    if (req.method === 'POST' && url.pathname === '/api/auth/login') {
      const { email, password } = await parseBody(req); const { rows } = await pool.query('SELECT * FROM users WHERE email = $1', [(email || '').toLowerCase()]); const user = rows[0];
      if (!user || !passwordMatches(password || '', user.password_hash)) return send(res, 401, { error: 'Email or password is incorrect.' });
      const token = randomUUID(); await pool.query('INSERT INTO sessions (token, user_id) VALUES ($1,$2)', [token, user.id]); return send(res, 200, { token, user: publicUser(user) });
    }
    if (req.method === 'GET' && url.pathname === '/api/auth/me') { const user = await authorize(req); return user ? send(res, 200, { user }) : send(res, 401, { error: 'Please sign in.' }); }
    if (req.method === 'GET' && /^\/api\/orders\/[^/]+\/tracking$/.test(url.pathname)) {
      const id = url.pathname.split('/')[3]; const { rows } = await pool.query('SELECT id, created_at FROM orders WHERE id = $1', [id]); const order = rows[0]; if (!order) return send(res, 404, { error: 'Order not found' });
      const elapsed = Math.floor((Date.now() - new Date(order.created_at).getTime()) / 1000), progress = Math.min(.88, .22 + elapsed / 180); const restaurant = { lat: 12.9716, lng: 77.5946 }, destination = { lat: 12.9352, lng: 77.6245 }; const driver = { lat: restaurant.lat + (destination.lat - restaurant.lat) * progress, lng: restaurant.lng + (destination.lng - restaurant.lng) * progress };
      return send(res, 200, { orderId: id, status: progress > .76 ? 'Arriving soon' : 'On the way', etaMinutes: Math.max(4, Math.ceil(28 * (1 - progress))), restaurant, destination, driver });
    }
    if (req.method === 'GET' && /^\/api\/orders\/[^/]+$/.test(url.pathname)) { const { rows } = await pool.query('SELECT * FROM orders WHERE id = $1', [url.pathname.split('/').pop()]); return rows[0] ? send(res, 200, rows[0]) : send(res, 404, { error: 'Order not found' }); }
    if (req.method === 'POST' && url.pathname === '/api/orders') {
      const body = await parseBody(req); if (!body.customer?.name || !body.customer?.address || !Array.isArray(body.items) || !body.items.length) return send(res, 400, { error: 'Name, delivery address, and at least one item are required.' });
      const paymentMethod = body.paymentMethod || 'Cash on Delivery'; if (!['UPI', 'Card', 'Cash on Delivery'].includes(paymentMethod)) return send(res, 400, { error: 'Select a valid payment method.' });
      const ids = body.items.map(item => item.menuItemId); const { rows: catalog } = await pool.query('SELECT * FROM menu_items WHERE id = ANY($1)', [ids]); const byId = new Map(catalog.map(item => [item.id, item]));
      const items = body.items.map(({ menuItemId, quantity }) => { const item = byId.get(menuItemId), amount = Number(quantity); if (!item || !Number.isInteger(amount) || amount < 1) throw new Error('Invalid cart item'); return { ...item, quantity: amount, lineTotal: item.price * amount }; });
      const user = await authorize(req), order = { id: randomUUID().slice(0, 8).toUpperCase(), customer: { name: body.customer.name.trim(), address: body.customer.address.trim(), phone: (body.customer.phone || '').trim() }, items, total: items.reduce((sum, item) => sum + item.lineTotal, 0), payment: { method: paymentMethod, status: paymentMethod === 'Cash on Delivery' ? 'Due on delivery' : 'Demo payment approved', transactionId: `PAY-${randomUUID().slice(0, 8).toUpperCase()}` }, status: 'Confirmed', createdAt: new Date().toISOString() };
      await pool.query('INSERT INTO orders (id, user_id, customer, items, total, payment, status) VALUES ($1,$2,$3,$4,$5,$6,$7)', [order.id, user?.id || null, order.customer, order.items, order.total, order.payment, order.status]); return send(res, 201, order);
    }
    send(res, 404, { error: 'Not found' });
  } catch (error) { console.error(error); send(res, 400, { error: error.message || 'Something went wrong' }); }
}

initializeDatabase().then(() => http.createServer(handler).listen(PORT, () => console.log(`Plateful API with PostgreSQL running at http://localhost:${PORT}`))).catch(error => { console.error('Database initialization failed:', error); process.exit(1); });
