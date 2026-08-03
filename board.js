// ======================
// Quadro — desenho partilhado (Supabase Realtime, com fallback local)
// ======================
//
// A camada de armazenamento (BoardStorage) está isolada do resto do código.
// Se o Supabase ainda não estiver configurado (ver supabase-config.js), usa
// localStorage como reserva (só sincroniza entre abas do MESMO browser).
// Quando o Supabase está pronto, cada traço é uma linha na tabela
// board_strokes e chega em tempo real ao outro telemóvel via Realtime.
(function () {
    const STORAGE_KEY = 'loveBoard:v1';

    const LocalBoardStorage = {
        async loadAll() {
            try {
                const raw = localStorage.getItem(STORAGE_KEY);
                const state = raw ? JSON.parse(raw) : null;
                return (state && state.strokes) || [];
            } catch (_) {
                return [];
            }
        },
        async addStroke(stroke) {
            const strokes = await this.loadAll();
            strokes.push(stroke);
            try {
                localStorage.setItem(STORAGE_KEY, JSON.stringify({ strokes }));
            } catch (_) {}
        },
        async clearAll() {
            try { localStorage.removeItem(STORAGE_KEY); } catch (_) {}
        },
        subscribe(onNewStroke, onClear) {
            window.addEventListener('storage', (e) => {
                if (e.key !== STORAGE_KEY) return;
                if (!e.newValue) { onClear(); return; }
                try {
                    const strokes = JSON.parse(e.newValue).strokes || [];
                    const last = strokes[strokes.length - 1];
                    if (last) onNewStroke(last);
                } catch (_) {}
            });
        }
    };

    const SupabaseBoardStorage = {
        async loadAll() {
            const { data, error } = await window.supabaseClient
                .from('board_strokes')
                .select('color, size, erase, points')
                .order('id', { ascending: true });
            if (error) {
                console.warn('Não consegui carregar o quadro:', error.message);
                return [];
            }
            return data || [];
        },
        async addStroke(stroke) {
            const author = (window.getCurrentUser && window.getCurrentUser()) || null;
            const { error } = await window.supabaseClient.from('board_strokes').insert({
                color: stroke.color,
                size: stroke.size,
                erase: stroke.erase,
                points: stroke.points,
                author
            });
            if (error) console.warn('Não consegui guardar o traço:', error.message);
        },
        async clearAll() {
            const { error } = await window.supabaseClient.from('board_strokes').delete().not('id', 'is', null);
            if (error) console.warn('Não consegui limpar o quadro:', error.message);
        },
        subscribe(onNewStroke, onClear) {
            window.supabaseClient
                .channel('board_strokes_changes')
                .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'board_strokes' }, (payload) => {
                    onNewStroke(payload.new);
                })
                .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'board_strokes' }, () => {
                    onClear();
                })
                .subscribe();
        }
    };

    function getBoardStorage() {
        return (window.isSupabaseConfigured && window.isSupabaseConfigured())
            ? SupabaseBoardStorage
            : LocalBoardStorage;
    }

    let canvas, ctx;
    let strokes = [];
    let currentStroke = null;
    let isDrawing = false;
    let activeColor = '#c2185b';
    let isErasing = false;
    let BoardStorage;
    // Traços que acabámos de enviar, à espera do "eco" do Realtime — evita desenhar/duplicar 2x
    let pendingOwn = [];

    function strokeKey(s) {
        return JSON.stringify({ color: s.color, size: s.size, erase: s.erase, points: s.points });
    }

    function redrawAll() {
        if (!ctx) return;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        strokes.forEach(drawStroke);
    }

    function drawStroke(stroke) {
        if (!stroke.points || stroke.points.length === 0) return;
        ctx.globalCompositeOperation = stroke.erase ? 'destination-out' : 'source-over';
        ctx.strokeStyle = stroke.color;
        ctx.lineWidth = stroke.size;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.beginPath();
        stroke.points.forEach((p, i) => {
            if (i === 0) ctx.moveTo(p.x, p.y);
            else ctx.lineTo(p.x, p.y);
        });
        // Ponto único (toque simples): desenha um pontinho
        if (stroke.points.length === 1) {
            const p = stroke.points[0];
            ctx.lineTo(p.x + 0.01, p.y + 0.01);
        }
        ctx.stroke();
        ctx.globalCompositeOperation = 'source-over';
    }

    function getCanvasPoint(evt) {
        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;
        return {
            x: (evt.clientX - rect.left) * scaleX,
            y: (evt.clientY - rect.top) * scaleY
        };
    }

    function pointerDown(evt) {
        evt.preventDefault();
        isDrawing = true;
        const size = isErasing ? 28 : 5;
        currentStroke = { color: activeColor, size, erase: isErasing, points: [getCanvasPoint(evt)] };
        drawStroke(currentStroke);
        canvas.setPointerCapture(evt.pointerId);
    }

    function pointerMove(evt) {
        if (!isDrawing || !currentStroke) return;
        evt.preventDefault();
        currentStroke.points.push(getCanvasPoint(evt));
        redrawAll();
        drawStroke(currentStroke);
    }

    function pointerUp() {
        if (!isDrawing || !currentStroke) return;
        isDrawing = false;
        const stroke = currentStroke;
        currentStroke = null;
        strokes.push(stroke);
        pendingOwn.push(stroke);
        BoardStorage.addStroke(stroke);
    }

    function setEraser(on) {
        isErasing = on;
        const btn = document.getElementById('board-eraser-btn');
        if (btn) btn.setAttribute('aria-pressed', String(on));
    }

    // Guarda o desenho atual na galeria de fotos, depois "arrasta-o para o
    // lado" e limpa o quadro para começarem um novo.
    function saveAndStartNew() {
        if (strokes.length === 0) return;
        if (!confirm('Guardar este desenho na galeria e começar um novo? O quadro atual será limpo para os dois.')) return;

        canvas.toBlob(async (blob) => {
            if (blob && window.saveCanvasAsPhoto) {
                await window.saveCanvasAsPhoto(blob);
            }

            canvas.classList.add('sliding-out');
            setTimeout(async () => {
                await BoardStorage.clearAll();
                strokes = [];
                pendingOwn = [];
                redrawAll();
                canvas.classList.remove('sliding-out');
            }, 450);
        }, 'image/png');
    }

    async function init() {
        canvas = document.getElementById('board-canvas');
        if (!canvas) return;
        ctx = canvas.getContext('2d');
        BoardStorage = getBoardStorage();

        const hintEl = document.getElementById('board-sync-hint');
        if (hintEl) {
            hintEl.textContent = (window.isSupabaseConfigured && window.isSupabaseConfigured())
                ? ''
                : '💡 Ainda sem Supabase configurado: o quadro só fica guardado neste telemóvel/navegador.';
        }

        const colorBtns = document.querySelectorAll('.board-color');
        const eraserBtn = document.getElementById('board-eraser-btn');

        colorBtns.forEach((btn) => {
            btn.addEventListener('click', () => {
                colorBtns.forEach((b) => b.classList.remove('active'));
                btn.classList.add('active');
                activeColor = btn.dataset.color;
                setEraser(false);
            });
        });

        if (eraserBtn) {
            eraserBtn.addEventListener('click', () => setEraser(!isErasing));
        }

        const saveBtn = document.getElementById('board-save-btn');
        if (saveBtn) {
            saveBtn.addEventListener('click', saveAndStartNew);
        }

        canvas.addEventListener('pointerdown', pointerDown);
        canvas.addEventListener('pointermove', pointerMove);
        canvas.addEventListener('pointerup', pointerUp);
        canvas.addEventListener('pointercancel', pointerUp);
        canvas.addEventListener('pointerleave', pointerUp);

        BoardStorage.subscribe((newStroke) => {
            const key = strokeKey(newStroke);
            const pendingIdx = pendingOwn.findIndex((s) => strokeKey(s) === key);
            if (pendingIdx !== -1) {
                // É o eco do nosso próprio traço (já desenhado localmente) — ignorar
                pendingOwn.splice(pendingIdx, 1);
                return;
            }
            if (isDrawing) return; // não interromper um traço em curso
            strokes.push(newStroke);
            drawStroke(newStroke);
        }, () => {
            // O outro utilizador guardou o desenho e começou um novo
            strokes = [];
            pendingOwn = [];
            redrawAll();
        });

        strokes = await BoardStorage.loadAll();
        redrawAll();
    }

    document.addEventListener('DOMContentLoaded', init);
})();
