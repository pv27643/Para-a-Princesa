// ======================
// Contador/calendário dos pintainhos (Supabase Realtime, com fallback local)
// ======================
(function () {
    const STORAGE_KEY = 'duckTaps:v1';
    const MAX_PER_DAY = 9;

    function pad2(n) { return String(n).padStart(2, '0'); }
    function toISODateLocal(d) {
        return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
    }

    // --- Armazenamento local (fallback sem Supabase) ---
    const LocalDuckStorage = {
        _onInsert: null,
        _onReset: null,
        async loadAll() {
            try {
                const raw = localStorage.getItem(STORAGE_KEY);
                return raw ? JSON.parse(raw) : [];
            } catch (_) {
                return [];
            }
        },
        async addTap(dateKey) {
            const taps = await this.loadAll();
            const tap = { tap_date: dateKey };
            taps.push(tap);
            try { localStorage.setItem(STORAGE_KEY, JSON.stringify(taps)); } catch (_) {}
            if (this._onInsert) this._onInsert(tap);
        },
        async resetAll() {
            try { localStorage.removeItem(STORAGE_KEY); } catch (_) {}
            if (this._onReset) this._onReset();
        },
        subscribe(onInsert, onReset) {
            this._onInsert = onInsert;
            this._onReset = onReset;
            // Sincroniza entre abas do mesmo browser
            window.addEventListener('storage', (e) => {
                if (e.key !== STORAGE_KEY) return;
                if (e.newValue === null) { onReset(); return; }
                try {
                    const taps = JSON.parse(e.newValue);
                    const last = taps[taps.length - 1];
                    if (last) onInsert(last);
                } catch (_) {}
            });
        }
    };

    // --- Armazenamento Supabase (sincroniza entre telemóveis) ---
    const SupabaseDuckStorage = {
        async loadAll() {
            const { data, error } = await window.supabaseClient
                .from('duck_taps')
                .select('tap_date');
            if (error) {
                console.warn('Não consegui carregar os pintainhos:', error.message);
                return [];
            }
            return data || [];
        },
        async addTap(dateKey) {
            const author = (window.getCurrentUser && window.getCurrentUser()) || null;
            const { error } = await window.supabaseClient
                .from('duck_taps')
                .insert({ tap_date: dateKey, author });
            if (error) console.warn('Não consegui guardar o pintainho:', error.message);
            // Não aplica localmente aqui: o Realtime devolve o "eco" (para nós e para o outro user)
        },
        async resetAll() {
            const { error } = await window.supabaseClient
                .from('duck_taps')
                .delete()
                .not('id', 'is', null);
            if (error) console.warn('Não consegui reiniciar os pintainhos:', error.message);
        },
        subscribe(onInsert, onReset) {
            window.supabaseClient
                .channel('duck_taps_changes')
                .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'duck_taps' }, (payload) => {
                    onInsert(payload.new);
                })
                .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'duck_taps' }, () => {
                    onReset();
                })
                .subscribe();
        }
    };

    function getDuckStorage() {
        return (window.isSupabaseConfigured && window.isSupabaseConfigured())
            ? SupabaseDuckStorage
            : LocalDuckStorage;
    }

    document.addEventListener('DOMContentLoaded', async () => {
        const widget = document.getElementById('duck-counter');
        if (!widget) return;

        const DuckStorage = getDuckStorage();
        const countEl = document.getElementById('duck-count');
        const calGrid = document.getElementById('duck-cal-grid');
        const calTitle = document.getElementById('duck-cal-title');
        const btnPrev = document.getElementById('duck-cal-prev');
        const btnNext = document.getElementById('duck-cal-next');

        let daysMap = {};
        let count = 0;
        let suppressNextClick = false;
        const now0 = new Date();
        let viewYear = now0.getFullYear();
        let viewMonth = now0.getMonth();

        function render() { countEl.textContent = String(count); }

        function renderCalendar() {
            if (!calGrid || !calTitle) return;

            const monthStart = new Date(viewYear, viewMonth, 1);
            const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
            const startOffset = (monthStart.getDay() + 6) % 7; // 0=Mon ... 6=Sun
            const monthName = monthStart.toLocaleDateString('pt-PT', { month: 'long', year: 'numeric' });
            calTitle.textContent = monthName.charAt(0).toUpperCase() + monthName.slice(1);

            calGrid.innerHTML = '';

            for (let i = 0; i < startOffset; i++) {
                const empty = document.createElement('div');
                empty.className = 'duck-cal-cell is-empty';
                empty.setAttribute('aria-hidden', 'true');
                calGrid.appendChild(empty);
            }

            for (let day = 1; day <= daysInMonth; day++) {
                const cellDate = new Date(viewYear, viewMonth, day);
                const key = toISODateLocal(cellDate);
                const hits = daysMap[key] || 0;
                const capped = Math.min(MAX_PER_DAY, Math.max(0, hits));

                const cell = document.createElement('div');
                cell.className = 'duck-cal-cell' + (capped > 0 ? ' has-ducks' : '') + (capped === 1 ? ' has-ducks-one' : '');
                cell.dataset.date = key;
                cell.setAttribute('role', 'gridcell');
                cell.setAttribute('tabindex', '0');
                cell.setAttribute('aria-label', capped > 0
                    ? `Dia ${day}: ${capped} pintainho${capped === 1 ? '' : 's'}`
                    : `Dia ${day}`);

                const dayNum = document.createElement('span');
                dayNum.className = 'duck-cal-day';
                dayNum.textContent = String(day);
                cell.appendChild(dayNum);

                if (capped > 1) {
                    const badge = document.createElement('span');
                    badge.className = 'duck-cal-badge';
                    badge.textContent = String(capped);
                    badge.setAttribute('aria-hidden', 'true');
                    cell.appendChild(badge);
                }
                calGrid.appendChild(cell);
            }
        }

        function applyTap(tap) {
            const key = tap.tap_date;
            daysMap[key] = (daysMap[key] || 0) + 1;
            count++;
            render();
            renderCalendar();
        }

        function applyReset() {
            daysMap = {};
            count = 0;
            render();
            renderCalendar();
        }

        function bump() {
            const todayKey = toISODateLocal(new Date());
            if ((daysMap[todayKey] || 0) >= MAX_PER_DAY) return;
            DuckStorage.addTap(todayKey);
            try {
                widget.animate(
                    [{ transform: 'scale(1)' }, { transform: 'scale(1.06)' }, { transform: 'scale(1)' }],
                    { duration: 180, easing: 'ease-out' }
                );
            } catch (_) {}
        }

        function resetDucks() {
            DuckStorage.resetAll();
            try {
                widget.animate(
                    [{ transform: 'scale(1)' }, { transform: 'scale(0.96)' }, { transform: 'scale(1)' }],
                    { duration: 160, easing: 'ease-out' }
                );
            } catch (_) {}
        }

        function addTapToDateKey(dateKey) {
            if ((daysMap[dateKey] || 0) >= MAX_PER_DAY) return;
            DuckStorage.addTap(dateKey);
        }

        DuckStorage.subscribe(applyTap, applyReset);

        const taps = await DuckStorage.loadAll();
        taps.forEach((t) => {
            daysMap[t.tap_date] = (daysMap[t.tap_date] || 0) + 1;
            count++;
        });
        render();
        renderCalendar();

        if (calGrid) {
            calGrid.addEventListener('click', (e) => {
                const cell = e.target && e.target.closest ? e.target.closest('.duck-cal-cell') : null;
                if (!cell || cell.classList.contains('is-empty')) return;
                const dateKey = cell.dataset.date;
                if (!dateKey) return;
                addTapToDateKey(dateKey);
            });

            calGrid.addEventListener('keydown', (e) => {
                if (e.key !== 'Enter' && e.key !== ' ') return;
                const cell = e.target && e.target.closest ? e.target.closest('.duck-cal-cell') : null;
                if (!cell || cell.classList.contains('is-empty')) return;
                const dateKey = cell.dataset.date;
                if (!dateKey) return;
                e.preventDefault();
                addTapToDateKey(dateKey);
            });
        }

        if (btnPrev) {
            btnPrev.addEventListener('click', () => {
                viewMonth -= 1;
                if (viewMonth < 0) { viewMonth = 11; viewYear -= 1; }
                renderCalendar();
            });
        }
        if (btnNext) {
            btnNext.addEventListener('click', () => {
                viewMonth += 1;
                if (viewMonth > 11) { viewMonth = 0; viewYear += 1; }
                renderCalendar();
            });
        }

        widget.addEventListener('click', (e) => {
            e.preventDefault();
            if (suppressNextClick) { suppressNextClick = false; return; }
            if (e.shiftKey) { resetDucks(); return; }
            bump();
        });
        widget.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); bump(); }
        });

        // Reset no telemóvel: pressionar e segurar
        let pressTimer = null;
        widget.addEventListener('pointerdown', (e) => {
            if (e.pointerType === 'mouse' && e.button !== 0) return;
            pressTimer = window.setTimeout(() => {
                suppressNextClick = true;
                resetDucks();
            }, 10000);
        });
        function clearPressTimer() {
            if (pressTimer) { window.clearTimeout(pressTimer); pressTimer = null; }
        }
        widget.addEventListener('pointerup', clearPressTimer);
        widget.addEventListener('pointercancel', clearPressTimer);
        widget.addEventListener('pointerleave', clearPressTimer);

        widget.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            resetDucks();
        });
    });
})();
