const fs = require('fs');
const path = require('path');

module.exports = function (app, cfg) {
    const ADMIN = cfg.ADMIN_EMAIL || 'ahmedesmail7978@gmail.com';
    const DATA = path.join(__dirname, 'data');
    const MSG_FILE = path.join(DATA, 'chat-messages.json');
    const USR_FILE = path.join(DATA, 'chat-users.json');
    const PHOTOS = path.join(DATA, 'chat-photos');
    const ONLINE = new Map();
    const TTL = 30000;

    if (!fs.existsSync(DATA)) fs.mkdirSync(DATA, { recursive: true });
    if (!fs.existsSync(PHOTOS)) fs.mkdirSync(PHOTOS, { recursive: true });
    if (!fs.existsSync(MSG_FILE)) fs.writeFileSync(MSG_FILE, '[]');
    if (!fs.existsSync(USR_FILE)) fs.writeFileSync(USR_FILE, '{}');

    let C = { m: [], u: {} };
    try { C.m = JSON.parse(fs.readFileSync(MSG_FILE, 'utf8')) || []; } catch (e) { C.m = []; }
    try { C.u = JSON.parse(fs.readFileSync(USR_FILE, 'utf8')) || {}; } catch (e) { C.u = {}; }

    console.log('[chat] loaded ' + C.m.length + ' msg, ' + Object.keys(C.u).length + ' usr');

    function save() {
        try { fs.writeFileSync(MSG_FILE, JSON.stringify(C.m.slice(-2000))); } catch (e) { console.error('[chat] save msg', e.message); }
        try { fs.writeFileSync(USR_FILE, JSON.stringify(C.u)); } catch (e) { console.error('[chat] save usr', e.message); }
    }

    function now() {
        const d = new Date(), p = n => n < 10 ? '0' + n : '' + n;
        return d.getFullYear() + '-' + p(d.getMonth()+1) + '-' + p(d.getDate()) + ' ' +
               p(d.getHours()) + ':' + p(d.getMinutes()) + ':' + p(d.getSeconds());
    }
    function uid() { return 'm_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8); }
    function isAdm(e) { return e === ADMIN; }
    function ui(e) {
        if (isAdm(e)) return { email: e, nickname: 'Badr', isAdmin: true };
        const u = C.u[e] || {};
        return { email: e, nickname: u.nickname || e.split('@')[0], isAdmin: false };
    }

    setInterval(() => { const n = Date.now(); for (const [e,t] of ONLINE) if (n-t > TTL) ONLINE.delete(e); }, 10000);

    function auth(rq, rs, nx) {
        if (!rq.session || !rq.session.user) return rs.status(401).json({ ok: false, error: 'no auth' });
        nx();
    }

    app.get('/api/chat/me', auth, (rq, rs) => {
        ONLINE.set(rq.session.user, Date.now());
        rs.json({ ok: true, me: ui(rq.session.user) });
    });

    app.get('/api/chat/online', (rq, rs) => {
        if (rq.session && rq.session.user) ONLINE.set(rq.session.user, Date.now());
        rs.json({ ok: true, online: ONLINE.size });
    });

    app.post('/api/chat/heartbeat', auth, (rq, rs) => {
        ONLINE.set(rq.session.user, Date.now());
        rs.json({ ok: true, online: ONLINE.size, me: ui(rq.session.user) });
    });

    app.get('/api/chat/messages', auth, (rq, rs) => {
        ONLINE.set(rq.session.user, Date.now());
        const since = String(rq.query.since || '');
        let list = C.m;
        if (since) {
            const i = list.findIndex(x => x.id === since);
            if (i >= 0) list = list.slice(i + 1);
        }
        list = list.slice(-200);
        rs.json({ ok: true, messages: list, total: list.length });
    });

    app.post('/api/chat/set-nickname', auth, (rq, rs) => {
        const e = rq.session.user;
        if (isAdm(e)) return rs.status(403).json({ ok: false, error: 'admin fixed' });
        let n = String(rq.body.nickname || '').trim().slice(0, 24);
        if (n.length < 2) return rs.status(400).json({ ok: false, error: 'short' });
        C.u[e] = { nickname: n, updated_at: now() };
        save();
        console.log('[chat] nickname ' + e + ' -> ' + n);
        rs.json({ ok: true, nickname: n });
    });

    app.post('/api/chat/send', auth, (rq, rs) => {
        const e = rq.session.user;
        const txt = String(rq.body.text || '').trim().slice(0, 1000);
        const ph = String(rq.body.photo || '').trim();
        const rep = String(rq.body.replyTo || '').trim();
        if (!txt && !ph) return rs.status(400).json({ ok: false, error: 'empty' });

        const info = ui(e);
        const id = uid();
        let pu = null;

        if (ph && ph.indexOf('data:image/') === 0) {
            const m = ph.match(/^data:image\/(png|jpe?g|gif|webp);base64,(.+)$/i);
            if (!m) return rs.status(400).json({ ok: false, error: 'bad img' });
            const ext = m[1].toLowerCase() === 'jpeg' ? 'jpg' : m[1].toLowerCase();
            const buf = Buffer.from(m[2], 'base64');
            if (buf.length > 5 * 1024 * 1024) return rs.status(400).json({ ok: false, error: 'big' });
            const fname = id + '.' + ext;
            try {
                fs.writeFileSync(path.join(PHOTOS, fname), buf);
                pu = '/data/chat-photos/' + fname;
            } catch (err) {
                console.error('[chat] photo save', err.message);
                return rs.status(500).json({ ok: false, error: 'photo fail' });
            }
        }

        let rt = null;
        if (rep) {
            const t = C.m.find(x => x.id === rep);
            if (t) rt = { id: t.id, nickname: t.nickname, text: (t.text || '').slice(0, 100) || (t.photo ? '\uD83D\uDCF7' : '') };
        }

        const msg = { id, user: e, nickname: info.nickname, isAdmin: info.isAdmin, text: txt, photo: pu, replyTo: rt, created_at: now() };
        C.m.push(msg);
        if (C.m.length > 2000) C.m = C.m.slice(-2000);
        save();

        console.log('[chat] msg from ' + info.nickname + ': ' + txt.slice(0, 30));
        rs.json({ ok: true, message: msg });
    });

    console.log('[chat] OK (local files)');
};
