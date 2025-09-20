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
// Fallback caso JS carregue tarde
// ======================
document.documentElement.classList.add('js-loaded');

