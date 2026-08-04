// ======================
// Datas que fazemos questão de lembrar — editável (mês/dia recorrente,
// sem ano, tal como o resto do site já assume no prémio de pontos).
// ======================
(function () {
    const STORAGE_KEY = 'loveSpecialDates:v1';
    const DEFAULT_DATES = [
        { id: 1, month_day: '06-29', description: 'Dia que nos conhecemos' },
        { id: 2, month_day: '07-02', description: 'Primeiro beijo — 14:55' },
        { id: 3, month_day: '09-15', description: 'Aniversário do Ivan' },
        { id: 4, month_day: '10-18', description: 'Aniversário da Princesa' },
        { id: 5, month_day: '12-26', description: 'Dia do pedido de namoro' }
    ];
    const MONTH_NAMES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
    function monthName(mm) {
        return MONTH_NAMES[parseInt(mm, 10) - 1] || '';
    }

    let activeUser = null;
    window.addEventListener('love:auth-ready', (e) => {
        activeUser = (e.detail && e.detail.user) || null;
        renderActiveUserPicker();
    });

    // --- Armazenamento local (fallback sem Supabase) ---
    const LocalDatesStorage = {
        _onChange: null,
        async loadAll() {
            try {
                const raw = localStorage.getItem(STORAGE_KEY);
                const list = raw ? JSON.parse(raw) : DEFAULT_DATES.slice();
                return list.slice().sort((a, b) => a.month_day.localeCompare(b.month_day));
            } catch (_) { return DEFAULT_DATES.slice(); }
        },
        async _save(list) {
            try { localStorage.setItem(STORAGE_KEY, JSON.stringify(list)); } catch (_) {}
        },
        async add(monthDay, description, author) {
            const list = await this.loadAll();
            list.push({ id: Date.now(), month_day: monthDay, description, created_by: author, created_at: new Date().toISOString() });
            await this._save(list);
            if (this._onChange) this._onChange();
        },
        async remove(id) {
            const list = await this.loadAll();
            await this._save(list.filter((d) => d.id !== id));
            if (this._onChange) this._onChange();
        },
        subscribe(onChange) {
            this._onChange = onChange;
            window.addEventListener('storage', (e) => { if (e.key === STORAGE_KEY) onChange(); });
        }
    };

    const SupabaseDatesStorage = {
        async loadAll() {
            const { data, error } = await window.supabaseClient
                .from('special_dates')
                .select('*')
                .order('month_day', { ascending: true });
            if (error) { console.warn('Não consegui carregar as datas:', error.message); return []; }
            return data || [];
        },
        async add(monthDay, description, author) {
            const { error } = await window.supabaseClient.from('special_dates').insert({
                month_day: monthDay, description, created_by: author
            });
            if (error) console.warn('Não consegui guardar a data:', error.message);
        },
        async remove(id) {
            const { error } = await window.supabaseClient.from('special_dates').delete().eq('id', id);
            if (error) console.warn('Não consegui remover a data:', error.message);
        },
        subscribe(onChange) {
            window.supabaseClient
                .channel('special_dates_changes')
                .on('postgres_changes', { event: '*', schema: 'public', table: 'special_dates' }, onChange)
                .subscribe();
        }
    };

    function getDatesStorage() {
        return (window.isSupabaseConfigured && window.isSupabaseConfigured())
            ? SupabaseDatesStorage
            : LocalDatesStorage;
    }

    // Usado por points.js para saber se hoje é uma data especial, sem
    // depender de os cartões já estarem desenhados no DOM.
    window.getSpecialDates = async function () {
        return await getDatesStorage().loadAll();
    };

    let dates = [];
    let DatesStorage = null;

    function renderList() {
        const container = document.getElementById('dates-container');
        if (!container) return;
        container.innerHTML = '';
        dates.forEach((d) => {
            const [mm, dd] = d.month_day.split('-');
            const card = document.createElement('div');
            card.className = 'date-card';
            card.dataset.date = d.month_day;

            const numberEl = document.createElement('div');
            numberEl.className = 'date-number';
            numberEl.textContent = dd;
            card.appendChild(numberEl);

            const monthEl = document.createElement('div');
            monthEl.className = 'date-month';
            monthEl.textContent = monthName(mm);
            card.appendChild(monthEl);

            const descEl = document.createElement('div');
            descEl.className = 'date-description';
            descEl.textContent = d.description;
            card.appendChild(descEl);

            const removeWrap = document.createElement('div');
            removeWrap.className = 'date-remove-wrap';

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
                await DatesStorage.remove(d.id);
                refresh();
            });

            removeWrap.appendChild(removeBtn);
            removeWrap.appendChild(confirmRow);
            card.appendChild(removeWrap);

            container.appendChild(card);
        });
    }

    async function refresh() {
        dates = await DatesStorage.loadAll();
        renderList();
    }

    function renderActiveUserPicker() {
        const picker = document.getElementById('dates-user-picker');
        if (!picker) return;
        const needsPicker = !activeUser;
        picker.hidden = !needsPicker;
        if (needsPicker) picker.querySelectorAll('button').forEach((b) => b.classList.remove('active'));
    }

    document.addEventListener('DOMContentLoaded', () => {
        const container = document.getElementById('dates-container');
        if (!container) return;

        DatesStorage = getDatesStorage();

        const picker = document.getElementById('dates-user-picker');
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

        const dayInput = document.getElementById('dates-day-input');
        const descInput = document.getElementById('dates-desc-input');
        const addBtn = document.getElementById('dates-add-btn');
        const errorEl = document.getElementById('dates-error');
        const form = document.getElementById('dates-form');
        const openFormBtn = document.getElementById('dates-open-form-btn');
        const cancelBtn = document.getElementById('dates-cancel-btn');

        function closeForm() {
            if (form) form.classList.add('vinyl-form-collapsed');
            if (openFormBtn) openFormBtn.classList.remove('vinyl-form-collapsed');
            if (dayInput) dayInput.value = '';
            if (descInput) descInput.value = '';
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
                const raw = dayInput ? dayInput.value : '';
                const description = descInput ? descInput.value.trim() : '';
                if (!raw) { if (errorEl) errorEl.textContent = 'Escolhe o dia.'; return; }
                if (!description) { if (errorEl) errorEl.textContent = 'Escreve o que se celebra.'; return; }
                const monthDay = raw.slice(5);
                if (errorEl) errorEl.textContent = 'A guardar...';
                addBtn.disabled = true;
                await DatesStorage.add(monthDay, description, activeUser);
                addBtn.disabled = false;
                closeForm();
                refresh();
            });
        }

        DatesStorage.subscribe(() => refresh());
        refresh();
    });
})();
