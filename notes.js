// ======================
// Mural de Post-its — frases curtas afixadas um para o outro
// ======================
(function () {
    const STORAGE_KEY = 'loveNotes:v1';
    const COLORS = ['#fff6a3', '#ffd6e8', '#c8e8ff', '#d4f5d4', '#e6d9ff'];

    let activeUser = null;
    window.addEventListener('love:auth-ready', (e) => {
        activeUser = (e.detail && e.detail.user) || null;
        renderActiveUserPicker();
    });

    // --- Armazenamento local (fallback sem Supabase) ---
    const LocalNoteStorage = {
        _onChange: null,
        async loadAll() {
            try {
                const raw = localStorage.getItem(STORAGE_KEY);
                return raw ? JSON.parse(raw) : [];
            } catch (_) { return []; }
        },
        async _save(list) {
            try { localStorage.setItem(STORAGE_KEY, JSON.stringify(list)); } catch (_) {}
        },
        async add(author, text, color, rotation) {
            const list = await this.loadAll();
            list.push({ id: Date.now(), author, text, color, rotation, created_at: new Date().toISOString() });
            await this._save(list);
            if (this._onChange) this._onChange();
        },
        async remove(id) {
            const list = await this.loadAll();
            await this._save(list.filter((n) => n.id !== id));
            if (this._onChange) this._onChange();
        },
        subscribe(onChange) {
            this._onChange = onChange;
            window.addEventListener('storage', (e) => {
                if (e.key === STORAGE_KEY) onChange();
            });
        }
    };

    const SupabaseNoteStorage = {
        async loadAll() {
            const { data, error } = await window.supabaseClient
                .from('sticky_notes')
                .select('*')
                .order('created_at', { ascending: true });
            if (error) { console.warn('Não consegui carregar os post-its:', error.message); return []; }
            return data || [];
        },
        async add(author, text, color, rotation) {
            const { error } = await window.supabaseClient.from('sticky_notes').insert({ author, text, color, rotation });
            if (error) console.warn('Não consegui afixar o post-it:', error.message);
        },
        async remove(id) {
            const { error } = await window.supabaseClient.from('sticky_notes').delete().eq('id', id);
            if (error) console.warn('Não consegui remover o post-it:', error.message);
        },
        subscribe(onChange) {
            window.supabaseClient
                .channel('sticky_notes_changes')
                .on('postgres_changes', { event: '*', schema: 'public', table: 'sticky_notes' }, onChange)
                .subscribe();
        }
    };

    function getNoteStorage() {
        return (window.isSupabaseConfigured && window.isSupabaseConfigured())
            ? SupabaseNoteStorage
            : LocalNoteStorage;
    }

    function displayName(user) {
        return user === 'maria' ? 'Maria' : (user === 'ivan' ? 'Ivan' : user);
    }
    function escapeHtml(str) {
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }

    function renderActiveUserPicker() {
        const picker = document.getElementById('notes-user-picker');
        if (!picker) return;
        const needsPicker = !activeUser;
        picker.hidden = !needsPicker;
        if (needsPicker) picker.querySelectorAll('button').forEach((b) => b.classList.remove('active'));
    }

    let notes = [];
    let NoteStorage = null;
    let selectedColor = COLORS[0];

    function renderBoard() {
        const board = document.getElementById('notes-board');
        if (!board) return;
        if (notes.length === 0) {
            board.innerHTML = '<p class="notes-empty">Ainda não há post-its afixados.</p>';
            return;
        }
        board.innerHTML = '';
        notes.forEach((n) => {
            const el = document.createElement('div');
            el.className = 'sticky-note';
            el.style.background = n.color || COLORS[0];
            el.style.transform = `rotate(${n.rotation || 0}deg)`;

            const pin = document.createElement('span');
            pin.className = 'sticky-note-pin';
            pin.textContent = '📌';
            el.appendChild(pin);

            const text = document.createElement('p');
            text.className = 'sticky-note-text';
            text.textContent = n.text;
            el.appendChild(text);

            const author = document.createElement('span');
            author.className = 'sticky-note-author';
            author.textContent = '— ' + displayName(n.author);
            el.appendChild(author);

            const removeBtn = document.createElement('button');
            removeBtn.type = 'button';
            removeBtn.className = 'sticky-note-remove';
            removeBtn.setAttribute('aria-label', 'Remover post-it');
            removeBtn.textContent = '×';
            removeBtn.addEventListener('click', async () => {
                if (!confirm('Remover este post-it?')) return;
                await NoteStorage.remove(n.id);
                refresh();
            });
            el.appendChild(removeBtn);

            board.appendChild(el);
        });
    }

    async function refresh() {
        notes = await NoteStorage.loadAll();
        renderBoard();
    }

    document.addEventListener('DOMContentLoaded', () => {
        const section = document.getElementById('notes-section');
        if (!section) return;

        NoteStorage = getNoteStorage();
        const hintEl = document.getElementById('notes-sync-hint');
        if (hintEl && !(window.isSupabaseConfigured && window.isSupabaseConfigured())) {
            hintEl.textContent = '💡 Ainda sem Supabase configurado: isto fica só neste telemóvel/navegador.';
        }

        const picker = document.getElementById('notes-user-picker');
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

        const colorPicker = document.getElementById('notes-color-picker');
        if (colorPicker) {
            colorPicker.querySelectorAll('.notes-color').forEach((btn) => {
                btn.addEventListener('click', () => {
                    colorPicker.querySelectorAll('.notes-color').forEach((b) => b.classList.remove('active'));
                    btn.classList.add('active');
                    selectedColor = btn.dataset.color;
                });
            });
        }

        const textInput = document.getElementById('notes-text-input');
        const addBtn = document.getElementById('notes-add-btn');
        const errorEl = document.getElementById('notes-error');

        if (addBtn) {
            addBtn.addEventListener('click', async () => {
                if (!activeUser) { if (errorEl) errorEl.textContent = 'Escolhe quem és primeiro.'; return; }
                const text = textInput ? textInput.value.trim() : '';
                if (!text) { if (errorEl) errorEl.textContent = 'Escreve uma frase.'; return; }
                if (errorEl) errorEl.textContent = '';
                const rotation = (Math.random() * 10 - 5).toFixed(1);
                await NoteStorage.add(activeUser, text, selectedColor, rotation);
                if (textInput) textInput.value = '';
                refresh();
            });
        }
        if (textInput) {
            textInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) addBtn && addBtn.click();
            });
        }

        NoteStorage.subscribe(() => refresh());
        refresh();
    });
})();
