// ======================
// Login simples por PIN (Maria / Ivan)
// ======================
// Dispara o evento 'love:auth-ready' assim que sabemos quem está a usar o
// site (ou que ainda não há Supabase configurado). Os outros módulos que
// precisam de saber "quem sou eu" (booking.js, photos.js) devem registar o
// listener deste evento no topo do ficheiro (fora de DOMContentLoaded),
// para garantir que já estão à escuta quando este evento disparar.
(function () {
    const SESSION_KEY = 'loveSiteUser:v1';
    let selectedUser = null;

    window.getCurrentUser = function () {
        try {
            return localStorage.getItem(SESSION_KEY);
        } catch (_) {
            return null;
        }
    };

    function setCurrentUser(name) {
        try {
            localStorage.setItem(SESSION_KEY, name);
        } catch (_) {}
    }

    function notifyReady(user) {
        window.dispatchEvent(new CustomEvent('love:auth-ready', { detail: { user } }));
    }

    function revealSite(user) {
        const gate = document.getElementById('auth-gate');
        if (gate) gate.classList.add('hidden');

        const badge = document.getElementById('auth-badge');
        const badgeName = document.getElementById('auth-badge-name');
        if (user && badge && badgeName) {
            badgeName.textContent = user === 'maria' ? 'Maria' : 'Ivan';
            badge.hidden = false;
        }
    }

    function showError(msg) {
        const el = document.getElementById('auth-error');
        if (el) el.textContent = msg;
    }

    document.addEventListener('DOMContentLoaded', () => {
        const gate = document.getElementById('auth-gate');
        const badge = document.getElementById('auth-badge');

        // Ainda sem Supabase configurado: não bloquear o site, mostrar tal como está
        if (!window.isSupabaseConfigured || !window.isSupabaseConfigured()) {
            if (gate) gate.classList.add('hidden');
            if (badge) badge.hidden = true;
            notifyReady(null);
            return;
        }

        // Já havia sessão guardada neste aparelho
        const existing = window.getCurrentUser();
        if (existing) {
            revealSite(existing);
            notifyReady(existing);
            return;
        }

        // Mostrar o ecrã de login
        if (!gate) {
            notifyReady(null);
            return;
        }
        gate.classList.remove('hidden');

        const userBtns = document.querySelectorAll('.auth-user-btn');
        const pinRow = document.getElementById('auth-pin-row');
        const pinInput = document.getElementById('auth-pin-input');
        const submitBtn = document.getElementById('auth-submit-btn');

        userBtns.forEach((btn) => {
            btn.addEventListener('click', () => {
                userBtns.forEach((b) => b.classList.remove('active'));
                btn.classList.add('active');
                selectedUser = btn.dataset.user;
                if (pinRow) pinRow.classList.add('visible');
                if (pinInput) { pinInput.value = ''; pinInput.focus(); }
                showError('');
            });
        });

        async function tryLogin() {
            if (!selectedUser) {
                showError('Escolhe quem és.');
                return;
            }
            const pin = pinInput ? pinInput.value.trim() : '';
            if (!pin) {
                showError('Escreve o teu PIN.');
                return;
            }
            submitBtn.disabled = true;
            showError('A verificar...');
            try {
                const { data, error } = await window.supabaseClient.rpc('verify_pin', {
                    p_name: selectedUser,
                    p_pin: pin
                });
                if (error) throw error;
                if (data === true) {
                    setCurrentUser(selectedUser);
                    showError('');
                    revealSite(selectedUser);
                    notifyReady(selectedUser);
                } else {
                    showError('PIN errado, tenta outra vez.');
                }
            } catch (err) {
                showError('Não consegui ligar ao servidor. Tenta de novo.');
            } finally {
                submitBtn.disabled = false;
            }
        }

        if (submitBtn) submitBtn.addEventListener('click', tryLogin);
        if (pinInput) {
            pinInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') tryLogin();
            });
        }
    });
})();
