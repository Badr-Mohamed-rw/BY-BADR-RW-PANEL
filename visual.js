(function () {
    'use strict';
    document.documentElement.setAttribute('data-theme', 'dark');
    localStorage.removeItem('bybadr_theme');
    localStorage.removeItem('bybadr_theme_v2');

    document.addEventListener('DOMContentLoaded', function () {
        var themeBtn = document.getElementById('themeToggle');
        if (themeBtn) themeBtn.remove();
    });

    document.addEventListener('DOMContentLoaded', function () {
        var canvas = document.createElement('canvas');
        canvas.id = 'particlesBg';
        canvas.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:-1;opacity:.5;';
        document.body.insertBefore(canvas, document.body.firstChild);

        var ctx = canvas.getContext('2d');
        var particles = [];
        var w = canvas.width = window.innerWidth;
        var h = canvas.height = window.innerHeight;

        function color() { return '255, 220, 140'; }
        function Particle() {
            this.x = Math.random() * w; this.y = Math.random() * h;
            this.size = Math.random() * 2 + 0.5;
            this.speedX = (Math.random() - 0.5) * 0.4;
            this.speedY = (Math.random() - 0.5) * 0.4;
            this.alpha = Math.random() * 0.5 + 0.2;
        }
        Particle.prototype.update = function () {
            this.x += this.speedX; this.y += this.speedY;
            if (this.x > w) this.x = 0; if (this.x < 0) this.x = w;
            if (this.y > h) this.y = 0; if (this.y < 0) this.y = h;
        };
        Particle.prototype.draw = function () {
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(' + color() + ', ' + this.alpha + ')';
            ctx.fill();
        };
        function init() {
            particles = [];
            var n = Math.min(70, Math.floor((w * h) / 25000));
            for (var i = 0; i < n; i++) particles.push(new Particle());
        }
        function drawConn() {
            var maxDist = 130;
            for (var i = 0; i < particles.length; i++) {
                for (var j = i + 1; j < particles.length; j++) {
                    var dx = particles[i].x - particles[j].x;
                    var dy = particles[i].y - particles[j].y;
                    var dist = Math.sqrt(dx * dx + dy * dy);
                    if (dist < maxDist) {
                        var alpha = (1 - dist / maxDist) * 0.15;
                        ctx.beginPath();
                        ctx.strokeStyle = 'rgba(' + color() + ', ' + alpha + ')';
                        ctx.lineWidth = 0.6;
                        ctx.moveTo(particles[i].x, particles[i].y);
                        ctx.lineTo(particles[j].x, particles[j].y);
                        ctx.stroke();
                    }
                }
            }
        }
        function animate() {
            ctx.clearRect(0, 0, w, h);
            drawConn();
            for (var i = 0; i < particles.length; i++) { particles[i].update(); particles[i].draw(); }
            requestAnimationFrame(animate);
        }
        init(); animate();
        var rt;
        window.addEventListener('resize', function () {
            clearTimeout(rt);
            rt = setTimeout(function () {
                w = canvas.width = window.innerWidth;
                h = canvas.height = window.innerHeight;
                init();
            }, 200);
        });
    });

    var audioCtx = null;
    function ensure() {
        try {
            if (!audioCtx) {
                var C = window.AudioContext || window.webkitAudioContext;
                if (C) audioCtx = new C();
            }
        } catch (e) { audioCtx = null; }
    }
    function playClick() {
        try {
            ensure(); if (!audioCtx) return;
            var o = audioCtx.createOscillator(), g = audioCtx.createGain();
            o.connect(g); g.connect(audioCtx.destination);
            o.type = 'sine';
            o.frequency.setValueAtTime(880, audioCtx.currentTime);
            o.frequency.exponentialRampToValueAtTime(400, audioCtx.currentTime + 0.08);
            g.gain.setValueAtTime(0.03, audioCtx.currentTime);
            g.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.1);
            o.start(audioCtx.currentTime); o.stop(audioCtx.currentTime + 0.1);
        } catch (e) {}
    }
    function playHover() {
        try {
            ensure(); if (!audioCtx) return;
            var o = audioCtx.createOscillator(), g = audioCtx.createGain();
            o.connect(g); g.connect(audioCtx.destination);
            o.type = 'sine';
            o.frequency.setValueAtTime(1200, audioCtx.currentTime);
            g.gain.setValueAtTime(0.008, audioCtx.currentTime);
            g.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.05);
            o.start(audioCtx.currentTime); o.stop(audioCtx.currentTime + 0.05);
        } catch (e) {}
    }
    document.addEventListener('DOMContentLoaded', function () {
        var sel = 'button, a, .btn-primary, .btn-download, .btn-updates, .menu-btn, .card, .tab, .server-tab';
        var els = document.querySelectorAll(sel);
        for (var i = 0; i < els.length; i++) {
            els[i].addEventListener('mouseenter', playHover);
            els[i].addEventListener('click', playClick);
        }
    });

    document.addEventListener('DOMContentLoaded', function () {
        var revealEls = document.querySelectorAll('.feature-card, .step, .screen-item, .policy-block, .release, .order-card, .shop-card');
        for (var i = 0; i < revealEls.length; i++) revealEls[i].classList.add('reveal');
        var revealed = false;
        function revealAll() {
            if (revealed) return; revealed = true;
            for (var i = 0; i < revealEls.length; i++) revealEls[i].classList.add('reveal-active');
        }
        setTimeout(revealAll, 1500);
        if ('IntersectionObserver' in window) {
            var obs = new IntersectionObserver(function (entries) {
                entries.forEach(function (en) {
                    if (en.isIntersecting) {
                        en.target.classList.add('reveal-active');
                        obs.unobserve(en.target);
                    }
                });
            }, { threshold: 0.08, rootMargin: '0px 0px -50px 0px' });
            for (var i = 0; i < revealEls.length; i++) obs.observe(revealEls[i]);
        } else { revealAll(); }
    });

    document.addEventListener('DOMContentLoaded', function () {
        var btn = document.createElement('button');
        btn.id = 'scrollTopBtn';
        btn.innerHTML = '<i class="fa-solid fa-arrow-up"></i>';
        btn.title = 'Naverh';
        document.body.appendChild(btn);
        btn.onclick = function () {
            window.scrollTo({ top: 0, behavior: 'smooth' });
            playClick();
        };
        window.addEventListener('scroll', function () {
            if (window.scrollY > 400) btn.classList.add('visible');
            else btn.classList.remove('visible');
        });
    });
})();
