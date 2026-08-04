// ======================
// O Nosso Estado — humor/estado emocional de cada um, com notificação push
// ======================
(function () {
    const STORAGE_KEY = 'loveMoods:v1';

    const MOODS = [
        { key: 'happy', emoji: '😊', label: 'Feliz' },
        { key: 'loved', emoji: '😍', label: 'Apaixonado(a)' },
        { key: 'excited', emoji: '🥳', label: 'Animado(a)' },
        { key: 'normal', emoji: '😐', label: 'Normal' },
        { key: 'tired', emoji: '😴', label: 'Cansado(a)' },
        { key: 'sad', emoji: '😢', label: 'Triste' },
        { key: 'angry', emoji: '😡', label: 'Chateado(a)' },
        { key: 'anxious', emoji: '😰', label: 'Ansioso(a)' },
        { key: 'sick', emoji: '🤒', label: 'Doente' },
        { key: 'attention', emoji: '🥺', label: 'Preciso de atenção' },
        { key: 'space', emoji: '🌙', label: 'Preciso de espaço' },
        { key: 'waiting', emoji: '⏳', label: 'À espera' },
        { key: 'doubt', emoji: '🤔', label: 'Com dúvidas' },
        { key: 'dontknow', emoji: '🤷', label: 'Não sei' },
        { key: 'confused', emoji: '😵‍💫', label: 'Confuso(a)' },
        { key: 'dumb', emoji: '🤪', label: 'És burro(a)' }
    ];
    const CUSTOM_KEY = 'custom';
    const CUSTOM_EMOJI = '✍️';
    const moodByKey = {};
    MOODS.forEach((m) => { moodByKey[m.key] = m; });

    let activeUser = null;
    window.addEventListener('love:auth-ready', (e) => {
        activeUser = (e.detail && e.detail.user) || null;
        renderActiveUserPicker();
        renderPicker();
        updatePushUI();
    });

    // --- Armazenamento local (fallback sem Supabase) ---
    const LocalMoodStorage = {
        _onChange: null,
        async loadAll() {
            try {
                const raw = localStorage.getItem(STORAGE_KEY);
                return raw ? JSON.parse(raw) : {};
            } catch (_) { return {}; }
        },
        async setMood(user, moodKey, customText) {
            const all = await this.loadAll();
            all[user] = { mood_key: moodKey, mood_custom_text: customText || null, mood_updated_at: new Date().toISOString() };
            try { localStorage.setItem(STORAGE_KEY, JSON.stringify(all)); } catch (_) {}
            if (this._onChange) this._onChange();
        },
        subscribe(onChange) {
            this._onChange = onChange;
            window.addEventListener('storage', (e) => {
                if (e.key === STORAGE_KEY) onChange();
            });
        }
    };

    const SupabaseMoodStorage = {
        async loadAll() {
            const { data, error } = await window.supabaseClient
                .from('profiles')
                .select('name, mood_key, mood_updated_at, mood_custom_text');
            if (error) { console.warn('Não consegui carregar o estado:', error.message); return {}; }
            const out = {};
            (data || []).forEach((row) => {
                out[row.name] = { mood_key: row.mood_key, mood_updated_at: row.mood_updated_at, mood_custom_text: row.mood_custom_text };
            });
            return out;
        },
        async setMood(user, moodKey, customText) {
            const { error } = await window.supabaseClient
                .from('profiles')
                .update({ mood_key: moodKey, mood_custom_text: customText || null, mood_updated_at: new Date().toISOString() })
                .eq('name', user);
            if (error) console.warn('Não consegui guardar o estado:', error.message);
        },
        subscribe(onChange) {
            window.supabaseClient
                .channel('mood_changes')
                .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'profiles' }, onChange)
                .subscribe();
        }
    };

    function getMoodStorage() {
        return (window.isSupabaseConfigured && window.isSupabaseConfigured())
            ? SupabaseMoodStorage
            : LocalMoodStorage;
    }

    function timeAgo(iso) {
        if (!iso) return '';
        const diffMs = Date.now() - new Date(iso).getTime();
        const mins = Math.floor(diffMs / 60000);
        if (mins < 1) return 'agora mesmo';
        if (mins < 60) return `há ${mins} min`;
        const hours = Math.floor(mins / 60);
        if (hours < 24) return `há ${hours}h`;
        const days = Math.floor(hours / 24);
        return `há ${days}d`;
    }

    let moods = {};
    let MoodStorage = null;

    function renderCards() {
        ['maria', 'ivan'].forEach((user) => {
            const info = moods[user] || {};
            const isCustom = info.mood_key === CUSTOM_KEY;
            const mood = isCustom ? null : (moodByKey[info.mood_key] || null);
            const emojiEl = document.getElementById(`mood-emoji-${user}`);
            const labelEl = document.getElementById(`mood-label-${user}`);
            const agoEl = document.getElementById(`mood-ago-${user}`);
            if (emojiEl) emojiEl.textContent = isCustom ? CUSTOM_EMOJI : (mood ? mood.emoji : '❔');
            if (labelEl) labelEl.textContent = isCustom ? (info.mood_custom_text || 'Personalizado') : (mood ? mood.label : 'Ainda não disse');
            if (agoEl) agoEl.textContent = info.mood_updated_at ? timeAgo(info.mood_updated_at) : '';
        });
    }

    function hideCustomRow() {
        const row = document.getElementById('mood-custom-row');
        if (row) row.classList.add('hidden-step');
    }

    function renderPicker() {
        const picker = document.getElementById('mood-picker');
        if (!picker) return;
        const myInfo = activeUser ? moods[activeUser] : null;
        const myMood = myInfo ? myInfo.mood_key : null;
        picker.innerHTML = '';
        MOODS.forEach((m) => {
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'mood-option' + (m.key === myMood ? ' active' : '');
            btn.innerHTML = `<span class="mood-option-emoji">${m.emoji}</span><span class="mood-option-label">${m.label}</span>`;
            btn.addEventListener('click', async () => {
                if (!activeUser) return;
                hideCustomRow();
                await MoodStorage.setMood(activeUser, m.key);
                moods[activeUser] = { mood_key: m.key, mood_updated_at: new Date().toISOString() };
                renderCards();
                renderPicker();
                notifyOther(m);
            });
            picker.appendChild(btn);
        });

        const customBtn = document.createElement('button');
        customBtn.type = 'button';
        customBtn.className = 'mood-option' + (myMood === CUSTOM_KEY ? ' active' : '');
        customBtn.innerHTML = `<span class="mood-option-emoji">${CUSTOM_EMOJI}</span><span class="mood-option-label">Personalizado</span>`;
        customBtn.addEventListener('click', () => {
            if (!activeUser) return;
            const row = document.getElementById('mood-custom-row');
            const input = document.getElementById('mood-custom-input');
            if (input) input.value = myMood === CUSTOM_KEY && myInfo ? (myInfo.mood_custom_text || '') : '';
            if (row) { row.classList.remove('hidden-step'); }
            if (input) input.focus();
        });
        picker.appendChild(customBtn);
    }

    async function refresh() {
        moods = await MoodStorage.loadAll();
        renderCards();
        renderPicker();
    }

    function renderActiveUserPicker() {
        const picker = document.getElementById('mood-user-picker');
        if (!picker) return;
        const needsPicker = !activeUser;
        picker.hidden = !needsPicker;
        if (needsPicker) picker.querySelectorAll('button').forEach((b) => b.classList.remove('active'));
    }

    // --- Notificação push ---
    async function notifyOther(mood) {
        if (!(window.isSupabaseConfigured && window.isSupabaseConfigured())) return;
        const name = activeUser === 'maria' ? 'Maria' : 'Ivan';
        try {
            await window.supabaseClient.functions.invoke('send-push', {
                body: { user: activeUser, title: `${name} mudou de estado`, body: mood.emoji + ' ' + mood.label }
            });
        } catch (err) {
            console.warn('Não consegui avisar por notificação:', err);
        }
    }

    function urlBase64ToUint8Array(base64String) {
        const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
        const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
        const rawData = atob(base64);
        return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)));
    }

    async function updatePushUI() {
        const btn = document.getElementById('mood-push-btn');
        if (!btn) return;
        if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
            btn.textContent = 'Notificações não suportadas neste browser';
            btn.disabled = true;
            return;
        }
        if (!activeUser) { btn.disabled = true; return; }
        btn.disabled = false;
        if (Notification.permission === 'granted') {
            btn.textContent = '🔔 Notificações ativas';
        } else {
            btn.textContent = '🔔 Ativar notificações';
        }
    }

    async function enablePush() {
        const btn = document.getElementById('mood-push-btn');
        if (!activeUser || !window.isSupabaseConfigured || !window.isSupabaseConfigured()) return;
        try {
            const reg = await navigator.serviceWorker.register('/sw.js');
            const permission = await Notification.requestPermission();
            if (permission !== 'granted') {
                if (btn) btn.textContent = 'Permissão recusada';
                return;
            }
            const vapidPublicKey = window.PUSH_VAPID_PUBLIC_KEY;
            const sub = await reg.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: urlBase64ToUint8Array(vapidPublicKey)
            });
            const json = sub.toJSON();
            await window.supabaseClient.from('push_subscriptions').upsert({
                user_name: activeUser,
                endpoint: json.endpoint,
                p256dh: json.keys.p256dh,
                auth: json.keys.auth
            }, { onConflict: 'endpoint' });
            if (btn) btn.textContent = '🔔 Notificações ativas';
        } catch (err) {
            console.warn('Não consegui ativar as notificações:', err);
            if (btn) btn.textContent = 'Não consegui ativar — tenta de novo';
        }
    }

    document.addEventListener('DOMContentLoaded', () => {
        const section = document.getElementById('mood-section');
        if (!section) return;

        MoodStorage = getMoodStorage();
        const hintEl = document.getElementById('mood-sync-hint');
        if (hintEl && !(window.isSupabaseConfigured && window.isSupabaseConfigured())) {
            hintEl.textContent = '💡 Ainda sem Supabase configurado: isto fica só neste telemóvel/navegador.';
        }

        const picker = document.getElementById('mood-user-picker');
        if (picker) {
            picker.querySelectorAll('button').forEach((btn) => {
                btn.addEventListener('click', () => {
                    activeUser = btn.dataset.user;
                    picker.querySelectorAll('button').forEach((b) => b.classList.remove('active'));
                    btn.classList.add('active');
                    renderPicker();
                    updatePushUI();
                });
            });
        }
        renderActiveUserPicker();

        const pushBtn = document.getElementById('mood-push-btn');
        if (pushBtn) pushBtn.addEventListener('click', enablePush);

        const customInput = document.getElementById('mood-custom-input');
        const customSaveBtn = document.getElementById('mood-custom-save-btn');
        const customCancelBtn = document.getElementById('mood-custom-cancel-btn');
        if (customSaveBtn) {
            customSaveBtn.addEventListener('click', async () => {
                if (!activeUser) return;
                const text = customInput ? customInput.value.trim() : '';
                if (!text) return;
                await MoodStorage.setMood(activeUser, CUSTOM_KEY, text);
                moods[activeUser] = { mood_key: CUSTOM_KEY, mood_custom_text: text, mood_updated_at: new Date().toISOString() };
                hideCustomRow();
                renderCards();
                renderPicker();
                notifyOther({ emoji: CUSTOM_EMOJI, label: text });
            });
        }
        if (customCancelBtn) customCancelBtn.addEventListener('click', hideCustomRow);
        if (customInput) {
            customInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' && customSaveBtn) customSaveBtn.click();
            });
        }

        MoodStorage.subscribe(() => refresh());
        refresh();
        updatePushUI();
    });
})();
