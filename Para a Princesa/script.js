function updateTimer() {
    const startDate = new Date("2025-07-02T14:00:00"); // Data de início - 2 de julho de 2025 às 14h
    const currentDate = new Date(); // Data atual

    const difference = currentDate - startDate; // Calcula a diferença de tempo desde o início

    // Calcula dias, horas, minutos, segundos
    const days = Math.floor(difference / (1000 * 60 * 60 * 24));
    const hours = Math.floor((difference / (1000 * 60 * 60)) % 24);
    const minutes = Math.floor((difference / (1000 * 60)) % 60);
    const seconds = Math.floor((difference / 1000) % 60);

    // Exibe o resultado
    document.getElementById("days").textContent = days.toString().padStart(2, "0");
    document.getElementById("hours").textContent = hours.toString().padStart(2, "0");
    document.getElementById("minutes").textContent = minutes.toString().padStart(2, "0");
    document.getElementById("seconds").textContent = seconds.toString().padStart(2, "0");
}

// Atualiza o contador a cada segundo
setInterval(updateTimer, 1000);

// Inicia o contador assim que a página carrega
updateTimer();

// Carrossel de imagens - muda a cada 3 segundos
let currentImageIndex = 0;
const images = document.querySelectorAll('.carousel-image');

function changeImage() {
    // Remove a classe 'active' da imagem atual
    images[currentImageIndex].classList.remove('active');
    
    // Move para a próxima imagem
    currentImageIndex = (currentImageIndex + 1) % images.length;
    
    // Adiciona a classe 'active' à nova imagem
    images[currentImageIndex].classList.add('active');
}

// Inicia o carrossel automático a cada 3 segundos
setInterval(changeImage, 3000);

// Seleciona todos os vídeos com reprodução automática
const videos = document.querySelectorAll('.auto-play-video');

// Reproduz e pausa vídeos automaticamente com base na visualização
const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
        const video = entry.target;

        if (entry.isIntersecting) {
            video.muted = true;  // Obrigatório desativar som para autoplay
            video.play();        // Reproduz vídeo quando entra na visualização
            video.classList.add('playing'); // Adiciona classe quando vídeo está reproduzindo
        } else {
            video.pause();       // Pausa vídeo quando sai da visualização
            video.classList.remove('playing'); // Remove classe quando vídeo para
        }
    });
}, { threshold: 0.7 }

);

// Aplica o observer a cada vídeo
videos.forEach(
    (video) => {
        observer.observe(video)
        video.addEventListener('click', () => {
            video.muted = false; // Ativa o som
        });
    });

