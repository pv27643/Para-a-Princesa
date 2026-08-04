// ======================
// Pontos, loja de trocas e fotos de perfil
// ======================
// À espera de 'love:auth-ready' (disparado por auth.js) para saber quem está
// a usar o site — necessário para o prémio diário e para saber quem pode
// aceitar/recusar cada troca.
(function () {
    const POINTS_KEY = 'lovePoints:v1';
    const TRADES_KEY = 'loveTrades:v1';
    const PROFILES_KEY = 'loveProfiles:v1';
    const BUCKET = 'photos';

    let activeUser = null;
    window.addEventListener('love:auth-ready', (e) => {
        activeUser = (e.detail && e.detail.user) || null;
        renderActiveUserPicker();
        awardDailyLoginBonus();
        if (activePointsStorage) refreshPoints();
        if (activeTradeStorage) refreshTrades();
    });

    function todayISO() {
        const d = new Date();
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    }
    function todayMonthDay() {
        const d = new Date();
        return `${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    }
    async function specialDateInfo() {
        if (!window.getSpecialDates) return null;
        const md = todayMonthDay();
        const dates = await window.getSpecialDates();
        const match = dates.find((d) => d.month_day === md);
        return match ? match.description : null;
    }

    // --- Armazenamento local (fallback sem Supabase) ---
    const LocalPointsStorage = {
        _onChange: null,
        async loadAll() {
            try {
                const raw = localStorage.getItem(POINTS_KEY);
                return raw ? JSON.parse(raw) : [];
            } catch (_) { return []; }
        },
        async _save(list) {
            try { localStorage.setItem(POINTS_KEY, JSON.stringify(list)); } catch (_) {}
        },
        async award(target, awardedBy, reason, points, dedupKey) {
            const list = await this.loadAll();
            if (dedupKey && list.some((p) => p.target_user === target && p.dedup_key === dedupKey)) {
                return false;
            }
            list.push({
                id: Date.now() + Math.random(),
                target_user: target,
                awarded_by: awardedBy,
                reason,
                points,
                dedup_key: dedupKey || null,
                created_at: new Date().toISOString()
            });
            await this._save(list);
            if (this._onChange) this._onChange();
            return true;
        },
        subscribe(onChange) {
            this._onChange = onChange;
            window.addEventListener('storage', (e) => {
                if (e.key === POINTS_KEY) onChange();
            });
        }
    };

    const SupabasePointsStorage = {
        async loadAll() {
            const { data, error } = await window.supabaseClient
                .from('points_log')
                .select('*')
                .order('created_at', { ascending: false });
            if (error) {
                console.warn('Não consegui carregar os pontos:', error.message);
                return [];
            }
            return data || [];
        },
        async award(target, awardedBy, reason, points, dedupKey) {
            const { error } = await window.supabaseClient.from('points_log').insert({
                target_user: target,
                awarded_by: awardedBy,
                reason,
                points,
                dedup_key: dedupKey || null
            });
            if (error) {
                if (error.code !== '23505') {
                    console.warn('Não consegui atribuir os pontos:', error.message);
                }
                return false;
            }
            return true;
        },
        subscribe(onChange) {
            window.supabaseClient
                .channel('points_log_changes')
                .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'points_log' }, onChange)
                .subscribe();
        }
    };

    function getPointsStorage() {
        return (window.isSupabaseConfigured && window.isSupabaseConfigured())
            ? SupabasePointsStorage
            : LocalPointsStorage;
    }

    // --- Trocas ---
    const LocalTradeStorage = {
        _onChange: null,
        async loadAll() {
            try {
                const raw = localStorage.getItem(TRADES_KEY);
                return raw ? JSON.parse(raw) : [];
            } catch (_) { return []; }
        },
        async _save(list) {
            try { localStorage.setItem(TRADES_KEY, JSON.stringify(list)); } catch (_) {}
        },
        async propose(description, cost, requestedBy) {
            const list = await this.loadAll();
            list.push({
                id: Date.now(),
                requested_by: requestedBy,
                description,
                cost,
                status: 'pending',
                created_at: new Date().toISOString()
            });
            await this._save(list);
            if (this._onChange) this._onChange();
        },
        async decide(id, status) {
            const list = await this.loadAll();
            const item = list.find((t) => t.id === id);
            if (item) { item.status = status; item.decided_at = new Date().toISOString(); }
            await this._save(list);
            if (this._onChange) this._onChange();
            return item;
        },
        subscribe(onChange) {
            this._onChange = onChange;
            window.addEventListener('storage', (e) => {
                if (e.key === TRADES_KEY) onChange();
            });
        }
    };

    const SupabaseTradeStorage = {
        async loadAll() {
            const { data, error } = await window.supabaseClient
                .from('trades')
                .select('*')
                .order('created_at', { ascending: false });
            if (error) {
                console.warn('Não consegui carregar as trocas:', error.message);
                return [];
            }
            return data || [];
        },
        async propose(description, cost, requestedBy) {
            const { error } = await window.supabaseClient.from('trades').insert({
                requested_by: requestedBy,
                description,
                cost,
                status: 'pending'
            });
            if (error) console.warn('Não consegui propor a troca:', error.message);
        },
        async decide(id, status) {
            const { data, error } = await window.supabaseClient
                .from('trades')
                .update({ status, decided_at: new Date().toISOString() })
                .eq('id', id)
                .select()
                .single();
            if (error) { console.warn('Não consegui responder à troca:', error.message); return null; }
            return data;
        },
        subscribe(onChange) {
            window.supabaseClient
                .channel('trades_changes')
                .on('postgres_changes', { event: '*', schema: 'public', table: 'trades' }, onChange)
                .subscribe();
        }
    };

    function getTradeStorage() {
        return (window.isSupabaseConfigured && window.isSupabaseConfigured())
            ? SupabaseTradeStorage
            : LocalTradeStorage;
    }

    // --- Perfis (fotos) ---
    const LocalProfileStorage = {
        _onChange: null,
        async loadAll() {
            try {
                const raw = localStorage.getItem(PROFILES_KEY);
                return raw ? JSON.parse(raw) : { maria: null, ivan: null };
            } catch (_) { return { maria: null, ivan: null }; }
        },
        async setAvatar(user, file) {
            const url = await new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = () => resolve(reader.result);
                reader.onerror = reject;
                reader.readAsDataURL(file);
            });
            const all = await this.loadAll();
            all[user] = url;
            try { localStorage.setItem(PROFILES_KEY, JSON.stringify(all)); } catch (_) {}
            if (this._onChange) this._onChange();
        },
        subscribe(onChange) {
            this._onChange = onChange;
            window.addEventListener('storage', (e) => {
                if (e.key === PROFILES_KEY) onChange();
            });
        }
    };

    const SupabaseProfileStorage = {
        async loadAll() {
            const { data, error } = await window.supabaseClient.from('profiles').select('name, avatar_path');
            if (error) { console.warn('Não consegui carregar os perfis:', error.message); return {}; }
            const out = {};
            (data || []).forEach((row) => {
                out[row.name] = row.avatar_path
                    ? window.supabaseClient.storage.from(BUCKET).getPublicUrl(row.avatar_path).data.publicUrl
                    : null;
            });
            return out;
        },
        async setAvatar(user, file) {
            const cleanName = file.name.replace(/[^a-zA-Z0-9.\-_]/g, '_');
            const path = `avatar-${user}-${Date.now()}-${cleanName}`;
            const { error: uploadError } = await window.supabaseClient.storage.from(BUCKET).upload(path, file);
            if (uploadError) { console.warn('Não consegui enviar a foto de perfil:', uploadError.message); return; }
            const { error } = await window.supabaseClient.from('profiles').update({ avatar_path: path }).eq('name', user);
            if (error) console.warn('Não consegui guardar a foto de perfil:', error.message);
        },
        subscribe(onChange) {
            window.supabaseClient
                .channel('profiles_changes')
                .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, onChange)
                .subscribe();
        }
    };

    function getProfileStorage() {
        return (window.isSupabaseConfigured && window.isSupabaseConfigured())
            ? SupabaseProfileStorage
            : LocalProfileStorage;
    }

    // --- Prémio diário / data especial ---
    async function awardDailyLoginBonus() {
        if (!activeUser) return;
        const PointsStorage = getPointsStorage();
        const special = await specialDateInfo();
        const dedupKey = 'daily-' + todayISO();
        const points = special ? 5 : 1;
        const reason = special ? '🎉 ' + special : 'Entrar no site hoje';
        const awarded = await PointsStorage.award(activeUser, activeUser, reason, points, dedupKey);
        if (awarded) notifyDailyPoint(points);
        if (activePointsStorage) refreshPoints();
    }

    async function notifyOther(title, body) {
        if (!(window.isSupabaseConfigured && window.isSupabaseConfigured())) return;
        try {
            await window.supabaseClient.functions.invoke('send-push', {
                body: { user: activeUser, title, body }
            });
        } catch (err) {
            console.warn('Não consegui avisar por notificação:', err);
        }
    }

    async function notifyDailyPoint(points) {
        await notifyOther(
            `${displayName(activeUser)} resgatou o ponto diário`,
            `+${points} ponto${points === 1 ? '' : 's'} 🎉`
        );
    }

    async function notifyTradeProposed(description, cost) {
        await notifyOther(
            `${displayName(activeUser)} propôs uma troca`,
            `${description} · ${cost} pontos`
        );
    }

    // --- Render ---
    function displayName(user) {
        return user === 'maria' ? 'Maria' : (user === 'ivan' ? 'Ivan' : user);
    }
    function balanceFor(pointsLog, user) {
        return pointsLog.filter((p) => p.target_user === user).reduce((sum, p) => sum + p.points, 0);
    }
    function escapeHtml(str) {
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }

    let pointsLog = [];
    let profiles = {};
    let activePointsStorage = null;
    let activeProfileStorage = null;

    function renderScoreboard() {
        ['maria', 'ivan'].forEach((user) => {
            const totalEl = document.getElementById(`points-total-${user}`);
            if (totalEl) totalEl.textContent = balanceFor(pointsLog, user);
            const avatarEl = document.getElementById(`points-avatar-${user}`);
            if (avatarEl) {
                if (profiles[user]) {
                    avatarEl.style.backgroundImage = `url("${profiles[user]}")`;
                    avatarEl.classList.add('has-photo');
                } else {
                    avatarEl.style.backgroundImage = '';
                    avatarEl.classList.remove('has-photo');
                }
            }
        });
    }

    function renderHistory() {
        const listEl = document.getElementById('points-history');
        if (!listEl) return;
        if (pointsLog.length === 0) {
            listEl.innerHTML = '<p class="points-empty">Ainda não há pontos atribuídos.</p>';
            return;
        }
        listEl.innerHTML = pointsLog.slice(0, 25).map((p) => {
            const sign = p.points > 0 ? '+' : '';
            const cls = p.points > 0 ? 'positive' : 'negative';
            return `<div class="points-history-item">
                <span class="points-history-amount ${cls}">${sign}${p.points}</span>
                <span class="points-history-info">
                    <strong>${displayName(p.target_user)}</strong> — ${escapeHtml(p.reason)}
                </span>
            </div>`;
        }).join('');
    }

    async function refreshPoints() {
        pointsLog = await activePointsStorage.loadAll();
        renderScoreboard();
        renderHistory();
    }

    async function refreshProfiles() {
        profiles = await activeProfileStorage.loadAll();
        renderScoreboard();
    }

    function renderActiveUserPicker() {
        const picker = document.getElementById('points-user-picker');
        if (!picker) return;
        const needsPicker = !activeUser;
        picker.hidden = !needsPicker;
        if (needsPicker) picker.querySelectorAll('button').forEach((b) => b.classList.remove('active'));
    }

    let activeTradeStorage = null;
    let trades = [];

    function statusLabel(status) {
        if (status === 'accepted') return '✅ Aceite';
        if (status === 'declined') return '❌ Recusada';
        return '⏳ Pendente';
    }

    function renderTrades() {
        const listEl = document.getElementById('trades-list');
        if (!listEl) return;
        if (trades.length === 0) {
            listEl.innerHTML = '<p class="points-empty">Ainda não há trocas propostas.</p>';
            return;
        }
        listEl.innerHTML = '';
        trades.forEach((t) => {
            const row = document.createElement('div');
            row.className = 'trade-item';

            const info = document.createElement('div');
            info.className = 'trade-item-info';
            info.innerHTML = `
                <strong>${escapeHtml(t.description)}</strong>
                <span class="trade-meta">${t.cost} pontos · Pedido por ${displayName(t.requested_by)} · ${statusLabel(t.status)}</span>
            `;
            row.appendChild(info);

            const canDecide = t.status === 'pending' && activeUser && activeUser !== t.requested_by;
            if (canDecide) {
                const actions = document.createElement('div');
                actions.className = 'trade-item-actions';

                const acceptBtn = document.createElement('button');
                acceptBtn.type = 'button';
                acceptBtn.className = 'booking-accept-btn';
                acceptBtn.textContent = 'Aceitar';
                acceptBtn.addEventListener('click', async () => {
                    const updated = await activeTradeStorage.decide(t.id, 'accepted');
                    const trade = updated || t;
                    await activePointsStorage.award(
                        trade.requested_by,
                        activeUser,
                        'Troca: ' + trade.description,
                        -trade.cost,
                        null
                    );
                    refreshTrades();
                    refreshPoints();
                });

                const declineBtn = document.createElement('button');
                declineBtn.type = 'button';
                declineBtn.className = 'booking-decline-btn';
                declineBtn.textContent = 'Recusar';
                declineBtn.addEventListener('click', async () => {
                    await activeTradeStorage.decide(t.id, 'declined');
                    refreshTrades();
                });

                actions.appendChild(acceptBtn);
                actions.appendChild(declineBtn);
                row.appendChild(actions);
            }

            listEl.appendChild(row);
        });
    }

    async function refreshTrades() {
        trades = await activeTradeStorage.loadAll();
        renderTrades();
    }

    document.addEventListener('DOMContentLoaded', () => {
        const section = document.getElementById('points-section');
        if (!section) return;

        activePointsStorage = getPointsStorage();
        activeTradeStorage = getTradeStorage();
        activeProfileStorage = getProfileStorage();

        const hintEl = document.getElementById('points-sync-hint');
        if (hintEl && !(window.isSupabaseConfigured && window.isSupabaseConfigured())) {
            hintEl.textContent = '💡 Ainda sem Supabase configurado: isto fica só neste telemóvel/navegador.';
        }

        // Seletor "agir como" — só aparece em modo de teste local (sem login real)
        const picker = document.getElementById('points-user-picker');
        if (picker) {
            picker.querySelectorAll('button').forEach((btn) => {
                btn.addEventListener('click', () => {
                    activeUser = btn.dataset.user;
                    picker.querySelectorAll('button').forEach((b) => b.classList.remove('active'));
                    btn.classList.add('active');
                    renderTrades();
                });
            });
        }
        renderActiveUserPicker();

        // Avatares: tocar no teu próprio círculo para mudar a foto
        const avatarInput = document.getElementById('points-avatar-input');
        let avatarTargetUser = null;
        ['maria', 'ivan'].forEach((user) => {
            const el = document.getElementById(`points-avatar-${user}`);
            if (!el) return;
            el.addEventListener('click', () => {
                avatarTargetUser = user;
                if (avatarInput) avatarInput.click();
            });
        });
        if (avatarInput) {
            avatarInput.addEventListener('change', async () => {
                const file = avatarInput.files && avatarInput.files[0];
                avatarInput.value = '';
                if (!file || !avatarTargetUser) return;
                await activeProfileStorage.setAvatar(avatarTargetUser, file);
                refreshProfiles();
            });
        }

        // Formulário: atribuir pontos
        const reasonInput = document.getElementById('points-reason-input');
        const amountInput = document.getElementById('points-amount-input');
        const targetSelect = document.getElementById('points-target-select');
        const awardBtn = document.getElementById('points-award-btn');
        const errorEl = document.getElementById('points-error');

        if (awardBtn) {
            awardBtn.addEventListener('click', async () => {
                const reason = reasonInput ? reasonInput.value.trim() : '';
                const amount = amountInput ? parseInt(amountInput.value, 10) : NaN;
                const target = targetSelect ? targetSelect.value : '';
                if (!reason) { if (errorEl) errorEl.textContent = 'Escreve o motivo.'; return; }
                if (!amount || isNaN(amount)) { if (errorEl) errorEl.textContent = 'Escreve quantos pontos.'; return; }
                if (!target) { if (errorEl) errorEl.textContent = 'Escolhe para quem.'; return; }
                if (errorEl) errorEl.textContent = '';
                await activePointsStorage.award(target, activeUser, reason, amount, null);
                if (reasonInput) reasonInput.value = '';
                if (amountInput) amountInput.value = '1';
                refreshPoints();
            });
        }

        // Formulário: propor troca
        const tradeDescInput = document.getElementById('trade-desc-input');
        const tradeCostInput = document.getElementById('trade-cost-input');
        const tradeProposeBtn = document.getElementById('trade-propose-btn');
        const tradeErrorEl = document.getElementById('trade-error');

        if (tradeProposeBtn) {
            tradeProposeBtn.addEventListener('click', async () => {
                if (!activeUser) { if (tradeErrorEl) tradeErrorEl.textContent = 'Escolhe quem és primeiro.'; return; }
                const description = tradeDescInput ? tradeDescInput.value.trim() : '';
                const cost = tradeCostInput ? parseInt(tradeCostInput.value, 10) : NaN;
                if (!description) { if (tradeErrorEl) tradeErrorEl.textContent = 'Escreve o que queres trocar.'; return; }
                if (!cost || isNaN(cost) || cost <= 0) { if (tradeErrorEl) tradeErrorEl.textContent = 'Escreve quantos pontos custa.'; return; }
                if (tradeErrorEl) tradeErrorEl.textContent = '';
                await activeTradeStorage.propose(description, cost, activeUser);
                if (tradeDescInput) tradeDescInput.value = '';
                if (tradeCostInput) tradeCostInput.value = '';
                refreshTrades();
                notifyTradeProposed(description, cost);
            });
        }

        activePointsStorage.subscribe(() => refreshPoints());
        activeTradeStorage.subscribe(() => refreshTrades());
        activeProfileStorage.subscribe(() => refreshProfiles());

        refreshPoints();
        refreshTrades();
        refreshProfiles();

        // Se o login já tinha terminado antes deste script correr, o
        // prémio diário ainda não foi tentado — tenta agora.
        if (activeUser) awardDailyLoginBonus();
    });
})();
