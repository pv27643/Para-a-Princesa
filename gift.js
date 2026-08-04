// ======================
// Revelação especial — mensagem única (só a primeira vez que a Maria entra
// depois disto existir) + escolha de ver tudo já ou um por dia.
// ======================
(function () {
    const STORAGE_KEY = 'loveGiftState:v1';

    // Ordem em que as novidades desta sessão vão sendo desbloqueadas no modo
    // "um por dia" — segue a ordem visual da página: primeiro o mais leve/do
    // dia a dia (estado, post-its), depois as atividades (quadro, reservar
    // dia, pontos), e os vinis por último como grande final.
    const GATED_SECTIONS = ['mood-section', 'notes-section', 'board-section', 'booking-section', 'points-section', 'vinyl-section'];
    window.LOVE_GATED_SECTIONS = GATED_SECTIONS;

    function defaultState() {
        return { maria_seen_intro: false, ivan_seen_intro: false, reveal_mode: null, reveal_started_at: null };
    }

    // Contagem por dia de calendário (não por 24h a rolar) — os novos
    // desbloqueios acontecem à meia-noite, não à hora em que alguém escolheu.
    function daysSince(iso) {
        const start = new Date(iso);
        const startMidnight = new Date(start.getFullYear(), start.getMonth(), start.getDate());
        const now = new Date();
        const nowMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        return Math.round((nowMidnight - startMidnight) / (1000 * 60 * 60 * 24));
    }
    window.loveDaysSince = daysSince;

    function lockSection(section, daysLeft) {
        section.classList.add('section-locked');
        let overlay = section.querySelector(':scope > .gated-lock-overlay');
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.className = 'gated-lock-overlay';
            section.appendChild(overlay);
        }
        overlay.innerHTML = `<span class="gated-lock-icon">🔒</span><p class="gated-lock-text">Desbloqueia daqui a ${daysLeft} dia${daysLeft === 1 ? '' : 's'}</p>`;
    }
    function unlockSection(section) {
        section.classList.remove('section-locked');
        const overlay = section.querySelector(':scope > .gated-lock-overlay');
        if (overlay) overlay.remove();
    }

    async function applySectionGating() {
        const state = await getGiftStorage().load();
        if (!state) return;
        GATED_SECTIONS.forEach((id, idx) => {
            const section = document.getElementById(id);
            if (!section) return;
            let locked = false;
            let daysLeft = 0;
            if (state.reveal_mode === 'daily' && state.reveal_started_at) {
                const elapsed = daysSince(state.reveal_started_at);
                locked = elapsed < idx;
                daysLeft = idx - elapsed;
            }
            if (locked) lockSection(section, daysLeft);
            else unlockSection(section);
        });
    }
    window.applyLoveSectionGating = applySectionGating;

    const LocalGiftStorage = {
        async load() {
            try {
                const raw = localStorage.getItem(STORAGE_KEY);
                return raw ? JSON.parse(raw) : defaultState();
            } catch (_) { return defaultState(); }
        },
        async save(patch) {
            const current = await this.load();
            const merged = Object.assign(current, patch);
            try { localStorage.setItem(STORAGE_KEY, JSON.stringify(merged)); } catch (_) {}
        }
    };

    const SupabaseGiftStorage = {
        async load() {
            const { data, error } = await window.supabaseClient.from('gift_state').select('*').eq('id', 1).single();
            if (error) { console.warn('Não consegui carregar o estado da surpresa:', error.message); return null; }
            return data;
        },
        async save(state) {
            const { error } = await window.supabaseClient.from('gift_state').update(state).eq('id', 1);
            if (error) console.warn('Não consegui guardar o estado da surpresa:', error.message);
        }
    };

    function getGiftStorage() {
        return (window.isSupabaseConfigured && window.isSupabaseConfigured())
            ? SupabaseGiftStorage
            : LocalGiftStorage;
    }

    window.getGiftState = async function () {
        return await getGiftStorage().load();
    };

    function showOverlay() {
        const el = document.getElementById('gift-overlay');
        if (el) el.classList.remove('hidden');
    }
    function hideOverlay() {
        const el = document.getElementById('gift-overlay');
        if (el) el.classList.add('hidden');
    }

    async function maybeShowGiftIntro(user) {
        const GiftStorage = getGiftStorage();
        const state = await GiftStorage.load();
        const seenKey = user === 'maria' ? 'maria_seen_intro' : 'ivan_seen_intro';
        if (!state || state[seenKey]) return;

        showOverlay();
        const messageStep = document.getElementById('gift-step-message');
        const choiceStep = document.getElementById('gift-step-choice');
        if (messageStep) messageStep.classList.remove('hidden-step');
        if (choiceStep) choiceStep.classList.add('hidden-step');

        const continueBtn = document.getElementById('gift-continue-btn');
        if (continueBtn) {
            continueBtn.onclick = () => {
                if (messageStep) messageStep.classList.add('hidden-step');
                if (choiceStep) choiceStep.classList.remove('hidden-step');
            };
        }

        const allBtn = document.getElementById('gift-choice-all');
        const dailyBtn = document.getElementById('gift-choice-daily');
        async function choose(mode) {
            // A escolha mais recente é sempre a que vale (é um estado
            // partilhado): mudar de "um por dia" para "tudo já" (ou o
            // contrário) reinicia também a contagem dos dias.
            const patch = { [seenKey]: true, reveal_mode: mode, reveal_started_at: new Date().toISOString() };
            await GiftStorage.save(patch);
            hideOverlay();
            await applySectionGating();
            const firstSection = document.getElementById(GATED_SECTIONS[0]);
            if (firstSection) setTimeout(() => firstSection.scrollIntoView({ behavior: 'smooth', block: 'start' }), 300);
            window.dispatchEvent(new CustomEvent('love:gift-revealed'));
        }
        if (allBtn) allBtn.onclick = () => choose('all');
        if (dailyBtn) dailyBtn.onclick = () => choose('daily');
    }

    window.addEventListener('love:auth-ready', async (e) => {
        const user = e.detail && e.detail.user;
        if (!user) return;
        await maybeShowGiftIntro(user);
        await applySectionGating();
    });
})();
