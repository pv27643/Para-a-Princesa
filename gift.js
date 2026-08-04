// ======================
// Revelação especial — mensagem única (só a primeira vez que a Maria entra
// depois disto existir) + escolha de ver tudo já ou um por dia.
// ======================
(function () {
    const STORAGE_KEY = 'loveGiftState:v1';

    function defaultState() {
        return { maria_seen_intro: false, ivan_seen_intro: false, reveal_mode: null, reveal_started_at: null };
    }

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
            const patch = { [seenKey]: true };
            // A escolha (tudo/um por dia) só conta na primeira vez que alguém
            // a faz — não a voltamos a sobrescrever numa pré-visualização.
            if (!state.reveal_mode) {
                patch.reveal_mode = mode;
                patch.reveal_started_at = new Date().toISOString();
            }
            await GiftStorage.save(patch);
            hideOverlay();
            const vinylSection = document.getElementById('vinyl-section');
            if (vinylSection) setTimeout(() => vinylSection.scrollIntoView({ behavior: 'smooth', block: 'start' }), 300);
            window.dispatchEvent(new CustomEvent('love:gift-revealed'));
        }
        if (allBtn) allBtn.onclick = () => choose('all');
        if (dailyBtn) dailyBtn.onclick = () => choose('daily');
    }

    window.addEventListener('love:auth-ready', (e) => {
        const user = e.detail && e.detail.user;
        if (user) maybeShowGiftIntro(user);
    });
})();
