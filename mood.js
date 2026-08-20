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
        { key: 'dumb', emoji: '🤪', label: 'És burro(a)' },
        { key: 'hungry', emoji: '🍔', label: 'Tenho fome' },
        { key: 'thirsty', emoji: '🥤', label: 'Tenho sede' },
        { key: 'emergency', emoji: '🚨', label: 'Emergência' }
    ];
    const CUSTOM_KEY = 'custom';
    const CUSTOM_EMOJI = '✍️';
    const PHOTO_BUCKET = 'mood-photos';
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
        async setMood(user, moodKey, customText, customEmoji) {
            const all = await this.loadAll();
            all[user] = { mood_key: moodKey, mood_custom_text: customText || null, mood_custom_emoji: customEmoji || null, mood_updated_at: new Date().toISOString() };
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
                .select('name, mood_key, mood_updated_at, mood_custom_text, mood_custom_emoji, mood_custom_photo_path');
            if (error) { console.warn('Não consegui carregar o estado:', error.message); return {}; }
            const out = {};
            (data || []).forEach((row) => {
                out[row.name] = { mood_key: row.mood_key, mood_updated_at: row.mood_updated_at, mood_custom_text: row.mood_custom_text, mood_custom_emoji: row.mood_custom_emoji, mood_custom_photo_path: row.mood_custom_photo_path };
            });
            return out;
        },
        // photoOpts: { photoFile, removePhoto, previousPhotoPath }. Uma foto
        // nova substitui a anterior (apagando-a do Storage primeiro); mudar
        // para um estado fixo ou pedir a remoção também a apaga. Devolve o
        // caminho final guardado (ou null se ficou sem foto).
        async setMood(user, moodKey, customText, customEmoji, photoOpts) {
            const { photoFile, removePhoto, previousPhotoPath } = photoOpts || {};
            let photoPath = previousPhotoPath || null;

            if (photoFile) {
                if (previousPhotoPath) {
                    await window.supabaseClient.storage.from(PHOTO_BUCKET).remove([previousPhotoPath]);
                }
                const cleanName = photoFile.name.replace(/[^a-zA-Z0-9.\-_]/g, '_');
                const path = `${user}-${Date.now()}-${cleanName}`;
                const { error: uploadError } = await window.supabaseClient.storage.from(PHOTO_BUCKET).upload(path, photoFile);
                if (uploadError) {
                    console.warn('Não consegui enviar a foto do estado:', uploadError.message);
                } else {
                    photoPath = path;
                }
            } else if (removePhoto && previousPhotoPath) {
                await window.supabaseClient.storage.from(PHOTO_BUCKET).remove([previousPhotoPath]);
                photoPath = null;
            }

            const { error } = await window.supabaseClient
                .from('profiles')
                .update({ mood_key: moodKey, mood_custom_text: customText || null, mood_custom_emoji: customEmoji || null, mood_custom_photo_path: photoPath, mood_updated_at: new Date().toISOString() })
                .eq('name', user);
            if (error) console.warn('Não consegui guardar o estado:', error.message);
            return photoPath;
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

    // Sem Supabase configurado não há Storage a sério para guardar
    // ficheiros, por isso a foto do estado só existe em modo sincronizado.
    function photoUrl(path) {
        if (!path || !(window.isSupabaseConfigured && window.isSupabaseConfigured())) return null;
        return window.supabaseClient.storage.from(PHOTO_BUCKET).getPublicUrl(path).data.publicUrl;
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
            const photoEl = document.getElementById(`mood-photo-${user}`);
            const url = isCustom ? photoUrl(info.mood_custom_photo_path) : null;
            if (photoEl) {
                if (url) { photoEl.src = url; photoEl.classList.remove('hidden-step'); }
                else { photoEl.removeAttribute('src'); photoEl.classList.add('hidden-step'); }
            }
            if (emojiEl) {
                emojiEl.textContent = isCustom ? (info.mood_custom_emoji || CUSTOM_EMOJI) : (mood ? mood.emoji : '❔');
                emojiEl.classList.toggle('hidden-step', !!url);
            }
            if (labelEl) labelEl.textContent = isCustom ? (info.mood_custom_text || 'Personalizado') : (mood ? mood.label : 'Ainda não disse');
            if (agoEl) agoEl.textContent = info.mood_updated_at ? timeAgo(info.mood_updated_at) : '';
        });
    }

    // Seleção de foto pendente para o estado personalizado — só é enviada
    // (e a antiga apagada) quando se prime "Guardar".
    let pendingPhotoFile = null;
    let pendingPhotoRemoved = false;

    function showPhotoPreview(url) {
        const wrap = document.getElementById('mood-custom-photo-preview-wrap');
        const img = document.getElementById('mood-custom-photo-preview');
        if (!wrap || !img) return;
        if (url) { img.src = url; wrap.classList.remove('hidden-step'); }
        else { img.removeAttribute('src'); wrap.classList.add('hidden-step'); }
    }

    function resetPhotoPicker(existingPath) {
        pendingPhotoFile = null;
        pendingPhotoRemoved = false;
        const fileInput = document.getElementById('mood-custom-photo-input');
        if (fileInput) fileInput.value = '';
        showPhotoPreview(photoUrl(existingPath));
    }

    function hideCustomRow() {
        const row = document.getElementById('mood-custom-row');
        if (row) row.classList.add('hidden-step');
        pendingPhotoFile = null;
        pendingPhotoRemoved = false;
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
                const previousPhotoPath = moods[activeUser] && moods[activeUser].mood_custom_photo_path;
                hideCustomRow();
                await MoodStorage.setMood(activeUser, m.key, null, null, { removePhoto: true, previousPhotoPath });
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
        customBtn.innerHTML = `<span class="mood-option-emoji">${myMood === CUSTOM_KEY && myInfo && myInfo.mood_custom_emoji ? myInfo.mood_custom_emoji : CUSTOM_EMOJI}</span><span class="mood-option-label">Personalizado</span>`;
        customBtn.addEventListener('click', () => {
            if (!activeUser) return;
            const row = document.getElementById('mood-custom-row');
            const input = document.getElementById('mood-custom-input');
            const emojiInput = document.getElementById('mood-custom-emoji-input');
            const isMine = myMood === CUSTOM_KEY && myInfo;
            if (input) input.value = isMine ? (myInfo.mood_custom_text || '') : '';
            if (emojiInput) emojiInput.value = isMine ? (myInfo.mood_custom_emoji || '') : '';
            resetPhotoPicker(isMine ? myInfo.mood_custom_photo_path : null);
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
        const customEmojiInput = document.getElementById('mood-custom-emoji-input');
        const customSaveBtn = document.getElementById('mood-custom-save-btn');
        const customCancelBtn = document.getElementById('mood-custom-cancel-btn');
        if (customSaveBtn) {
            customSaveBtn.addEventListener('click', async () => {
                if (!activeUser) return;
                const text = customInput ? customInput.value.trim() : '';
                const emoji = customEmojiInput ? customEmojiInput.value.trim() : '';
                if (!text) return;
                const previousPhotoPath = moods[activeUser] && moods[activeUser].mood_custom_photo_path;
                const photoPath = await MoodStorage.setMood(activeUser, CUSTOM_KEY, text, emoji, {
                    photoFile: pendingPhotoFile,
                    removePhoto: pendingPhotoRemoved,
                    previousPhotoPath
                });
                moods[activeUser] = { mood_key: CUSTOM_KEY, mood_custom_text: text, mood_custom_emoji: emoji || null, mood_custom_photo_path: photoPath || null, mood_updated_at: new Date().toISOString() };
                hideCustomRow();
                renderCards();
                renderPicker();
                notifyOther({ emoji: emoji || CUSTOM_EMOJI, label: text });
            });
        }
        if (customCancelBtn) customCancelBtn.addEventListener('click', hideCustomRow);
        [customInput, customEmojiInput].forEach((el) => {
            if (!el) return;
            el.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' && customSaveBtn) customSaveBtn.click();
            });
        });

        // Foto opcional do estado personalizado — só disponível com Supabase
        // configurado (sem isso não há onde guardar o ficheiro a sério).
        const photoPickerWrap = document.getElementById('mood-custom-photo-picker');
        const photoConfigured = window.isSupabaseConfigured && window.isSupabaseConfigured();
        if (photoPickerWrap) photoPickerWrap.classList.toggle('hidden-step', !photoConfigured);
        if (photoConfigured) {
            const photoBtn = document.getElementById('mood-custom-photo-btn');
            const photoFileInput = document.getElementById('mood-custom-photo-input');
            const photoRemoveBtn = document.getElementById('mood-custom-photo-remove-btn');
            if (photoBtn && photoFileInput) photoBtn.addEventListener('click', () => photoFileInput.click());
            if (photoFileInput) {
                photoFileInput.addEventListener('change', () => {
                    const file = photoFileInput.files && photoFileInput.files[0];
                    if (!file) return;
                    pendingPhotoFile = file;
                    pendingPhotoRemoved = false;
                    showPhotoPreview(URL.createObjectURL(file));
                });
            }
            if (photoRemoveBtn) {
                photoRemoveBtn.addEventListener('click', () => {
                    pendingPhotoFile = null;
                    pendingPhotoRemoved = true;
                    if (photoFileInput) photoFileInput.value = '';
                    showPhotoPreview(null);
                });
            }
        }

        MoodStorage.subscribe(() => refresh());
        refresh();
        updatePushUI();
    });
})();
