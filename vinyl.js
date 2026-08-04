// ======================
// Os Nossos Vinis — um disco por mês, com foto no centro e música opcional
// ======================
(function () {
    const STORAGE_KEY = 'loveVinyls:v1';
    const BUCKET = 'photos';

    let activeUser = null;
    window.addEventListener('love:auth-ready', (e) => {
        activeUser = (e.detail && e.detail.user) || null;
        renderActiveUserPicker();
    });
    window.addEventListener('love:gift-revealed', () => refresh());

    function fileToDataUrl(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    }

    // --- Armazenamento local (fallback sem Supabase) ---
    const LocalVinylStorage = {
        _onChange: null,
        async loadAll() {
            try {
                const raw = localStorage.getItem(STORAGE_KEY);
                const list = raw ? JSON.parse(raw) : [];
                return list.sort((a, b) => a.month.localeCompare(b.month));
            } catch (_) { return []; }
        },
        async _save(list) {
            try { localStorage.setItem(STORAGE_KEY, JSON.stringify(list)); } catch (_) {}
        },
        async add(month, photoFile, audioFile, message, author) {
            const photoUrl = await fileToDataUrl(photoFile);
            const audioUrl = audioFile ? await fileToDataUrl(audioFile) : null;
            const list = await this.loadAll();
            list.push({ id: Date.now(), month, photo_url: photoUrl, audio_url: audioUrl, message, created_by: author, created_at: new Date().toISOString() });
            await this._save(list);
            if (this._onChange) this._onChange();
        },
        async remove(id) {
            const list = await this.loadAll();
            await this._save(list.filter((v) => v.id !== id));
            if (this._onChange) this._onChange();
        },
        subscribe(onChange) {
            this._onChange = onChange;
            window.addEventListener('storage', (e) => { if (e.key === STORAGE_KEY) onChange(); });
        }
    };

    const SupabaseVinylStorage = {
        async loadAll() {
            const { data, error } = await window.supabaseClient
                .from('vinyls')
                .select('*')
                .order('month', { ascending: true });
            if (error) { console.warn('Não consegui carregar os vinis:', error.message); return []; }
            return (data || []).map((row) => ({
                id: row.id,
                month: row.month,
                message: row.message,
                created_by: row.created_by,
                created_at: row.created_at,
                photo_url: window.supabaseClient.storage.from(BUCKET).getPublicUrl(row.photo_path).data.publicUrl,
                audio_url: row.audio_path
                    ? window.supabaseClient.storage.from(BUCKET).getPublicUrl(row.audio_path).data.publicUrl
                    : null,
                _photo_path: row.photo_path,
                _audio_path: row.audio_path
            }));
        },
        async add(month, photoFile, audioFile, message, author) {
            const cleanPhoto = photoFile.name.replace(/[^a-zA-Z0-9.\-_]/g, '_');
            const photoPath = `vinyl-photo-${Date.now()}-${cleanPhoto}`;
            const { error: photoErr } = await window.supabaseClient.storage.from(BUCKET).upload(photoPath, photoFile);
            if (photoErr) { console.warn('Não consegui enviar a foto do vinil:', photoErr.message); return; }

            let audioPath = null;
            if (audioFile) {
                const cleanAudio = audioFile.name.replace(/[^a-zA-Z0-9.\-_]/g, '_');
                audioPath = `vinyl-audio-${Date.now()}-${cleanAudio}`;
                const { error: audioErr } = await window.supabaseClient.storage.from(BUCKET).upload(audioPath, audioFile);
                if (audioErr) { console.warn('Não consegui enviar a música do vinil:', audioErr.message); audioPath = null; }
            }

            const { error } = await window.supabaseClient.from('vinyls').insert({
                month, photo_path: photoPath, audio_path: audioPath, message, created_by: author
            });
            if (error) console.warn('Não consegui guardar o vinil:', error.message);
        },
        async remove(id, photoPath, audioPath) {
            const paths = [photoPath];
            if (audioPath) paths.push(audioPath);
            await window.supabaseClient.storage.from(BUCKET).remove(paths);
            const { error } = await window.supabaseClient.from('vinyls').delete().eq('id', id);
            if (error) console.warn('Não consegui remover o vinil:', error.message);
        },
        subscribe(onChange) {
            window.supabaseClient
                .channel('vinyls_changes')
                .on('postgres_changes', { event: '*', schema: 'public', table: 'vinyls' }, onChange)
                .subscribe();
        }
    };

    function getVinylStorage() {
        return (window.isSupabaseConfigured && window.isSupabaseConfigured())
            ? SupabaseVinylStorage
            : LocalVinylStorage;
    }

    function monthLabel(monthStr) {
        const [y, m] = monthStr.split('-').map(Number);
        const d = new Date(y, m - 1, 1);
        const s = d.toLocaleDateString('pt-PT', { month: 'long', year: 'numeric' });
        return s.charAt(0).toUpperCase() + s.slice(1);
    }
    function escapeHtml(str) {
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }
    function daysSince(iso) {
        if (window.loveDaysSince) return window.loveDaysSince(iso);
        return Math.floor((Date.now() - new Date(iso).getTime()) / (1000 * 60 * 60 * 24));
    }

    function renderActiveUserPicker() {
        const picker = document.getElementById('vinyl-user-picker');
        if (!picker) return;
        const needsPicker = !activeUser;
        picker.hidden = !needsPicker;
        if (needsPicker) picker.querySelectorAll('button').forEach((b) => b.classList.remove('active'));
    }

    let vinyls = [];
    let VinylStorage = null;
    let currentlyPlaying = null; // {id, audioEl}

    function stopPlaying() {
        if (currentlyPlaying) {
            currentlyPlaying.audioEl.pause();
            const disc = document.querySelector(`.vinyl-disc[data-id="${currentlyPlaying.id}"]`);
            if (disc) disc.classList.remove('playing');
            currentlyPlaying = null;
        }
    }

    async function renderCollection(giftState) {
        const grid = document.getElementById('vinyl-grid');
        if (!grid) return;

        if (vinyls.length === 0) {
            grid.innerHTML = '<p class="notes-empty">Ainda não há nenhum vinil. Cria o primeiro! 🎵</p>';
            return;
        }

        let unlockedCount = vinyls.length;
        if (giftState && giftState.reveal_mode === 'daily' && giftState.reveal_started_at) {
            unlockedCount = Math.min(vinyls.length, daysSince(giftState.reveal_started_at) + 1);
        }

        grid.innerHTML = '';
        vinyls.forEach((v, idx) => {
            const locked = idx >= unlockedCount;
            const card = document.createElement('div');
            card.className = 'vinyl-card';

            const discWrap = document.createElement('div');
            discWrap.className = 'vinyl-disc-wrap';

            const disc = document.createElement('div');
            disc.className = 'vinyl-disc' + (locked ? ' locked' : '');
            disc.dataset.id = v.id;
            if (!locked) {
                disc.innerHTML = `<div class="vinyl-label" style="background-image:url('${v.photo_url}')"></div><div class="vinyl-hole"></div>`;
            } else {
                disc.innerHTML = `<div class="vinyl-locked-icon">🔒</div>`;
            }
            discWrap.appendChild(disc);

            if (!locked && v.audio_url) {
                const playBtn = document.createElement('button');
                playBtn.type = 'button';
                playBtn.className = 'vinyl-play-btn';
                playBtn.textContent = '▶';
                playBtn.addEventListener('click', () => {
                    if (currentlyPlaying && currentlyPlaying.id === v.id) {
                        stopPlaying();
                        playBtn.textContent = '▶';
                        return;
                    }
                    stopPlaying();
                    const audio = new Audio(v.audio_url);
                    audio.play().catch(() => {});
                    audio.addEventListener('ended', () => {
                        disc.classList.remove('playing');
                        playBtn.textContent = '▶';
                        currentlyPlaying = null;
                    });
                    currentlyPlaying = { id: v.id, audioEl: audio };
                    disc.classList.add('playing');
                    playBtn.textContent = '⏸';
                });
                discWrap.appendChild(playBtn);
            }

            card.appendChild(discWrap);

            const monthEl = document.createElement('span');
            monthEl.className = 'vinyl-month';
            monthEl.textContent = monthLabel(v.month);
            card.appendChild(monthEl);

            if (!locked) {
                const msgEl = document.createElement('p');
                msgEl.className = 'vinyl-message';
                msgEl.textContent = v.message;
                card.appendChild(msgEl);

                const removeWrap = document.createElement('div');
                removeWrap.className = 'vinyl-remove-wrap';

                const removeBtn = document.createElement('button');
                removeBtn.type = 'button';
                removeBtn.className = 'vinyl-remove-btn';
                removeBtn.textContent = 'Remover';

                const confirmRow = document.createElement('div');
                confirmRow.className = 'vinyl-remove-confirm vinyl-hidden';

                const question = document.createElement('span');
                question.className = 'vinyl-remove-question';
                question.textContent = 'Tens a certeza?';

                const yesBtn = document.createElement('button');
                yesBtn.type = 'button';
                yesBtn.className = 'vinyl-remove-yes-btn';
                yesBtn.textContent = 'Sim, remover';

                const noBtn = document.createElement('button');
                noBtn.type = 'button';
                noBtn.className = 'vinyl-remove-no-btn';
                noBtn.textContent = 'Cancelar';

                confirmRow.appendChild(question);
                confirmRow.appendChild(yesBtn);
                confirmRow.appendChild(noBtn);

                removeBtn.addEventListener('click', () => {
                    removeBtn.classList.add('vinyl-hidden');
                    confirmRow.classList.remove('vinyl-hidden');
                });
                noBtn.addEventListener('click', () => {
                    confirmRow.classList.add('vinyl-hidden');
                    removeBtn.classList.remove('vinyl-hidden');
                });
                yesBtn.addEventListener('click', async () => {
                    if (currentlyPlaying && currentlyPlaying.id === v.id) stopPlaying();
                    await VinylStorage.remove(v.id, v._photo_path, v._audio_path);
                    refresh();
                });

                removeWrap.appendChild(removeBtn);
                removeWrap.appendChild(confirmRow);
                card.appendChild(removeWrap);
            } else {
                const lockLabel = document.createElement('p');
                lockLabel.className = 'vinyl-locked-label';
                lockLabel.textContent = `Desbloqueia daqui a ${idx - unlockedCount + 1} dia(s)`;
                card.appendChild(lockLabel);
            }

            grid.appendChild(card);
        });
    }

    async function refresh() {
        vinyls = await VinylStorage.loadAll();
        const giftState = window.getGiftState ? await window.getGiftState() : null;
        renderCollection(shiftGiftStateForSection(giftState));
    }

    // A secção dos vinis só desbloqueia (como um todo) no seu dia da vez no
    // modo "um por dia" — o desbloqueio de 1 vinil/dia dentro da secção só
    // deve começar a contar a partir desse dia, não desde o início.
    function shiftGiftStateForSection(giftState) {
        if (!giftState || giftState.reveal_mode !== 'daily' || !giftState.reveal_started_at) return giftState;
        const order = window.LOVE_GATED_SECTIONS || [];
        const idx = order.indexOf('vinyl-section');
        if (idx <= 0) return giftState;
        const shifted = new Date(new Date(giftState.reveal_started_at).getTime() + idx * 86400000).toISOString();
        return Object.assign({}, giftState, { reveal_started_at: shifted });
    }

    document.addEventListener('DOMContentLoaded', () => {
        const section = document.getElementById('vinyl-section');
        if (!section) return;

        VinylStorage = getVinylStorage();
        const hintEl = document.getElementById('vinyl-sync-hint');
        if (hintEl && !(window.isSupabaseConfigured && window.isSupabaseConfigured())) {
            hintEl.textContent = '💡 Ainda sem Supabase configurado: isto fica só neste telemóvel/navegador.';
        }

        const picker = document.getElementById('vinyl-user-picker');
        if (picker) {
            picker.querySelectorAll('button').forEach((btn) => {
                btn.addEventListener('click', () => {
                    activeUser = btn.dataset.user;
                    picker.querySelectorAll('button').forEach((b) => b.classList.remove('active'));
                    btn.classList.add('active');
                });
            });
        }
        renderActiveUserPicker();

        const monthInput = document.getElementById('vinyl-month-input');
        if (monthInput && !monthInput.value) {
            const now = new Date();
            monthInput.value = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
        }
        const photoInput = document.getElementById('vinyl-photo-input');
        const audioInput = document.getElementById('vinyl-audio-input');
        const messageInput = document.getElementById('vinyl-message-input');
        const addBtn = document.getElementById('vinyl-add-btn');
        const errorEl = document.getElementById('vinyl-error');
        const form = document.getElementById('vinyl-form');
        const openFormBtn = document.getElementById('vinyl-open-form-btn');
        const cancelBtn = document.getElementById('vinyl-cancel-btn');

        function closeForm() {
            if (form) form.classList.add('vinyl-form-collapsed');
            if (openFormBtn) openFormBtn.classList.remove('vinyl-form-collapsed');
            if (photoInput) photoInput.value = '';
            if (audioInput) audioInput.value = '';
            if (messageInput) messageInput.value = '';
            if (errorEl) errorEl.textContent = '';
        }
        if (openFormBtn) {
            openFormBtn.addEventListener('click', () => {
                if (form) form.classList.remove('vinyl-form-collapsed');
                openFormBtn.classList.add('vinyl-form-collapsed');
            });
        }
        if (cancelBtn) cancelBtn.addEventListener('click', closeForm);

        if (addBtn) {
            addBtn.addEventListener('click', async () => {
                if (!activeUser) { if (errorEl) errorEl.textContent = 'Escolhe quem és primeiro.'; return; }
                const month = monthInput ? monthInput.value : '';
                const photoFile = photoInput && photoInput.files ? photoInput.files[0] : null;
                const audioFile = audioInput && audioInput.files ? audioInput.files[0] : null;
                const message = messageInput ? messageInput.value.trim() : '';
                if (!month) { if (errorEl) errorEl.textContent = 'Escolhe o mês.'; return; }
                if (!photoFile) { if (errorEl) errorEl.textContent = 'Escolhe uma foto.'; return; }
                if (!message) { if (errorEl) errorEl.textContent = 'Escreve uma mensagem.'; return; }
                if (errorEl) errorEl.textContent = 'A guardar...';
                addBtn.disabled = true;
                await VinylStorage.add(month, photoFile, audioFile, message, activeUser);
                addBtn.disabled = false;
                closeForm();
                refresh();
            });
        }

        VinylStorage.subscribe(() => refresh());
        refresh();
    });
})();
