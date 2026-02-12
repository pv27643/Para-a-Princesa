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
// Quiz do Dia dos Namorados
// ======================
(function initQuiz() {
    const questions = [
        {
            q: "Como preferem acordar no dia dos namorados?",
            options: [
                { t: "Com muitos mimos e beijinhos", v: "A" },
                { t: "A rir e a brincar", v: "B" },
                { t: "Prontos para sair e passear", v: "C" },
                { t: "A dormir até o mais tarde possível", v: "D" }
            ]
        },
        {
            q: "Qual o melhor plano para a tarde?",
            options: [
                { t: "Ver um filme romântico", v: "A" },
                { t: "Fazer algo divertido ou jogar", v: "B" },
                { t: "Ir descobrir um sítio novo", v: "C" },
                { t: "Ficar no sofá agarradinhos", v: "D" }
            ]
        },
        {
            q: "O que preferem comer?",
            options: [
                { t: "Um jantar especial à luz das velas", v: "A" },
                { t: "Pizza, hambúrguer ou algo descontraído", v: "B" },
                { t: "Experimentar um restaurante diferente", v: "C" },
                { t: "Comidinha caseira feita pelos dois", v: "D" }
            ]
        },
        {
            q: "Qual seria o presente ideal?",
            options: [
                { t: "Uma carta ou algo feito à mão", v: "A" },
                { t: "Algo engraçado que combine connosco", v: "B" },
                { t: "Uma experiência ou viagem", v: "C" },
                { t: "Algo simples e simbólico", v: "D" }
            ]
        },
        {
            q: "Sobre o que gostam de conversar?",
            options: [
                { t: "Sobre o nosso futuro e sonhos", v: "A" },
                { t: "Coisas parvas para rir muito", v: "B" },
                { t: "Novos planos e ideias", v: "C" },
                { t: "Como foi o nosso dia", v: "D" }
            ]
        },
        {
            q: "Como descrevem a vossa relação?",
            options: [
                { t: "Muito carinhosa e doce", v: "A" },
                { t: "Alegre e cheia de brincadeira", v: "B" },
                { t: "Parceiros de aventura", v: "C" },
                { t: "Calma e segura", v: "D" }
            ]
        },
        {
            q: "Para a noite ser perfeita, precisa de...",
            options: [
                { t: "Música romântica e ambiente acolhedor", v: "A" },
                { t: "Animação e boa disposição", v: "B" },
                { t: "Um passeio noturno ou vista bonita", v: "C" },
                { t: "Paz, sossego e nós os dois", v: "D" }
            ]
        },
        {
            q: "O local onde se sentem melhor?",
            options: [
                { t: "Num sítio bonito e especial", v: "A" },
                { t: "Onde haja diversão", v: "B" },
                { t: "Na natureza ou a explorar", v: "C" },
                { t: "No conforto da nossa casa", v: "D" }
            ]
        }
    ];

    const profiles = {
        "A": {
            name: "O Romântico & Carinhoso",
            calendar: [
                { period: "Manhã", action: "Pequeno-almoço na cama com mimos", question: "Preferes panquecas, croissants ou fruta fresca?" },
                { period: "Tarde", action: "Ver fotos nossas e recordar bons momentos", question: "Vemos fotos no telemóvel ou fazemos um álbum físico?" },
                { period: "Noite", action: "Jantar romântico e troca de palavras bonitas", question: "Cozinhamos algo especial ou encomendamos sushi?" }
            ]
        },
        "B": {
            name: "O Divertido & Alegre",
            calendar: [
                { period: "Manhã", action: "Começar o dia com música e brincadeiras", question: "Que playlist pomos: Pop, Rock ou Anos 80?" },
                { period: "Tarde", action: "Jogar algo ou fazer um desafio engraçado", question: "Jogamos cartas, tabuleiro ou um videojogo?" },
                { period: "Noite", action: "Filme de comédia ou jantar descontraído", question: "Vemos uma comédia romântica ou stand-up?" }
            ]
        },
        "C": {
            name: "O Aventureiro & Curioso",
            calendar: [
                { period: "Manhã", action: "Sair cedo para dar um passeio", question: "Vamos à beira-mar, ao parque ou explorar a cidade?" },
                { period: "Tarde", action: "Experimentar algo novo (lugar ou atividade)", question: "Experimentamos bowling, museu ou um café novo?" },
                { period: "Noite", action: "Ir beber um copo ou passear à noite", question: "Vamos a um bar giro ou passear sob as estrelas?" }
            ]
        },
        "D": {
            name: "O Tranquilo & Caseiro",
            calendar: [
                { period: "Manhã", action: "Preguiçar na cama sem horas", question: "Ficamos só na ronha ou vemos logo uma série?" },
                { period: "Tarde", action: "Sesta juntos ou tarde de sofá", question: "Lemos um livro juntos ou dormimos uma sesta?" },
                { period: "Noite", action: "Jantar simples e manta no sofá", question: "Pedimos pizza ou fazemos pipocas para o filme?" }
            ]
        }
    };

    let currentQuestion = 0;
    let answers = [];
    let timer = null;
    let timeLeft = 10;

    const els = {
        openBtn: document.getElementById("open-quiz-btn"),
        modal: document.getElementById("quiz-modal"),
        closeBtn: document.getElementById("close-quiz-btn"),
        overlay: document.querySelector(".quiz-modal-overlay"),
        startScreen: document.getElementById("quiz-start-screen"),
        questionScreen: document.getElementById("quiz-question-screen"),
        resultScreen: document.getElementById("quiz-result-screen"),
        questionText: document.getElementById("quiz-question-text"),
        optionsContainer: document.querySelector(".quiz-options"),
        progress: document.getElementById("quiz-progress"),
        timerBar: document.getElementById("quiz-timer-bar"),
        timerText: document.getElementById("quiz-timer-text"),
        startBtn: document.getElementById("start-quiz-btn"),
        restartBtn: document.getElementById("restart-quiz-btn"),
        domProfile: document.getElementById("result-dominant"),
        secProfile: document.getElementById("result-secondary"),
        resSequence: document.getElementById("result-sequence"),
        calendar: document.getElementById("result-calendar")
    };

    if (!els.startBtn) return; // Se o modal não existe na página, sai.

    // === Lógica Modal ===
    function openModal() {
        if(els.modal) els.modal.classList.add("open");
    }
    function closeModal() {
        if(els.modal) els.modal.classList.remove("open");
        resetQuiz(); 
    }
    
    if(els.openBtn) els.openBtn.addEventListener("click", openModal);
    if(els.closeBtn) els.closeBtn.addEventListener("click", closeModal);
    if(els.overlay) els.overlay.addEventListener("click", closeModal);
    // ====================

    function startQuiz() {
        currentQuestion = 0;
        answers = [];
        els.startScreen.classList.remove("active");
        els.resultScreen.classList.remove("active");
        els.questionScreen.classList.add("active");
        showQuestion();
    }

    function showQuestion() {
        clearInterval(timer);
        timeLeft = 10;
        updateTimerDisplay();
        
        const q = questions[currentQuestion];
        els.questionText.textContent = q.q;
        els.progress.textContent = `Pergunta ${currentQuestion + 1} de ${questions.length}`;
        els.optionsContainer.innerHTML = "";
        
        q.options.forEach(opt => {
            const btn = document.createElement("button");
            btn.className = "quiz-option-btn";
            btn.textContent = `${opt.v}) ${opt.t}`;
            btn.onclick = () => handleAnswer(opt.v);
            els.optionsContainer.appendChild(btn);
        });

        startTimer();
    }

    function startTimer() {
        timer = setInterval(() => {
            timeLeft--;
            updateTimerDisplay();
            if (timeLeft <= 0) {
                clearInterval(timer);
                alert("Tempo esgotado 😈 Tens de começar de novo.");
                resetQuiz();
            }
        }, 1000);
    }

    function updateTimerDisplay() {
        els.timerText.textContent = `${timeLeft}s`;
        const percentage = (timeLeft / 10) * 100;
        els.timerBar.style.width = `${percentage}%`;
    }

    function handleAnswer(value) {
        clearInterval(timer);
        answers.push(value);
        if (currentQuestion < questions.length - 1) {
            currentQuestion++;
            showQuestion();
        } else {
            finishQuiz();
        }
    }

    function resetQuiz() {
        clearInterval(timer);
        els.questionScreen.classList.remove("active");
        els.resultScreen.classList.remove("active");
        els.startScreen.classList.add("active");
    }

    function calculateWinner(candidates) {
        let counts = { A: 0, B: 0, C: 0, D: 0 };
        answers.forEach(a => counts[a]++);
        
        let maxVal = -1;
        candidates.forEach(c => {
             if (counts[c] > maxVal) maxVal = counts[c];
        });
        
        let winners = candidates.filter(c => counts[c] === maxVal);
        
        if (winners.length === 1) return winners[0];
        
        for (let ans of answers) {
            if (winners.includes(ans)) return ans;
        }
        
        return winners.sort()[0];
    }

    function finishQuiz() {
        els.questionScreen.classList.remove("active");
        els.resultScreen.classList.add("active");
        
        let allTypes = ["A", "B", "C", "D"];
        let dominant = calculateWinner(allTypes);
        
        let remaining = allTypes.filter(t => t !== dominant);
        let secondary = calculateWinner(remaining);
        
        els.domProfile.textContent = `${profiles[dominant].name}`;
        els.secProfile.textContent = `${profiles[secondary].name}`;
        if(els.resSequence) els.resSequence.textContent = answers.join(" - ");
        
        const calData = profiles[dominant].calendar;
        els.calendar.innerHTML = calData.map(item => `
            <div class="calendar-section">
                <h4>${item.period}: ${item.action}</h4>
                <div class="calendar-question">${item.question}</div>
            </div>
        `).join("");
    }

    els.startBtn.addEventListener("click", startQuiz);
    els.restartBtn.addEventListener("click", () => {
        resetQuiz(); 
        startQuiz(); 
    });

})();
