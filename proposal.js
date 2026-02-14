
let currentStep = 0;
let noBtnPosition = { top: 'auto', left: 'auto' };

function startProposal() {
    const gameOverlay = document.getElementById('game-overlay');
    const proposalOverlay = document.getElementById('proposal-overlay');
    
    // Hide game
    if (gameOverlay) {
        gameOverlay.style.opacity = '0';
        setTimeout(() => {
            gameOverlay.style.display = 'none';
        }, 500);
    }
    
    // Show proposal
    if (proposalOverlay) {
        proposalOverlay.style.display = 'flex';
        // Force reflow
        void proposalOverlay.offsetWidth;
        
        // Start Step 0
        setStep(0);
    }
}

function setStep(step) {
    currentStep = step;
    const steps = document.querySelectorAll('.proposal-step');
    
    steps.forEach((el, index) => {
        if (index === step) {
            el.classList.add('active');
        } else {
            el.classList.remove('active');
        }
    });
    
    // Step logic
    if (step === 0) {
        setTimeout(() => setStep(1), 4000);
    } else if (step === 1) {
        setTimeout(() => setStep(2), 4000);
    } else if (step === 2) {
        initNoButton();
    } else if (step === 3) {
        startFireworks();
    }
}

function initNoButton() {
    const noBtn = document.getElementById('btn-no');
    if (!noBtn) return;
    
    const moveButton = () => {
        const x = Math.random() * (window.innerWidth - noBtn.offsetWidth - 20);
        const y = Math.random() * (window.innerHeight - noBtn.offsetHeight - 20);
        
        noBtn.style.position = 'absolute';
        noBtn.style.left = `${x}px`;
        noBtn.style.top = `${y}px`;
    };
    
    noBtn.addEventListener('mouseover', moveButton);
    noBtn.addEventListener('touchstart', (e) => {
        e.preventDefault(); // Prevent click
        moveButton();
    });
    noBtn.addEventListener('click', (e) => {
        e.preventDefault();
        moveButton();
    });
}

function handleYes() {
    setStep(3);
}

function startFireworks() {
    // Basic explosion using the existing heart/confetti system or simple CSS
    // For now, we rely on the GIF in step 3.
    // Confetti logic can be added here if available.
    
    // Optional: Reveal site button after a few seconds
    setTimeout(() => {
        const revealBtn = document.getElementById('reveal-site-btn');
        if (revealBtn) {
            revealBtn.style.display = 'inline-block';
            revealBtn.style.opacity = '0';
            setTimeout(() => revealBtn.style.opacity = '1', 100);
        }
    }, 3000);
}

function revealSite() {
    const proposalOverlay = document.getElementById('proposal-overlay');
    proposalOverlay.style.opacity = '0';
    setTimeout(() => {
        proposalOverlay.style.display = 'none';
        
        // Ensure Play Again is visible on main site
        const playAgainBtn = document.getElementById('play-again-btn');
        if (playAgainBtn) playAgainBtn.style.display = 'inline-block';
    }, 1000);
}
