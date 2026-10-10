(function () {
    var CONSENT_KEY = 'cookie_consent';

    function init() {
        if (localStorage.getItem(CONSENT_KEY)) return;

        var style = document.createElement('style');
        style.innerHTML =
            '.cookie-banner{position:fixed;bottom:20px;left:20px;right:20px;max-width:700px;margin:0 auto;' +
            'background:rgba(20,24,38,0.95);backdrop-filter:blur(20px);-webkit-backdrop-filter:blur(20px);' +
            'border:1px solid rgba(255,255,255,0.15);border-radius:18px;padding:22px 26px;z-index:99999;' +
            'box-shadow:0 20px 60px rgba(0,0,0,0.6);display:flex;flex-direction:column;gap:16px;' +
            'font-family:Montserrat,sans-serif;color:#fff;animation:cookieSlideUp .4s cubic-bezier(.34,1.56,.64,1);}' +
            '@keyframes cookieSlideUp{from{opacity:0;transform:translateY(40px)}to{opacity:1;transform:translateY(0)}}' +
            '.cookie-text{font-size:13px;line-height:1.6;color:rgba(255,255,255,.8);}' +
            '.cookie-text b{color:#fff}.cookie-text a{color:#5dade2;text-decoration:none}' +
            '.cookie-text a:hover{text-decoration:underline}' +
            '.cookie-actions{display:flex;gap:10px;flex-wrap:wrap}' +
            '.cookie-btn{flex:1;padding:12px 20px;border-radius:10px;font-family:Montserrat,sans-serif;' +
            'font-size:13px;font-weight:600;cursor:pointer;transition:.25s;border:1px solid;min-width:140px;}' +
            '.cookie-btn-accept{background:#fff;color:#000;border-color:#fff}' +
            '.cookie-btn-accept:hover{transform:translateY(-2px);box-shadow:0 8px 20px rgba(255,255,255,.2)}' +
            '.cookie-btn-decline{background:rgba(255,255,255,.05);color:rgba(255,255,255,.7);border-color:rgba(255,255,255,.15)}' +
            '.cookie-btn-decline:hover{background:rgba(231,76,60,.2);border-color:rgba(231,76,60,.5);color:#e74c3c}' +
            '@media(max-width:600px){.cookie-banner{left:10px;right:10px;bottom:10px;padding:18px}' +
            '.cookie-actions{flex-direction:column}.cookie-btn{width:100%}}';
        document.head.appendChild(style);

        var banner = document.createElement('div');
        banner.className = 'cookie-banner';
        banner.innerHTML =
            '<div class="cookie-text">🍪 Мы используем <b>cookie</b> чтобы ты не вылетал из аккаунта. ' +
            'Подробнее — <a href="privacy.html" target="_blank">политика конфиденциальности</a>.</div>' +
            '<div class="cookie-actions">' +
            '<button class="cookie-btn cookie-btn-accept" data-action="accept"><i class="fa-solid fa-check"></i> Принять</button>' +
            '<button class="cookie-btn cookie-btn-decline" data-action="decline"><i class="fa-solid fa-xmark"></i> Отклонить</button>' +
            '</div>';
        document.body.appendChild(banner);

        var btns = banner.querySelectorAll('.cookie-btn');
        for (var i = 0; i < btns.length; i++) {
            btns[i].onclick = function () {
                var action = this.dataset.action;
                localStorage.setItem(CONSENT_KEY, action);
                fetch('/api/cookie-consent', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                    body: 'consent=' + action
                }).catch(function () {});
                banner.style.opacity = '0';
                banner.style.transform = 'translateY(40px)';
                setTimeout(function () { banner.remove(); }, 350);
            };
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
