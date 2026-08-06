// ======================
// Despesas da Viagem Lisboa — página pública (sem PIN), para dar para
// adicionar despesas no telemóvel durante a viagem sem fricção.
// ======================
(function () {
    const STORAGE_KEY = 'tripExpenses:v1';
    const CATEGORY_LABELS = {
        comida: '🍔 Comida',
        transporte: '🚌 Transporte',
        atividades: '🎟️ Atividades',
        compras: '🛍️ Compras',
        outro: '📦 Outro'
    };

    const LocalExpenseStorage = {
        _onChange: null,
        async loadAll() {
            try {
                const raw = localStorage.getItem(STORAGE_KEY);
                const list = raw ? JSON.parse(raw) : [];
                return list.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
            } catch (_) { return []; }
        },
        async add(descricao, valor, categoria, quem) {
            const list = await this.loadAll();
            list.push({
                id: Date.now(),
                descricao, valor, categoria: categoria || null, quem: quem || null,
                created_at: new Date().toISOString()
            });
            try { localStorage.setItem(STORAGE_KEY, JSON.stringify(list)); } catch (_) {}
            if (this._onChange) this._onChange();
        },
        async remove(id) {
            const list = await this.loadAll();
            try { localStorage.setItem(STORAGE_KEY, JSON.stringify(list.filter((e) => e.id !== id))); } catch (_) {}
            if (this._onChange) this._onChange();
        },
        subscribe(onChange) {
            this._onChange = onChange;
            window.addEventListener('storage', (e) => { if (e.key === STORAGE_KEY) onChange(); });
        }
    };

    const SupabaseExpenseStorage = {
        async loadAll() {
            const { data, error } = await window.supabaseClient
                .from('trip_expenses')
                .select('*')
                .order('created_at', { ascending: false });
            if (error) { console.warn('Não consegui carregar as despesas:', error.message); return []; }
            return data || [];
        },
        async add(descricao, valor, categoria, quem) {
            const { error } = await window.supabaseClient.from('trip_expenses').insert({
                descricao, valor, categoria: categoria || null, quem: quem || null
            });
            if (error) console.warn('Não consegui guardar a despesa:', error.message);
        },
        async remove(id) {
            const { error } = await window.supabaseClient.from('trip_expenses').delete().eq('id', id);
            if (error) console.warn('Não consegui remover a despesa:', error.message);
        },
        subscribe(onChange) {
            window.supabaseClient
                .channel('trip_expenses_changes')
                .on('postgres_changes', { event: '*', schema: 'public', table: 'trip_expenses' }, onChange)
                .subscribe();
        }
    };

    function getExpenseStorage() {
        return (window.isSupabaseConfigured && window.isSupabaseConfigured())
            ? SupabaseExpenseStorage
            : LocalExpenseStorage;
    }

    function escapeHtml(str) {
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }

    function formatMoney(n) {
        return n.toLocaleString('pt-PT', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €';
    }

    function formatDate(iso) {
        return new Date(iso).toLocaleDateString('pt-PT', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
    }

    let expenses = [];
    let ExpenseStorage = null;

    function renderTotal() {
        const totalEl = document.getElementById('expenses-total');
        if (!totalEl) return;
        const total = expenses.reduce((sum, e) => sum + Number(e.valor), 0);
        totalEl.textContent = formatMoney(total);
    }

    function renderBreakdown() {
        const el = document.getElementById('expenses-breakdown');
        if (!el) return;
        const byCategory = {};
        expenses.forEach((e) => {
            const key = e.categoria || 'outro';
            byCategory[key] = (byCategory[key] || 0) + Number(e.valor);
        });
        const keys = Object.keys(byCategory);
        if (keys.length === 0) {
            el.innerHTML = '<p class="expenses-empty">Ainda não há despesas.</p>';
            return;
        }
        el.innerHTML = keys.map((key) => `
            <div class="expenses-breakdown-item">
                <span>${CATEGORY_LABELS[key] || escapeHtml(key)}</span>
                <strong>${formatMoney(byCategory[key])}</strong>
            </div>
        `).join('');
    }

    function renderList() {
        const listEl = document.getElementById('expenses-list');
        if (!listEl) return;
        if (expenses.length === 0) {
            listEl.innerHTML = '<p class="expenses-empty">Ainda não há despesas registadas.</p>';
            return;
        }
        listEl.innerHTML = '';
        expenses.forEach((e) => {
            const row = document.createElement('div');
            row.className = 'expense-item';
            row.innerHTML = `
                <div class="expense-item-info">
                    <strong>${escapeHtml(e.descricao)}</strong>
                    <span class="expense-meta">
                        ${e.categoria ? (CATEGORY_LABELS[e.categoria] || escapeHtml(e.categoria)) + ' · ' : ''}
                        ${e.quem ? escapeHtml(e.quem) + ' · ' : ''}
                        ${formatDate(e.created_at)}
                    </span>
                </div>
                <div class="expense-item-value">${formatMoney(Number(e.valor))}</div>
            `;
            listEl.appendChild(row);
        });
    }

    async function refresh() {
        expenses = await ExpenseStorage.loadAll();
        renderTotal();
        renderBreakdown();
        renderList();
    }

    document.addEventListener('DOMContentLoaded', () => {
        ExpenseStorage = getExpenseStorage();

        const hintEl = document.getElementById('expenses-sync-hint');
        if (hintEl && !(window.isSupabaseConfigured && window.isSupabaseConfigured())) {
            hintEl.textContent = '💡 Ainda sem Supabase configurado: isto fica só neste telemóvel/navegador.';
        }

        const descInput = document.getElementById('expense-desc-input');
        const valorInput = document.getElementById('expense-valor-input');
        const categoriaSelect = document.getElementById('expense-categoria-select');
        const quemInput = document.getElementById('expense-quem-input');
        const addBtn = document.getElementById('expense-add-btn');
        const errorEl = document.getElementById('expense-error');

        if (addBtn) {
            addBtn.addEventListener('click', async () => {
                const descricao = descInput ? descInput.value.trim() : '';
                const valor = valorInput ? parseFloat(valorInput.value.replace(',', '.')) : NaN;
                const categoria = categoriaSelect ? categoriaSelect.value : '';
                const quem = quemInput ? quemInput.value.trim() : '';
                if (!descricao) { if (errorEl) errorEl.textContent = 'Escreve a descrição.'; return; }
                if (!valor || isNaN(valor) || valor <= 0) { if (errorEl) errorEl.textContent = 'Escreve um valor válido.'; return; }
                if (errorEl) errorEl.textContent = '';
                addBtn.disabled = true;
                await ExpenseStorage.add(descricao, valor, categoria, quem);
                addBtn.disabled = false;
                if (descInput) descInput.value = '';
                if (valorInput) valorInput.value = '';
                if (quemInput) quemInput.value = '';
                refresh();
            });
        }

        ExpenseStorage.subscribe(() => refresh());
        refresh();
    });
})();
