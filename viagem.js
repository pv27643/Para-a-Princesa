// ======================
// Guia da Viagem Lisboa — desenha tudo a partir de viagem-data.js.
// A checklist e a tabela de atividades ficam guardadas por telemóvel
// (localStorage), já que são notas pessoais de preparação, não algo
// que precise de estar sincronizado ao vivo entre os dois.
// ======================
(function () {
    function escapeHtml(str) {
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }

    function renderActivity(item) {
        if (typeof item === 'string') return escapeHtml(item);
        const name = escapeHtml(item.nome || '');
        if (item.mapsUrl) {
            return `<a href="${escapeHtml(item.mapsUrl)}" target="_blank" rel="noopener">${name} 📍</a>`;
        }
        return name;
    }

    function renderInfo() {
        const grid = document.getElementById('trip-info-grid');
        if (!grid || !window.TRIP_INFO) return;
        grid.innerHTML = Object.values(window.TRIP_INFO).map((item) => `
            <div class="trip-info-card">
                <strong>${escapeHtml(item.label)}</strong>
                <span>${escapeHtml(item.texto)}</span>
            </div>
        `).join('');
    }

    function renderDays() {
        const wrap = document.getElementById('trip-days');
        if (!wrap || !window.TRIP_DAYS) return;
        wrap.innerHTML = window.TRIP_DAYS.map((dia) => `
            <div class="trip-day">
                <h3 class="trip-day-title">${escapeHtml(dia.titulo)}</h3>
                ${dia.periodos.map((p) => `
                    <div class="trip-period">
                        <div class="trip-period-head">
                            <span class="trip-period-title">${escapeHtml(p.titulo)}</span>
                            ${p.hora ? `<span class="trip-period-hora">${escapeHtml(p.hora)}</span>` : ''}
                        </div>
                        <ul>
                            ${p.atividades.map((a) => `<li>${renderActivity(a)}</li>`).join('')}
                        </ul>
                        ${p.notas ? `<p class="trip-period-notas">${escapeHtml(p.notas)}</p>` : ''}
                        ${p.custoEstimado ? `<p class="trip-period-custo">💶 ${escapeHtml(p.custoEstimado)}</p>` : ''}
                    </div>
                `).join('')}
                ${dia.custoEstimado ? `<p class="trip-period-custo">💶 Custo estimado do dia: ${escapeHtml(dia.custoEstimado)}</p>` : ''}
            </div>
        `).join('');
    }

    // --- Checklist (por telemóvel) ---
    const CHECKLIST_KEY = 'tripChecklist:v1';
    function loadCheckedSet() {
        try {
            const raw = localStorage.getItem(CHECKLIST_KEY);
            return new Set(raw ? JSON.parse(raw) : []);
        } catch (_) { return new Set(); }
    }
    function saveCheckedSet(set) {
        try { localStorage.setItem(CHECKLIST_KEY, JSON.stringify([...set])); } catch (_) {}
    }

    function renderChecklist() {
        const list = document.getElementById('trip-checklist');
        if (!list || !window.TRIP_CHECKLIST) return;
        const checked = loadCheckedSet();
        list.innerHTML = '';
        window.TRIP_CHECKLIST.forEach((label, idx) => {
            const li = document.createElement('li');
            const isChecked = checked.has(idx);
            if (isChecked) li.classList.add('checked');
            li.innerHTML = `<input type="checkbox" id="trip-check-${idx}" ${isChecked ? 'checked' : ''}><span>${escapeHtml(label)}</span>`;
            const input = li.querySelector('input');
            input.addEventListener('change', () => {
                const set = loadCheckedSet();
                if (input.checked) set.add(idx); else set.delete(idx);
                saveCheckedSet(set);
                li.classList.toggle('checked', input.checked);
            });
            list.appendChild(li);
        });
    }

    // --- Tabela de atividades dinâmicas (por telemóvel) ---
    const ACTIVITY_TABLE_KEY = 'tripActivityTable:v1';
    function loadActivityData() {
        try {
            const raw = localStorage.getItem(ACTIVITY_TABLE_KEY);
            return raw ? JSON.parse(raw) : {};
        } catch (_) { return {}; }
    }
    function saveActivityData(data) {
        try { localStorage.setItem(ACTIVITY_TABLE_KEY, JSON.stringify(data)); } catch (_) {}
    }

    function renderActivityTable() {
        const tbody = document.getElementById('trip-activity-tbody');
        if (!tbody || !window.TRIP_ACTIVITY_OPTIONS) return;
        const data = loadActivityData();
        tbody.innerHTML = '';
        window.TRIP_ACTIVITY_OPTIONS.forEach((name) => {
            const row = data[name] || {};
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${escapeHtml(name)}</td>
                <td><input type="text" data-field="preco" placeholder="€" value="${escapeHtml(row.preco || '')}"></td>
                <td><input type="text" data-field="duracao" placeholder="ex: 1h" value="${escapeHtml(row.duracao || '')}"></td>
                <td><input type="text" data-field="zona" placeholder="zona da cidade" value="${escapeHtml(row.zona || '')}"></td>
            `;
            tr.querySelectorAll('input').forEach((input) => {
                input.addEventListener('input', () => {
                    const current = loadActivityData();
                    current[name] = current[name] || {};
                    current[name][input.dataset.field] = input.value;
                    saveActivityData(current);
                });
            });
            tbody.appendChild(tr);
        });
    }

    function renderPlanoB() {
        const list = document.getElementById('trip-planob');
        if (!list || !window.TRIP_PLANO_B) return;
        list.innerHTML = window.TRIP_PLANO_B.map((item) => `<li>${escapeHtml(item)}</li>`).join('');
    }

    document.addEventListener('DOMContentLoaded', () => {
        renderInfo();
        renderDays();
        renderChecklist();
        renderActivityTable();
        renderPlanoB();
    });
})();
