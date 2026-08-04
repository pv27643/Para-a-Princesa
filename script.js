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

// O carrossel de fotos (rotação, setas do teclado) passou a ser gerido pelo
// photos.js, já que agora carrega as fotos de forma assíncrona (Supabase/local).

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

