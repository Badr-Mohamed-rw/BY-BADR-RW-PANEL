/* online-counter.js — счётчик онлайн, вставляется на всех страницах */
(function () {
    'use strict';

    function init() {
        if (document.getElementById('onlineCounterBadge')) return;

        var badge = document.createElement('div');
        badge.id = 'onlineCounterBadge';
        badge.style.cssText =
            'position:fixed;left:16px;bottom:16px;z-index:9998;' +
            'display:inline-flex;align-items:center;gap:8px;' +
            'background:rgba(20,24,38,0.92);backdrop-filter:blur(15px);' +
            '-webkit-backdrop-filter:blur(15px);' +
            'border:1px solid rgba(46,204,113,0.35);' +
            'color:#2ecc71;padding:8px 14px;border-radius:30px;' +
            'font-family:Montserrat,sans-serif;font-size:12px;font-weight:600;' +
            'box-shadow:0 4px 15px rgba(0,0,0,0.4);' +
            'pointer-events:none;user-select:none;';
        badge.innerHTML =
            '<span style="width:8px;height:8px;border-radius:50%;' +
            'background:#2ecc71;box-shadow:0 0 8px #2ecc71;' +
            'animation:onlineCounterPulse 1.5s infinite;"></span>' +
            '<span id="onlineCounterNum">0</span>' +
            '<span style="color:rgba(255,255,255,0.6);">онлайн</span>';

        // keyframes
        var style = document.createElement('style');
        style.textContent = '@keyframes onlineCounterPulse{50%{opacity:0.4}}';
        document.head.appendChild(style);

        document.body.appendChild(badge);

        function update() {
            fetch('/api/chat/online').then(function (r) { return r.json(); })
                .then(function (r) {
                    if (r.ok) {
                        var el = document.getElementById('onlineCounterNum');
                        if (el) el.textContent = r.online;
                    }
                }).catch(function () {});
        }

        update();
        setInterval(update, 15000);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
