// ======================
// Reservar Dia — um propõe uma data, o outro aceita/recusa
// ======================
// À espera de 'love:auth-ready' (disparado por auth.js) para saber quem está
// a usar o site. O listener é registado já aqui em cima (fora de qualquer
// DOMContentLoaded) para garantir que está pronto quando o evento disparar.
(function () {
    const STORAGE_KEY = 'dateRequests:v1';
    const MAX_AGE_DAYS_AFTER_EVENT = 3;
    let activeUser = null;
    let activeBookingStorage = null;

    window.addEventListener('love:auth-ready', (e) => {
        activeUser = (e.detail && e.detail.user) || null;
        renderActiveUserPicker();
        // A lista já pode ter sido desenhada antes do login terminar
        // (o pedido de rede do PIN demora mais que o render inicial) —
        // sem isto, os botões Aceitar/Recusar nunca apareciam.
        if (activeBookingStorage) renderList(activeBookingStorage);
    });

    function cutoffDateISO() {
        const d = new Date();
        d.setDate(d.getDate() - MAX_AGE_DAYS_AFTER_EVENT);
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    }

    // --- Armazenamento local (fallback sem Supabase) ---
    const LocalBookingStorage = {
        _onChange: null,
        async loadAll() {
            let list;
            try {
                const raw = localStorage.getItem(STORAGE_KEY);
                list = raw ? JSON.parse(raw) : [];
            } catch (_) {
                list = [];
            }
            const cutoff = cutoffDateISO();
            const kept = list.filter((r) => r.event_date >= cutoff);
            if (kept.length !== list.length) await this.save(kept);
            return kept;
        },
        async save(list) {
            try { localStorage.setItem(STORAGE_KEY, JSON.stringify(list)); } catch (_) {}
        },
        async propose(eventDate, note, proposedBy) {
            const list = await this.loadAll();
            list.push({
                id: Date.now(),
                proposed_by: proposedBy,
                event_date: eventDate,
                note,
                status: 'pending',
                created_at: new Date().toISOString()
            });
            await this.save(list);
            if (this._onChange) this._onChange();
        },
        async decide(id, status) {
            const list = await this.loadAll();
            const item = list.find((r) => r.id === id);
            if (item) { item.status = status; item.decided_at = new Date().toISOString(); }
            await this.save(list);
            if (this._onChange) this._onChange();
        },
        subscribe(onChange) {
            this._onChange = onChange;
            window.addEventListener('storage', (e) => {
                if (e.key === STORAGE_KEY) onChange();
            });
        }
    };

    // --- Armazenamento Supabase ---
    const SupabaseBookingStorage = {
        async loadAll() {
            // Limpa pedidos cuja data já passou há mais de alguns dias
            await window.supabaseClient
                .from('date_requests')
                .delete()
                .lt('event_date', cutoffDateISO());

            const { data, error } = await window.supabaseClient
                .from('date_requests')
                .select('*')
                .order('created_at', { ascending: false });
            if (error) {
                console.warn('Não consegui carregar os pedidos de data:', error.message);
                return [];
            }
            return data || [];
        },
        async propose(eventDate, note, proposedBy) {
            const { error } = await window.supabaseClient.from('date_requests').insert({
                proposed_by: proposedBy,
                event_date: eventDate,
                note: note || null,
                status: 'pending'
            });
            if (error) console.warn('Não consegui propor a data:', error.message);
        },
        async decide(id, status) {
            const { error } = await window.supabaseClient
                .from('date_requests')
                .update({ status, decided_at: new Date().toISOString() })
                .eq('id', id);
            if (error) console.warn('Não consegui responder ao pedido:', error.message);
        },
        subscribe(onChange) {
            window.supabaseClient
                .channel('date_requests_changes')
                .on('postgres_changes', { event: '*', schema: 'public', table: 'date_requests' }, onChange)
                .subscribe();
        }
    };

    function getBookingStorage() {
        return (window.isSupabaseConfigured && window.isSupabaseConfigured())
            ? SupabaseBookingStorage
            : LocalBookingStorage;
    }

    function formatDate(iso) {
        const [y, m, d] = iso.split('-');
        return `${d}/${m}/${y}`;
    }

    function displayName(user) {
        return user === 'maria' ? 'Maria' : (user === 'ivan' ? 'Ivan' : user);
    }

    function statusLabel(status) {
        if (status === 'accepted') return '✅ Aceite';
        if (status === 'declined') return '❌ Recusado';
        return '⏳ Pendente';
    }

    function renderActiveUserPicker() {
        const picker = document.getElementById('booking-user-picker');
        if (!picker) return;
        const needsPicker = !activeUser;
        picker.hidden = !needsPicker;
        if (needsPicker) {
            picker.querySelectorAll('button').forEach((b) => b.classList.remove('active'));
        }
    }

    async function renderList(BookingStorage) {
        const listEl = document.getElementById('booking-list');
        if (!listEl) return;
        const items = await BookingStorage.loadAll();

        if (items.length === 0) {
            listEl.innerHTML = '<p class="booking-empty">Ainda não há nenhum dia reservado.</p>';
            return;
        }

        listEl.innerHTML = '';
        items.forEach((item) => {
            const row = document.createElement('div');
            row.className = 'booking-item';

            const info = document.createElement('div');
            info.className = 'booking-item-info';
            info.innerHTML = `
                <strong>${formatDate(item.event_date)}</strong>
                ${item.note ? `<span class="booking-note">${escapeHtml(item.note)}</span>` : ''}
                <span class="booking-meta">Proposto por ${displayName(item.proposed_by)} · ${statusLabel(item.status)}</span>
            `;
            row.appendChild(info);

            const canDecide = item.status === 'pending' && activeUser && activeUser !== item.proposed_by;
            if (canDecide) {
                const actions = document.createElement('div');
                actions.className = 'booking-item-actions';

                const acceptBtn = document.createElement('button');
                acceptBtn.type = 'button';
                acceptBtn.className = 'booking-accept-btn';
                acceptBtn.textContent = 'Aceitar';
                acceptBtn.addEventListener('click', () => BookingStorage.decide(item.id, 'accepted'));

                const declineBtn = document.createElement('button');
                declineBtn.type = 'button';
                declineBtn.className = 'booking-decline-btn';
                declineBtn.textContent = 'Recusar';
                declineBtn.addEventListener('click', () => BookingStorage.decide(item.id, 'declined'));

                actions.appendChild(acceptBtn);
                actions.appendChild(declineBtn);
                row.appendChild(actions);
            }

            listEl.appendChild(row);
        });
    }

    function escapeHtml(str) {
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }

    document.addEventListener('DOMContentLoaded', () => {
        const section = document.getElementById('booking-section');
        if (!section) return;

        const BookingStorage = getBookingStorage();
        activeBookingStorage = BookingStorage;
        const hintEl = document.getElementById('booking-sync-hint');
        if (hintEl && !(window.isSupabaseConfigured && window.isSupabaseConfigured())) {
            hintEl.textContent = '💡 Ainda sem Supabase configurado: isto fica só neste telemóvel/navegador.';
        }

        // Seletor "agir como" — só aparece em modo de teste local (sem login real)
        const picker = document.getElementById('booking-user-picker');
        if (picker) {
            picker.querySelectorAll('button').forEach((btn) => {
                btn.addEventListener('click', () => {
                    activeUser = btn.dataset.user;
                    picker.querySelectorAll('button').forEach((b) => b.classList.remove('active'));
                    btn.classList.add('active');
                    renderList(BookingStorage);
                });
            });
        }
        renderActiveUserPicker();

        const dateInput = document.getElementById('booking-date-input');
        const noteInput = document.getElementById('booking-note-input');
        const proposeBtn = document.getElementById('booking-propose-btn');
        const errorEl = document.getElementById('booking-error');

        if (proposeBtn) {
            proposeBtn.addEventListener('click', async () => {
                if (!activeUser) {
                    if (errorEl) errorEl.textContent = 'Escolhe quem és primeiro.';
                    return;
                }
                const eventDate = dateInput ? dateInput.value : '';
                if (!eventDate) {
                    if (errorEl) errorEl.textContent = 'Escolhe uma data.';
                    return;
                }
                if (errorEl) errorEl.textContent = '';
                await BookingStorage.propose(eventDate, noteInput ? noteInput.value.trim() : '', activeUser);
                if (dateInput) dateInput.value = '';
                if (noteInput) noteInput.value = '';
                renderList(BookingStorage);
            });
        }

        BookingStorage.subscribe(() => renderList(BookingStorage));
        renderList(BookingStorage);
    });
})();
