// ======================
// Contador de tempo
// ======================
(function initTimer() {
    const startDate = new Date("2025-07-02T14:00:00"); // Data de início
    const elDays = document.getElementById("days");
    const elHours = document.getElementById("hours");
    const elMinutes = document.getElementById("minutes");
    const elSeconds = document.getElementById("seconds");

    if (!elDays || !elHours || !elMinutes || !elSeconds) return;

    function updateTimer() {
        const currentDate = new Date();
        const difference = currentDate - startDate;
        const days = Math.floor(difference / (1000 * 60 * 60 * 24));
        const hours = Math.floor((difference / (1000 * 60 * 60)) % 24);
        const minutes = Math.floor((difference / (1000 * 60)) % 60);
        const seconds = Math.floor((difference / 1000) % 60);

        elDays.textContent = days.toString().padStart(2, "0");
        elHours.textContent = hours.toString().padStart(2, "0");
        elMinutes.textContent = minutes.toString().padStart(2, "0");
        elSeconds.textContent = seconds.toString().padStart(2, "0");
    }

    updateTimer();
    setInterval(updateTimer, 1000);
})();

// ======================
// Carrossel de imagens
// ======================
(function initCarousel() {
    const images = Array.from(document.querySelectorAll('.carousel-image'));
    if (!images.length) return;
    let currentIndex = 0;
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let interval = null;

    function show(index) {
        images[currentIndex].classList.remove('active');
        currentIndex = (index + images.length) % images.length;
        images[currentIndex].classList.add('active');
    }

    function next() { show(currentIndex + 1); }
    function prev() { show(currentIndex - 1); }

    if (!prefersReduced) {
        interval = setInterval(next, 3000);
        document.addEventListener('visibilitychange', () => {
            if (document.hidden && interval) {
                clearInterval(interval);
                interval = null;
            } else if (!document.hidden && !interval) {
                interval = setInterval(next, 3000);
            }
        });
    }

    // Controlo por teclado (setas)
    document.addEventListener('keydown', (e) => {
        if (e.key === 'ArrowRight') next();
        if (e.key === 'ArrowLeft') prev();
    });
})();

// ======================
// Vídeos auto-play somente visíveis
// ======================
(function initVideos() {
    const videos = document.querySelectorAll('.auto-play-video');
    if (!videos.length) return;

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            const video = entry.target;
            if (entry.isIntersecting) {
                video.muted = true;
                const playPromise = video.play();
                if (playPromise && playPromise.catch) {
                    playPromise.catch(() => {/* ignorar erro de autoplay */});
                }
                video.classList.add('playing');
            } else {
                video.pause();
                video.classList.remove('playing');
            }
        });
    }, { threshold: 0.6 });

    videos.forEach(video => {
        observer.observe(video);
        video.addEventListener('click', () => { video.muted = false; });
    });
})();

// ======================
// Sistema de páginas de amor
// ======================
let currentPage = 1;
const totalPages = 6;

// Conteúdo das páginas (apenas "amo-te muito" repetido)
const pagesContent = {
    1: generateLoveLines("Amo-te muito Maria", 15),
    2: generateLoveLines("Amo-te muito Marta", 15),
    3: generateLoveLines("Amo-te muito Maria", 15),
    4: generateLoveLines("Amo-te muito Marta", 15),
    5: generateLoveLines("Amo-te muito Maria", 15),
    6: `<div class="signature-content">
            <div class="signature-message">Com muito Amor</div>
            <div class="signature-name">ass: Ivan</div>
            <div class="decorative-hearts">
                <span>💕</span>
                <span>❤️</span>
                <span>💕</span>
            </div>
        </div>`
};

function generateLoveLines(text, count) {
    let html = '';
    for (let i = 0; i < count; i++) {
        html += `<div class="love-line">${text}</div>`;
    }
    return html;
}

function openLovePages() {
    currentPage = 1;
    const container = document.getElementById('love-pages-container');
    container.className = 'love-pages-visible';
    updatePageContent();
    updateNavigationButtons();
}

function closeLovePages() {
    const container = document.getElementById('love-pages-container');
    container.className = 'love-pages-hidden';
}

function nextPage() {
    if (currentPage < totalPages) {
        currentPage++;
        updatePageContent();
        updateNavigationButtons();
    }
}

function previousPage() {
    if (currentPage > 1) {
        currentPage--;
        updatePageContent();
        updateNavigationButtons();
    }
}

function updatePageContent() {
    const content = document.getElementById('page-content');
    const pageCounter = document.getElementById('page-counter');
    content.innerHTML = pagesContent[currentPage];
    pageCounter.textContent = `${currentPage}/6`;
}

function updateNavigationButtons() {
    const prevBtn = document.getElementById('prev-btn');
    const nextBtn = document.getElementById('next-btn');
    
    prevBtn.disabled = (currentPage === 1);
    nextBtn.disabled = (currentPage === totalPages);
    
    if (currentPage === totalPages) {
        nextBtn.textContent = 'Fim ❤️';
    } else {
        nextBtn.textContent = 'Próxima →';
    }
}

// Fechar com tecla ESC
document.addEventListener('keydown', function(event) {
    if (event.key === 'Escape') {
        closeLovePages();
    }
});

// ======================
// Fallback caso JS carregue tarde
// ======================
document.documentElement.classList.add('js-loaded');

// ======================
// Pedido de namoro (Sim/Não)
// ======================
(function initProposal() {
    const area = document.getElementById('proposal-area');
    const card = area ? area.closest('.proposal-card') : null;
    const yesBtn = document.getElementById('proposal-yes');
    const noBtn = document.getElementById('proposal-no');
    const message = document.getElementById('proposal-message');
    const lockEl = document.getElementById('proposal-lock');

    if (!area || !card || !yesBtn || !noBtn || !message || !lockEl) return;

    let lastMoveTs = 0;
    let enabled = false;
    let unlockInterval = null;

    function clamp(value, min, max) {
        return Math.min(Math.max(value, min), max);
    }

    function moveNoButton() {
        if (!enabled) return;
        const now = Date.now();
        if (now - lastMoveTs < 80) return;
        lastMoveTs = now;

        const areaRect = area.getBoundingClientRect();
        const noRect = noBtn.getBoundingClientRect();

        const padding = 12;
        const maxX = Math.max(padding, areaRect.width - noRect.width - padding);
        const maxY = Math.max(padding, areaRect.height - noRect.height - padding);

        const yesRect = yesBtn.getBoundingClientRect();
        const yesX = yesRect.left - areaRect.left;
        const yesY = yesRect.top - areaRect.top;

        let x = padding;
        let y = padding;
        for (let tries = 0; tries < 12; tries++) {
            x = padding + Math.random() * (maxX - padding);
            y = padding + Math.random() * (maxY - padding);

            const dx = x - yesX;
            const dy = y - yesY;
            if (Math.hypot(dx, dy) > 110) break;
        }

        x = clamp(x, padding, maxX);
        y = clamp(y, padding, maxY);

        noBtn.style.left = `${x}px`;
        noBtn.style.top = `${y}px`;
    }

    function enableProposal() {
        if (enabled) return;
        enabled = true;
        card.classList.remove('proposal-locked');
        lockEl.textContent = '';

        // Garantir posição inicial dentro da área
        noBtn.style.left = noBtn.style.left || '56%';
        noBtn.style.top = noBtn.style.top || '16px';

        // Fugir em desktop e mobile
        noBtn.addEventListener('pointerenter', moveNoButton);
        noBtn.addEventListener('pointerdown', (e) => {
            e.preventDefault();
            moveNoButton();
        });
        noBtn.addEventListener('click', (e) => {
            e.preventDefault();
            moveNoButton();
        });
        noBtn.addEventListener('focus', moveNoButton);

        // Fallback para browsers sem Pointer Events
        noBtn.addEventListener('mouseenter', moveNoButton);
        noBtn.addEventListener('touchstart', (e) => {
            e.preventDefault();
            moveNoButton();
        }, { passive: false });

        window.addEventListener('resize', moveNoButton);

        yesBtn.addEventListener('click', () => {
            message.textContent = 'Amo-te Muito ❤️';
            card.classList.add('proposal-answered');
        });
    }

    function formatRemaining(ms) {
        const totalSeconds = Math.max(0, Math.floor(ms / 1000));
        const days = Math.floor(totalSeconds / 86400);
        const hours = Math.floor((totalSeconds % 86400) / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        const seconds = totalSeconds % 60;

        const hh = String(hours).padStart(2, '0');
        const mm = String(minutes).padStart(2, '0');
        const ss = String(seconds).padStart(2, '0');
        if (days > 0) return `Falta ${days}d ${hh}:${mm}:${ss}`;
        return `Falta ${hh}:${mm}:${ss}`;
    }

    function initUnlockCountdown() {
        const now = new Date();
        const target = new Date(now);
        // target.setDate(now.getDate()); // Hoje
        target.setHours(17, 0, 0, 0);

        const section = document.querySelector('.proposal');

        const remaining = target.getTime() - Date.now();
        if (remaining <= 0) {
            enableProposal();
            if (section) section.style.display = '';
            return;
        }

        if (section) section.style.display = 'none';
        card.classList.add('proposal-locked');

        const tick = () => {
            const ms = target.getTime() - Date.now();
            if (ms <= 0) {
                if (unlockInterval) {
                    clearInterval(unlockInterval);
                    unlockInterval = null;
                }
                enableProposal();
                if (section) section.style.display = '';
                return;
            }
            lockEl.textContent = `Pedido desbloqueia hoje às 17:00 — ${formatRemaining(ms)}`;
        };

        tick();
        unlockInterval = setInterval(tick, 250);
        document.addEventListener('visibilitychange', () => {
            if (!document.hidden) tick();
        });
    }

    initUnlockCountdown();
})();

