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
// Modal de perdão: abre no load, 'Não' foge quando se tenta clicar
// ======================
(function initForgiveModal(){
    const modal = document.getElementById('forgive-modal');
    const yesBtn = document.getElementById('forgive-yes');
    const noBtn = document.getElementById('forgive-no');
    const btnContainer = document.getElementById('forgive-buttons');
    if (!modal || !yesBtn || !noBtn || !btnContainer) return;

    function showModal() {
        modal.style.display = 'flex';
        modal.setAttribute('aria-hidden', 'false');
    }
    function hideModal() {
        modal.style.display = 'none';
        modal.setAttribute('aria-hidden', 'true');
    }

    // abrir sempre que a página carregar (tenta cobrir mais casos em mobile)
    window.addEventListener('load', showModal);
    document.addEventListener('DOMContentLoaded', showModal);

    // fechar apenas com 'Sim'
    function handleYes(e) {
        if (e && e.preventDefault) e.preventDefault();
        // Tentar iniciar a música de fundo quando o utilizador dá permissão (gesto do utilizador)
        try {
            const bgAudio = document.getElementById('bg-audio');
            if (bgAudio) {
                const playPromise = bgAudio.play();
                if (playPromise && playPromise.catch) {
                    playPromise.catch(() => {
                        // Alguns browsers bloqueiam autoplay; a música não irá tocar automaticamente
                    });
                }
            }
        } catch (err) {
            // ignorar erros de reprodução
            console.warn('Erro ao tentar reproduzir música de fundo:', err);
        }

        hideModal();
    }
    yesBtn.addEventListener('click', handleYes);
    yesBtn.addEventListener('pointerdown', handleYes);
    yesBtn.addEventListener('touchend', handleYes, { passive: false });

    // função que move o botão 'Não' para uma posição aleatória (mais agressiva em mobile)
    function moveNoButton() {
        const btnRect = noBtn.getBoundingClientRect();
        const modalContent = modal.querySelector('.forgive-modal-content') || modal;
        const modalRect = modalContent.getBoundingClientRect();

        // Se estamos em ecrã pequeno, usar posições fixed para fugir além do pequeno container
        const isSmall = window.innerWidth <= 480;
        let randX, randY;

        if (isSmall) {
            // permitir movimento por quase todo o ecrã, mas manter dentro dos limites do modal visual
            const padding = 12;
            const minX = padding;
            const maxX = Math.max(padding, window.innerWidth - btnRect.width - padding);
            const minY = Math.max(padding, modalRect.top + padding);
            const maxY = Math.max(minY, Math.min(window.innerHeight - btnRect.height - padding, modalRect.bottom - btnRect.height - padding));

            randX = Math.floor(Math.random() * (maxX - minX + 1)) + minX;
            randY = Math.floor(Math.random() * (maxY - minY + 1)) + minY;

            noBtn.style.position = 'fixed';
            noBtn.style.left = randX + 'px';
            noBtn.style.top = randY + 'px';
        } else {
            // desktop: manter relativo ao container de botões
            const containerRect = btnContainer.getBoundingClientRect();
            const maxX = Math.max(0, containerRect.width - btnRect.width);
            const maxY = Math.max(0, containerRect.height - btnRect.height);

            randX = Math.floor(Math.random() * (maxX + 1));
            randY = Math.floor(Math.random() * (maxY + 1));

            noBtn.style.position = 'absolute';
            noBtn.style.left = randX + 'px';
            noBtn.style.top = randY + 'px';
        }

        // efeito visual
        noBtn.style.transform = 'translate(0, 0)';
    }

    // mover quando o ponteiro/touch interage; usar pointer events para cobrir desktop + touch
    noBtn.addEventListener('pointerenter', moveNoButton);
    noBtn.addEventListener('pointerdown', function (e) { if (e && e.preventDefault) e.preventDefault(); moveNoButton(); }, { passive: false });
    noBtn.addEventListener('touchend', function (e) { if (e && e.preventDefault) e.preventDefault(); moveNoButton(); }, { passive: false });
    noBtn.addEventListener('click', function (e) { if (e && e.preventDefault) e.preventDefault(); moveNoButton(); });

    // Garantir layout inicial: centra o botão 'Sim' e arruma o 'Não' ao lado
    yesBtn.style.position = 'relative';
    // define um posicionamento inicial visível para o botão 'Não'
    noBtn.style.left = '60%';
    noBtn.style.top = '0px';
})();

