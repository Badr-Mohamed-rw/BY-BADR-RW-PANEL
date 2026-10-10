/* chat-api.js — By Badr chat backend on GitHub storage */
const https = require('https');

module.exports = function (app, config) {
    const TOKEN = config.GITHUB_TOKEN;
    const OWNER = config.GITHUB_OWNER;
    const REPO  = config.GITHUB_REPO;
    const ADMIN = config.ADMIN_EMAIL;
    const BRANCH = 'main';

    const CACHE = {
        messages: [],
        users: {},
        messagesSha: null,
        usersSha: null
    };

    const ONLINE = new Map();   // email -> lastPing ts
    const ONLINE_TTL = 30000;   // 30 сек

    // ============ GitHub API helpers ============
    function gh(method, path, body) {
        return new Promise((resolve, reject) => {
            const data = body ? JSON.stringify(body) : null;
            const opts = {
                hostname: 'api.github.com',
                port: 443,
                path: '/repos/' + OWNER + '/' + REPO + path,
                method: method,
                headers: {
                    'Authorization': 'Bearer ' + TOKEN,
                    'User-Agent': 'By-Badr-Chat',
                    'Accept': 'application/vnd.github+json',
                    'X-GitHub-Api-Version': '2022-11-28'
                }
            };
            if (data) {
                opts.headers['Content-Type'] = 'application/json';
                opts.headers['Content-Length'] = Buffer.byteLength(data);
            }
            const req = https.request(opts, (res) => {
                const chunks = [];
                res.on('data', (c) => chunks.push(c));
                res.on('end', () => {
                    const raw = Buffer.concat(chunks).toString('utf8');
                    if (res.statusCode === 404) return resolve(null);
                    if (res.statusCode >= 200 && res.statusCode < 300) {
                        try { resolve(JSON.parse(raw)); }
                        catch (e) { resolve(raw); }
                    } else {
                        reject(new Error('GitHub ' + res.statusCode + ': ' + raw.slice(0, 300)));
                    }
                });
            });
            req.on('error', reject);
            if (data) req.write(data);
            req.end();
        });
    }

    async function ghGet(path) {
        const res = await gh('GET', '/contents/' + path + '?ref=' + BRANCH);
        if (!res) return { json: null, sha: null };
        const txt = Buffer.from(res.content || '', 'base64').toString('utf8');
        let json = null;
        try { json = JSON.parse(txt); } catch (e) {}
        return { json: json, sha: res.sha };
    }

    async function ghPut(path, json, sha, message) {
        const body = {
            message: message || ('update ' + path),
            content: Buffer.from(JSON.stringify(json, null, 2), 'utf8').toString('base64'),
            branch: BRANCH
        };
        if (sha) body.sha = sha;
        return await gh('PUT', '/contents/' + path, body);
    }

    async function ghPutBinary(path, buffer, message) {
        let sha = null;
        try {
            const existing = await gh('GET', '/contents/' + path + '?ref=' + BRANCH);
            if (existing) sha = existing.sha;
        } catch (e) {}
        const body = {
            message: message || ('add ' + path),
            content: buffer.toString('base64'),
            branch: BRANCH
        };
        if (sha) body.sha = sha;
        return await gh('PUT', '/contents/' + path, body);
    }

    async function loadAll() {
        try {
            const m = await ghGet('messages.json');
            if (m.json && Array.isArray(m.json)) CACHE.messages = m.json;
            CACHE.messagesSha = m.sha;
        } catch (e) { console.error('[chat] load messages err', e.message); }
        try {
            const u = await ghGet('users.json');
            if (u.json && typeof u.json === 'object') CACHE.users = u.json;
            CACHE.usersSha = u.sha;
        } catch (e) { console.error('[chat] load users err', e.message); }
        console.log('[chat] loaded ' + CACHE.messages.length + ' messages, ' +
                    Object.keys(CACHE.users).length + ' users');
    }

    function uid() {
        return 'msg_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8);
    }

    function nowStr() {
        const d = new Date();
        const p = (n) => n < 10 ? '0' + n : '' + n;
        return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate()) +
               ' ' + p(d.getHours()) + ':' + p(d.getMinutes()) + ':' + p(d.getSeconds());
    }

    // ============ Online ============
    function isAdminEmail(email) { return email === ADMIN; }

    function userInfo(email) {
        if (isAdminEmail(email)) {
            return { email: email, nickname: 'Badr', isAdmin: true };
        }
        const u = CACHE.users[email] || {};
        return {
            email: email,
            nickname: u.nickname || email.split('@')[0],
            isAdmin: false
        };
    }

    function cleanupOnline() {
        const now = Date.now();
        for (const [email, ts] of ONLINE) {
            if (now - ts > ONLINE_TTL) ONLINE.delete(email);
        }
    }
    setInterval(cleanupOnline, 10000);

    function requireAuth(req, res, next) {
        if (!req.session || !req.session.user) {
            return res.status(401).json({ ok: false, error: 'Не авторизован' });
        }
        next();
    }

    // ============ API ============

    // Текущий пользователь чата
    app.get('/api/chat/me', requireAuth, function (req, res) {
        ONLINE.set(req.session.user, Date.now());
        res.json({ ok: true, me: userInfo(req.session.user) });
    });

    // Онлайн
    app.get('/api/chat/online', function (req, res) {
        if (req.session && req.session.user) {
            ONLINE.set(req.session.user, Date.now());
        }
        cleanupOnline();
        res.json({ ok: true, online: ONLINE.size });
    });

    // Heartbeat + me
    app.post('/api/chat/heartbeat', requireAuth, function (req, res) {
        ONLINE.set(req.session.user, Date.now());
        cleanupOnline();
        res.json({ ok: true, online: ONLINE.size, me: userInfo(req.session.user) });
    });

    // Сообщения (с пагинацией since)
    app.get('/api/chat/messages', requireAuth, function (req, res) {
        ONLINE.set(req.session.user, Date.now());
        const since = String(req.query.since || '');
        const limit = Math.min(parseInt(req.query.limit, 10) || 100, 300);
        let list = CACHE.messages;
        if (since) {
            const idx = list.findIndex(m => m.id === since);
            if (idx >= 0) list = list.slice(idx + 1);
        }
        const total = list.length;
        list = list.slice(-limit);
        res.json({ ok: true, messages: list, total: total });
    });

    // Ник
    app.post('/api/chat/set-nickname', requireAuth, async function (req, res) {
        const email = req.session.user;
        if (isAdminEmail(email)) {
            return res.status(403).json({ ok: false, error: 'Админу нельзя менять ник' });
        }
        let nick = String(req.body.nickname || '').trim().slice(0, 24);
        if (nick.length < 2) {
            return res.status(400).json({ ok: false, error: 'Ник минимум 2 символа' });
        }
        nick = nick.replace(/[<>]/g, '');
        CACHE.users[email] = { nickname: nick, updated_at: nowStr() };
        try {
            const r = await ghPut('users.json', CACHE.users, CACHE.usersSha, 'nickname: ' + nick);
            CACHE.usersSha = r.content ? r.content.sha : CACHE.usersSha;
        } catch (e) {
            console.error('[chat] save nick err', e.message);
            return res.status(500).json({ ok: false, error: 'Не сохранилось на GitHub' });
        }
        res.json({ ok: true, nickname: nick });
    });

    // Отправка сообщения
    app.post('/api/chat/send', requireAuth, async function (req, res) {
        const email = req.session.user;
        const text = String(req.body.text || '').trim().slice(0, 1000);
        const photoDataUrl = String(req.body.photo || '').trim();
        const replyToId = String(req.body.replyTo || '').trim();

        if (!text && !photoDataUrl) {
            return res.status(400).json({ ok: false, error: 'Пустое сообщение' });
        }

        const info = userInfo(email);
        const msgId = uid();
        let photoUrl = null;

        // Фото — сохраняем отдельно
        if (photoDataUrl && photoDataUrl.indexOf('data:image/') === 0) {
            const m = photoDataUrl.match(/^data:image\/(png|jpe?g|gif|webp);base64,(.+)$/i);
            if (!m) return res.status(400).json({ ok: false, error: 'Плохой формат фото' });
            const ext = m[1].toLowerCase() === 'jpeg' ? 'jpg' : m[1].toLowerCase();
            const buf = Buffer.from(m[2], 'base64');
            if (buf.length > 5 * 1024 * 1024) {
                return res.status(400).json({ ok: false, error: 'Фото больше 5 МБ' });
            }
            const photoPath = 'photos/' + msgId + '.' + ext;
            try {
                await ghPutBinary(photoPath, buf, 'photo ' + msgId);
                photoUrl = 'https://raw.githubusercontent.com/' + OWNER + '/' + REPO + '/' + BRANCH + '/' + photoPath;
            } catch (e) {
                console.error('[chat] save photo err', e.message);
                return res.status(500).json({ ok: false, error: 'Не сохранилось фото на GitHub' });
            }
        }

        // Reply
        let replyTo = null;
        if (replyToId) {
            const target = CACHE.messages.find(x => x.id === replyToId);
            if (target) {
                replyTo = {
                    id: target.id,
                    nickname: target.nickname,
                    text: (target.text || '').slice(0, 100) || (target.photo ? '📷 фото' : '')
                };
            }
        }

        const msg = {
            id: msgId,
            user: email,
            nickname: info.nickname,
            isAdmin: info.isAdmin,
            text: text,
            photo: photoUrl,
            replyTo: replyTo,
            created_at: nowStr()
        };

        // Ограничиваем историю
        CACHE.messages.push(msg);
        if (CACHE.messages.length > 2000) {
            CACHE.messages = CACHE.messages.slice(-2000);
        }

        try {
            const r = await ghPut('messages.json', CACHE.messages, CACHE.messagesSha, 'msg: ' + msgId);
            CACHE.messagesSha = r.content ? r.content.sha : CACHE.messagesSha;
        } catch (e) {
            console.error('[chat] save message err', e.message);
            // не откатываем — сообщение в памяти, но не в гите
        }

        res.json({ ok: true, message: msg });
    });

    // ============ Загрузка при старте ============
    setTimeout(loadAll, 500);
};
