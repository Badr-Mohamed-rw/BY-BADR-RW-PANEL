/* chat.js — клиент чата */
(function () {
    'use strict';

    var els = {
        list: document.getElementById('chatList'),
        form: document.getElementById('chatForm'),
        input: document.getElementById('chatInput'),
        file: document.getElementById('chatFile'),
        preview: document.getElementById('chatPreview'),
        previewImg: document.getElementById('chatPreviewImg'),
        previewRemove: document.getElementById('chatPreviewRemove'),
        replyBox: document.getElementById('chatReplyBox'),
        replyNick: document.getElementById('chatReplyNick'),
        replyText: document.getElementById('chatReplyText'),
        replyCancel: document.getElementById('chatReplyCancel'),
        online: document.getElementById('chatOnline'),
        meNick: document.getElementById('chatMeNick'),
        changeNick: document.getElementById('chatChangeNick'),
        send: document.getElementById('chatSendBtn'),
        status: document.getElementById('chatStatus')
    };

    if (!els.list) return;

    var state = {
        me: null,
        messages: [],
        lastId: '',
        replyTo: null,
        photo: null,
        pollingTimer: null,
        heartbeatTimer: null
    };

    function esc(s) {
        return String(s == null ? '' : s)
            .replace(/&/g, '&amp;').replace(/</g, '&lt;')
            .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }

    function api(url, opts) {
        return fetch(url, opts || {}).then(function (r) { return r.json(); });
    }

    function form(fields) {
        var fd = new FormData();
        for (var k in fields) if (fields[k] != null) fd.append(k, fields[k]);
        return fd;
    }

    // ===== Рендер сообщения =====
    function renderMsg(m) {
        var div = document.createElement('div');
        div.className = 'chat-msg' + (m.isAdmin ? ' chat-msg-admin' : '');
        div.dataset.id = m.id;

        var avatar = document.createElement('div');
        avatar.className = 'chat-msg-avatar';
        avatar.textContent = (m.nickname || '?').charAt(0).toUpperCase();
        if (m.isAdmin) avatar.classList.add('chat-msg-avatar-admin');

        var body = document.createElement('div');
        body.className = 'chat-msg-body';

        var head = document.createElement('div');
        head.className = 'chat-msg-head';
        var nick = document.createElement('span');
        nick.className = 'chat-msg-nick';
        nick.textContent = m.nickname;
        head.appendChild(nick);
        if (m.isAdmin) {
            var check = document.createElement('span');
            check.className = 'chat-msg-check';
            check.innerHTML = '<svg viewBox="0 0 24 24" width="14" height="14"><path fill="currentColor" d="M9 16.17 4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>';
            check.title = 'Администратор';
            head.appendChild(check);
        }
        var time = document.createElement('span');
        time.className = 'chat-msg-time';
        time.textContent = (m.created_at || '').slice(11, 16);
        head.appendChild(time);
        body.appendChild(head);

        if (m.replyTo) {
            var rep = document.createElement('div');
            rep.className = 'chat-msg-reply';
            rep.innerHTML = '<b>' + esc(m.replyTo.nickname) + '</b> ' + esc(m.replyTo.text);
            body.appendChild(rep);
        }

        if (m.text) {
            var txt = document.createElement('div');
            txt.className = 'chat-msg-text';
            txt.textContent = m.text;
            body.appendChild(txt);
        }

        if (m.photo) {
            var imgWrap = document.createElement('a');
            imgWrap.className = 'chat-msg-photo';
            imgWrap.href = m.photo;
            imgWrap.target = '_blank';
            imgWrap.rel = 'noopener';
            var img = document.createElement('img');
            img.src = m.photo;
            img.alt = 'photo';
            img.loading = 'lazy';
            imgWrap.appendChild(img);
            body.appendChild(imgWrap);
        }

        var actions = document.createElement('div');
        actions.className = 'chat-msg-actions';
        var replyBtn = document.createElement('button');
        replyBtn.type = 'button';
        replyBtn.className = 'chat-msg-reply-btn';
        replyBtn.textContent = 'Ответить';
        replyBtn.onclick = function () { setReply(m); };
        actions.appendChild(replyBtn);
        body.appendChild(actions);

        div.appendChild(avatar);
        div.appendChild(body);
        return div;
    }

    function appendMessages(list) {
        var atBottom = els.list.scrollHeight - els.list.scrollTop - els.list.clientHeight < 80;
        list.forEach(function (m) {
            if (state.messages.some(x => x.id === m.id)) return;
            state.messages.push(m);
            els.list.appendChild(renderMsg(m));
        });
        if (atBottom) els.list.scrollTop = els.list.scrollHeight;
    }

    // ===== Пинг =====
    function heartbeat() {
        api('/api/chat/heartbeat', { method: 'POST' }).then(function (r) {
            if (r.ok) {
                if (els.online) els.online.textContent = r.online;
                state.me = r.me;
                if (els.meNick) els.meNick.textContent = r.me.nickname;
            }
        }).catch(function () {});
    }

    // ===== Поллинг =====
    function poll() {
        var url = '/api/chat/messages' + (state.lastId ? '?since=' + encodeURIComponent(state.lastId) : '');
        api(url).then(function (r) {
            if (r.ok && r.messages.length) {
                appendMessages(r.messages);
                state.lastId = r.messages[r.messages.length - 1].id;
            }
        }).catch(function () {});
    }

    // ===== Reply =====
    function setReply(m) {
        state.replyTo = m;
        els.replyBox.style.display = 'flex';
        els.replyNick.textContent = m.nickname;
        els.replyText.textContent = (m.text || '').slice(0, 80) || '📷 фото';
        els.input.focus();
    }

    function clearReply() {
        state.replyTo = null;
        els.replyBox.style.display = 'none';
    }

    // ===== Фото =====
    els.file.addEventListener('change', function () {
        var f = els.file.files[0];
        if (!f) return;
        if (f.size > 5 * 1024 * 1024) {
            alert('Фото больше 5 МБ');
            els.file.value = '';
            return;
        }
        var reader = new FileReader();
        reader.onload = function (e) {
            state.photo = e.target.result;
            els.previewImg.src = state.photo;
            els.preview.style.display = 'flex';
        };
        reader.readAsDataURL(f);
    });

    els.previewRemove.addEventListener('click', function () {
        state.photo = null;
        els.file.value = '';
        els.preview.style.display = 'none';
    });

    // ===== Смена ника =====
    els.changeNick.addEventListener('click', function () {
        if (state.me && state.me.isAdmin) {
            alert('Ты админ, ник фиксирован: Badr');
            return;
        }
        var cur = state.me ? state.me.nickname : '';
        var nick = prompt('Введи новый ник (2-24 символа):', cur);
        if (!nick) return;
        nick = nick.trim();
        if (nick.length < 2) { alert('Минимум 2 символа'); return; }
        api('/api/chat/set-nickname', { method: 'POST', body: form({ nickname: nick }) })
            .then(function (r) {
                if (r.ok) {
                    state.me.nickname = r.nickname;
                    if (els.meNick) els.meNick.textContent = r.nickname;
                    alert('Ник изменён: ' + r.nickname);
                } else {
                    alert(r.error || 'Ошибка');
                }
            }).catch(function () { alert('Ошибка сети'); });
    });

    // ===== Отправка =====
    els.form.addEventListener('submit', function (e) {
        e.preventDefault();
        var text = els.input.value.trim();
        if (!text && !state.photo) return;

        els.send.disabled = true;
        els.status.textContent = 'Отправка...';

        var payload = { text: text };
        if (state.photo) payload.photo = state.photo;
        if (state.replyTo) payload.replyTo = state.replyTo.id;

        api('/api/chat/send', { method: 'POST', body: form(payload) })
            .then(function (r) {
                els.send.disabled = false;
                if (r.ok) {
                    els.input.value = '';
                    els.status.textContent = '';
                    state.photo = null;
                    els.file.value = '';
                    els.preview.style.display = 'none';
                    clearReply();
                    state.messages.push(r.message);
                    els.list.appendChild(renderMsg(r.message));
                    els.list.scrollTop = els.list.scrollHeight;
                    state.lastId = r.message.id;
                } else {
                    els.status.textContent = r.error || 'Ошибка';
                }
            })
            .catch(function () {
                els.send.disabled = false;
                els.status.textContent = 'Ошибка сети';
            });
    });

    els.replyCancel.addEventListener('click', clearReply);

    // Enter отправляет, Shift+Enter переносит строку
    els.input.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            els.form.dispatchEvent(new Event('submit', { cancelable: true }));
        }
    });

    // Старт
    heartbeat();
    poll();
    state.pollingTimer = setInterval(poll, 3000);
    state.heartbeatTimer = setInterval(heartbeat, 10000);
})();
