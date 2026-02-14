
// Imagens do jogo (18 imagens únicas)
const gameImages = [
    "Fotos/3ca951e7-fff5-41bd-bbf5-490aa32b8631.jpg",
    "Fotos/IMG_0707.jpg",
    "Fotos/IMG_0798.jpg",
    "Fotos/IMG_1244.jpg",
    "Fotos/IMG_1278.jpg",
    "Fotos/IMG_2094.jpg",
    "Fotos/IMG_2107.jpg",
    "Fotos/IMG_3783.jpg",
    "Fotos/IMG_5263.jpg",
    "Fotos/IMG_5395.jpg",
    "Fotos/IMG_5819.jpg",
    "Fotos/IMG_6704.jpg",
    "Fotos/IMG_6782.jpg",
    "Fotos/IMG_6870.jpg",
    "Fotos/IMG_8219.jpg",
    "Fotos/IMG_8825.jpg",
    "Fotos/IMG_9218.jpg",
    "Fotos/IMG_9223.jpg"
];

// Layout do Coração (mapeia índices das imagens embaralhadas para a grelha)
// null = espaço vazio, número = índice no array de imagens embaralhadas
const heartLayout = [
    [null, null, 0, 1, null, 2, 3, null, null],
    [null, 4, 5, 6, 7, 8, 9, 10, null],
    [11, 12, 13, 14, 15, 16, 17, 18, 19],
    [null, 20, 21, 22, 23, 24, 25, 26, null],
    [null, null, 27, 28, 29, 30, 31, null, null],
    [null, null, null, 32, 33, 34, null, null, null],
    [null, null, null, null, 35, null, null, null, null],
];

// Código secreto: Clicar nestas cartas específicas em sequência
// Índices 0, 1, 2, 3 correspondem à primeira linha (visual) do coração
const secretCodeSequence = [0, 1, 2, 3];
let userSequence = [];
let sequenceTimeout;

let shuffledImages = [];
let selectedCards = []; // { index, element }
let matchedIndices = [];
let isLocked = false;

document.addEventListener('DOMContentLoaded', () => {
    initGame();
    
    document.getElementById('play-again-btn').addEventListener('click', () => {
        document.getElementById('game-overlay').style.display = 'flex';
        resetGame();
    });
});

function skipGame() {
    // Em vez de só esconder, inicia a proposta
    startProposal();
}

function gameWon() {
    // Em vez de só esconder, inicia a proposta
    setTimeout(() => {
        startProposal();
    }, 500);
}

function initGame() {
    // 1. Criar pares (duplicar imagens)
    const imagePairs = [...gameImages, ...gameImages];
    
    // 2. Embaralhar
    shuffledImages = shuffleArray(imagePairs);
    
    // 3. Renderizar grelha
    renderGrid();
}

function resetGame() {
    selectedCards = [];
    matchedIndices = [];
    isLocked = false;
    document.getElementById('play-again-btn').style.display = 'none';
    initGame();
}

function shuffleArray(array) {
    const arr = [...array];
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
}

function renderGrid() {
    const gridEl = document.getElementById('game-grid');
    gridEl.innerHTML = '';

    // Iterar sobre o layout do coração
    heartLayout.forEach(row => {
        row.forEach(index => {
            if (index === null) {
                // Espaço vazio
                const spacer = document.createElement('div');
                spacer.className = 'card-spacer';
                gridEl.appendChild(spacer);
            } else {
                // Cartão
                const card = document.createElement('div');
                card.className = 'card';
                card.dataset.index = index;
                
                const cardInner = document.createElement('div');
                cardInner.className = 'card-inner';
                
                // Frente (que está virada para baixo inicialmente) -> card-back visualmente
                const cardBack = document.createElement('div');
                cardBack.className = 'card-back'; // O verso visível
                
                // Trás (a imagem) -> card-front visualmente quando virado
                const cardFront = document.createElement('div');
                cardFront.className = 'card-front';
                const img = document.createElement('img');
                img.src = shuffledImages[index];
                img.alt = 'Memory Card';
                cardFront.appendChild(img);
                
                cardInner.appendChild(cardBack);
                cardInner.appendChild(cardFront);
                card.appendChild(cardInner);
                
                card.addEventListener('click', () => handleCardClick(card, index));
                
                gridEl.appendChild(card);
            }
        });
    });
}

function handleCardClick(card, index) {
    // ----------------------------------------------------
    // Código Secreto (Cheat Code)
    // ----------------------------------------------------
    // Adiciona o índice clicado à sequência
    userSequence.push(index);
    
    // Verifica se a sequência atual corresponde ao início do código secreto
    const isMatching = userSequence.every((val, i) => val === secretCodeSequence[i]);

    if (isMatching) {
        // Se a sequência está correta e tem o tamanho certo, ativa o cheat!
        if (userSequence.length === secretCodeSequence.length) {
            console.log("Cheat code activated!");
            skipGame();
            userSequence = []; // Reset
            return; // Sai da função para não virar a carta
        }
    } else {
        // Se a sequência quebrou, tenta iniciar uma nova sequência com este clique sendo o primeiro
        if (index === secretCodeSequence[0]) {
             userSequence = [index];
        } else {
             userSequence = [];
        }
    }

    // Reset automático se demorar muito entre cliques (opcional, para evitar falsos positivos acidentais)
    clearTimeout(sequenceTimeout);
    sequenceTimeout = setTimeout(() => {
        userSequence = [];
    }, 2000); // 2 segundos para completar a sequência


    // ----------------------------------------------------
    // Lógica Normal do Jogo
    // ----------------------------------------------------
    // Validações
    if (isLocked) return;
    if (card.classList.contains('flipped')) return; // Já virada
    if (matchedIndices.includes(index)) return; // Já combinada

    // Virar carta
    card.classList.add('flipped');
    selectedCards.push({ index, element: card });

    if (selectedCards.length === 2) {
        checkMatch();
    }
}

function checkMatch() {
    isLocked = true;
    const [card1, card2] = selectedCards;
    
    const img1 = shuffledImages[card1.index];
    const img2 = shuffledImages[card2.index];

    if (img1 === img2) {
        // Match!
        matchedIndices.push(card1.index, card2.index);
        card1.element.classList.add('matched');
        card2.element.classList.add('matched');
        selectedCards = [];
        isLocked = false;
        
        // Verificar vitória
        if (matchedIndices.length === shuffledImages.length) {
            gameWon();
        }
    } else {
        // No Match
        card1.element.classList.add('incorrect');
        card2.element.classList.add('incorrect');
        
        setTimeout(() => {
            card1.element.classList.remove('flipped', 'incorrect');
            card2.element.classList.remove('flipped', 'incorrect');
            selectedCards = [];
            isLocked = false;
        }, 1000);
    }
}
