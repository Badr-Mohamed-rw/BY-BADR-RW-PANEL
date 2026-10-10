/* By Badr - Node.js server */
const express = require('express');
const session = require('express-session');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const bcrypt = require('bcryptjs');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const https = require('https');

const app = express();
const PORT = process.env.PORT || 3000;

const ADMIN_EMAIL = 'ahmedesmail7978@gmail.com';
const DATA_DIR = path.join(__dirname, 'data');
const USERS_FILE = path.join(DATA_DIR, 'users.json');
const ORDERS_FILE = path.join(DATA_DIR, 'orders.json');
const REVIEWS_FILE = path.join(DATA_DIR, 'reviews.json');
const UPLOADS_DIR = path.join(__dirname, 'uploads');
const DEFAULT_GAME_URL = 'http://mbadr29679.users.myrn.ru/game.zip';

const TELEGRAM_BOT_TOKEN = '8589076448:AAGoIp4nEzM1rTb-oXJ9tF4QX2WJPqFsjyQ';
const TELEGRAM_CHAT_ID = '6975757982';

if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });
if (!fs.existsSync(USERS_FILE)) fs.writeFileSync(USERS_FILE, '{}', 'utf8');
if (!fs.existsSync(ORDERS_FILE)) fs.writeFileSync(ORDERS_FILE, '[]', 'utf8');
if (!fs.existsSync(REVIEWS_FILE)) fs.writeFileSync(REVIEWS_FILE, '[]', 'utf8');

function readJson(file) {
    try {
        const data = fs.readFileSync(file, 'utf8');
        if (!data) return file === USERS_FILE ? {} : [];
        const parsed = JSON.parse(data);
        return parsed || (file === USERS_FILE ? {} : []);
    } catch (e) {
        return file === USERS_FILE ? {} : [];
    }
}

function writeJson(file, data) {
    fs.writeFileSync(file, JSON.stringify(data, null, 2), 'utf8');
}

function escapeHtml(s) {
    return String(s)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

function now() {
    const d = new Date();
    const pad = function (n) { return n < 10 ? '0' + n : '' + n; };
    return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()) +
        ' ' + pad(d.getHours()) + ':' + pad(d.getMinutes()) + ':' + pad(d.getSeconds());
}

function uid(prefix) {
    return prefix + Date.now() + '_' + Math.random().toString(36).slice(2, 10);
}

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(cookieParser());
app.use(multer().none());

app.use(session({
    secret: 'by-badr-secret-key-2026-change-me',
    resave: false,
    saveUninitialized: false,
    cookie: {
        maxAge: 60 * 60 * 24 * 30 * 1000,
        httpOnly: true,
        sameSite: 'lax',
        path: '/'
    }
}));

const BLOCKED = ['/server.js', '/package.json', '/package-lock.json',
                 '/node_modules', '/data', '/uploads', '/app.py', '/generate.py'];

app.use(function (req, res, next) {
    for (let i = 0; i < BLOCKED.length; i++) {
        const b = BLOCKED[i];
        if (req.path === b || req.path.indexOf(b + '/') === 0) {
            return res.status(404).send('Not found');
        }
    }
    next();
});

function isAdmin(req) {
    return !!(req.session && req.session.user === ADMIN_EMAIL);
}

function requireAuth(req, res, next) {
    if (!req.session || !req.session.user) {
        return res.status(401).json({ ok: false, error: 'Не авторизован' });
    }
    next();
}

function requireAdmin(req, res, next) {
    if (!isAdmin(req)) {
        return res.status(403).json({ ok: false, error: 'Доступ запрещён' });
    }
    next();
}

function sendTelegramNotification(text) {
    if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) return;
    const postData = JSON.stringify({
        chat_id: TELEGRAM_CHAT_ID,
        text: text,
        parse_mode: 'HTML',
        disable_web_page_preview: true
    });
    const options = {
        hostname: 'api.telegram.org',
        port: 443,
        path: '/bot' + TELEGRAM_BOT_TOKEN + '/sendMessage',
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(postData)
        }
    };
    try {
        const request = https.request(options, function (response) {
            response.on('data', function () {});
        });
        request.on('error', function () {});
        request.write(postData);
        request.end();
    } catch (e) {}
}

app.post('/api/register', function (req, res) {
    const email = String(req.body.email || '').trim();
    const password = String(req.body.password || '');
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) return res.status(400).json({ ok: false, error: 'Неверный email' });
    if (password.length < 6) return res.status(400).json({ ok: false, error: 'Пароль минимум 6 символов' });

    const users = readJson(USERS_FILE);
    if (users[email]) return res.status(400).json({ ok: false, error: 'Этот email уже занят' });

    users[email] = { password: bcrypt.hashSync(password, 10), created_at: now() };
    writeJson(USERS_FILE, users);
    req.session.user = email;
    res.json({ ok: true, email: email });
});

app.post('/api/login', function (req, res) {
    const email = String(req.body.email || '').trim();
    const password = String(req.body.password || '');
    const users = readJson(USERS_FILE);
    if (!users[email]) return res.status(400).json({ ok: false, error: 'Неверный email или пароль' });
    let ok = false;
    try { ok = bcrypt.compareSync(password, users[email].password); } catch (e) { ok = false; }
    if (!ok) return res.status(400).json({ ok: false, error: 'Неверный email или пароль' });
    req.session.user = email;
    res.json({ ok: true, email: email });
});

app.get('/api/logout', function (req, res) {
    req.session.destroy(function () { res.json({ ok: true }); });
});

app.post('/api/cookie-consent', function (req, res) {
    const consent = req.body.consent;
    if (consent === 'accept' || consent === 'decline') {
        res.cookie('cookie_consent', consent, {
            maxAge: 365 * 24 * 60 * 60 * 1000,
            httpOnly: true,
            sameSite: 'lax',
            path: '/'
        });
        return res.json({ ok: true, consent: consent });
    }
    res.status(400).json({ ok: false, error: 'Неверное значение' });
});

app.get('/api/me', function (req, res) {
    if (!req.session || !req.session.user) return res.json({ ok: false, user: null });
    res.json({ ok: true, user: req.session.user, isAdmin: isAdmin(req) });
});

app.post('/api/order', requireAuth, function (req, res) {
    let gameUrl = String(req.body.gameUrl || '').trim();
    if (gameUrl === '') gameUrl = DEFAULT_GAME_URL;

    const order = {
        id: uid('ord_'),
        user: req.session.user,
        name: String(req.body.name || '').trim(),
        ip: String(req.body.ip || '').trim(),
        port: String(req.body.port || '').trim(),
        bgUrl: String(req.body.bgUrl || '').trim(),
        logoUrl: String(req.body.logoUrl || '').trim(),
        gameUrl: gameUrl,
        siteUrl: String(req.body.siteUrl || '').trim(),
        forumUrl: String(req.body.forumUrl || '').trim(),
        news: String(req.body.news || '').trim(),
        contactType: String(req.body.contactType || '').trim(),
        contact: String(req.body.contact || '').trim(),
        status: 'pending',
        created_at: now(),
        updated_at: now()
    };

    if (!order.name || !order.ip || !order.port) {
        return res.status(400).json({ ok: false, error: 'Заполни обязательные поля' });
    }

    const orders = readJson(ORDERS_FILE);
    orders.push(order);
    writeJson(ORDERS_FILE, orders);

    let tgText = '🎯 <b>НОВЫЙ ЗАКАЗ</b>\n\n';
    tgText += '<b>Проект:</b> ' + escapeHtml(order.name) + '\n';
    tgText += '<b>IP:</b> ' + order.ip + ':' + order.port + '\n';
    tgText += '<b>Сборка:</b> ' + (order.gameUrl === DEFAULT_GAME_URL ? 'дефолтная' : order.gameUrl) + '\n';
    tgText += '<b>Контакт:</b> ' + order.contactType.toUpperCase() + ' — ' + escapeHtml(order.contact) + '\n';
    tgText += '<b>Email:</b> ' + escapeHtml(order.user) + '\n\n';
    tgText += '👉 <a href="http://localhost:' + PORT + '/admin.html">Открыть админку</a>';
    sendTelegramNotification(tgText);

    res.json({ ok: true, id: order.id });
});

app.get('/api/my-orders', requireAuth, function (req, res) {
    const orders = readJson(ORDERS_FILE);
    const mine = orders.filter(function (o) { return o.user === req.session.user; });
    res.json({ ok: true, orders: mine });
});

app.get('/api/all-orders', requireAdmin, function (req, res) {
    res.json({ ok: true, orders: readJson(ORDERS_FILE) });
});

app.get('/api/stats', function (req, res) {
    const users = readJson(USERS_FILE);
    const orders = readJson(ORDERS_FILE);
    let completed = 0;
    for (let i = 0; i < orders.length; i++) if (orders[i].status === 'completed') completed++;
    const servers = orders.filter(function (o) { return o.status !== 'rejected'; }).length;
    res.json({ ok: true, users: Object.keys(users).length, orders: orders.length, completed: completed, servers: servers });
});

app.post('/api/approve', requireAdmin, function (req, res) {
    const id = req.body.id || '';
    if (!id) return res.status(400).json({ ok: false, error: 'Нет id' });
    const orders = readJson(ORDERS_FILE);
    let found = false;
    for (let i = 0; i < orders.length; i++) {
        if (orders[i].id === id) {
            orders[i].status = 'approved';
            orders[i].updated_at = now();
            found = true;
            break;
        }
    }
    if (!found) return res.status(404).json({ ok: false, error: 'Заказ не найден' });
    writeJson(ORDERS_FILE, orders);
    res.json({ ok: true });
});

app.post('/api/mark-sent', requireAdmin, function (req, res) {
    const id = req.body.id || '';
    if (!id) return res.status(400).json({ ok: false, error: 'Нет id' });
    const orders = readJson(ORDERS_FILE);
    let found = false;
    for (let i = 0; i < orders.length; i++) {
        if (orders[i].id === id) {
            orders[i].status = 'completed';
            orders[i].sent_at = now();
            orders[i].updated_at = now();
            found = true;
            break;
        }
    }
    if (!found) return res.status(404).json({ ok: false, error: 'Заказ не найден' });
    writeJson(ORDERS_FILE, orders);
    res.json({ ok: true });
});

app.post('/api/reject', requireAdmin, function (req, res) {
    const id = req.body.id || '';
    if (!id) return res.status(400).json({ ok: false, error: 'Нет id' });
    const orders = readJson(ORDERS_FILE);
    for (let i = 0; i < orders.length; i++) {
        if (orders[i].id === id) {
            orders[i].status = 'rejected';
            orders[i].updated_at = now();
            break;
        }
    }
    writeJson(ORDERS_FILE, orders);
    res.json({ ok: true });
});

app.get('/api/get-reviews', function (req, res) {
    let reviews = readJson(REVIEWS_FILE);
    reviews = reviews.filter(function (r) { return r.approved === true; });
    reviews.sort(function (a, b) {
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
    res.json({ ok: true, reviews: reviews });
});

app.post('/api/add-review', function (req, res) {
    const name = String(req.body.name || '').trim();
    const text = String(req.body.text || '').trim();
    let rating = 5;
    if (req.body.rating !== undefined && req.body.rating !== '') {
        rating = parseInt(req.body.rating, 10);
        if (isNaN(rating)) rating = 5;
    }
    if (rating < 1) rating = 1;
    if (rating > 5) rating = 5;
    if (name.length < 2 || text.length < 10) {
        return res.status(400).json({ ok: false, error: 'Имя минимум 2, отзыв минимум 10 символов' });
    }
    if (text.length > 500) return res.status(400).json({ ok: false, error: 'Отзыв слишком длинный' });

    const reviews = readJson(REVIEWS_FILE);
    reviews.push({
        id: uid('rev_'),
        name: escapeHtml(name),
        text: escapeHtml(text),
        rating: rating,
        approved: false,
        created_at: now()
    });
    writeJson(REVIEWS_FILE, reviews);

    let stars = '';
    for (let i = 0; i < rating; i++) stars += '⭐';
    let tgText = '⭐ <b>НОВЫЙ ОТЗЫВ</b>\n\n';
    tgText += '<b>Имя:</b> ' + escapeHtml(name) + '\n';
    tgText += '<b>Оценка:</b> ' + stars + '\n';
    tgText += '<b>Текст:</b>\n' + escapeHtml(text);
    sendTelegramNotification(tgText);

    res.json({ ok: true, message: 'Отзыв отправлен на модерацию' });
});

app.post('/api/admin-approve-review', requireAdmin, function (req, res) {
    const id = req.body.id || '';
    const reviews = readJson(REVIEWS_FILE);
    for (let i = 0; i < reviews.length; i++) {
        if (reviews[i].id === id) { reviews[i].approved = true; break; }
    }
    writeJson(REVIEWS_FILE, reviews);
    res.json({ ok: true });
});

app.post('/api/admin-delete-review', requireAdmin, function (req, res) {
    const id = req.body.id || '';
    let reviews = readJson(REVIEWS_FILE);
    reviews = reviews.filter(function (r) { return r.id !== id; });
    writeJson(REVIEWS_FILE, reviews);
    res.json({ ok: true });
});

/* === CHAT API === */
try {
    const chatConfig = require('./chat-config.js');
    const chatApi = require('./chat-api.js');
    chatApi(app, chatConfig);
    console.log('[chat] OK');
} catch (e) {
    console.error('[chat] FAIL:', e.message);
}

app.use('/api', function (req, res) {
    res.status(404).json({ ok: false, error: 'Неизвестное действие' });
});

app.use(express.static(__dirname, { index: 'index.html' }));

app.listen(PORT, function () {
    console.log('');
    console.log('========================================');
    console.log('   By Badr - сервер запущен');
    console.log('   http://localhost:' + PORT);
    console.log('========================================');
    console.log('');
});