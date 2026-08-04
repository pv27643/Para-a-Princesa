// ======================
// Quadro — vários desenhos navegáveis, todos editáveis (Supabase Realtime,
// com fallback local)
// ======================
//
// Cada "quadro" (board) tem o seu próprio histórico de traços. O botão "+"
// cria um quadro novo em branco; as setas (ou arrastar na barra de
// navegação) andam para trás (mais antigos) e para a frente (mais
// recentes). Qualquer quadro, seja o mais recente ou um antigo, continua
// totalmente editável — não há nada "congelado".
(function () {
    const STORAGE_KEY = 'loveBoards:v2';

    // --- Armazenamento local (fallback sem Supabase) ---
    const LocalBoardStorage = {
        _onChange: null,
        _load() {
            try {
                const raw = localStorage.getItem(STORAGE_KEY);
                const state = raw ? JSON.parse(raw) : null;
                if (state && Array.isArray(state.boards)) return state;
            } catch (_) {}
            return { boards: [{ id: 1, created_at: new Date().toISOString(), strokes: [] }] };
        },
        _save(state) {
            try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch (_) {}
        },
        async loadBoards() {
            const state = this._load();
            return state.boards.map((b) => ({ id: b.id, created_at: b.created_at }));
        },
        async createBoard(author) {
            // Não notifica _onChange aqui: quem chamou já vai atualizar o
            // seu próprio estado localmente (ver createNewBoard). Isto é só
            // para o caso de OUTRA aba criar um quadro (evento 'storage').
            const state = this._load();
            const nextId = state.boards.length ? Math.max(...state.boards.map((b) => b.id)) + 1 : 1;
            state.boards.push({ id: nextId, created_at: new Date().toISOString(), created_by: author, strokes: [] });
            this._save(state);
            return nextId;
        },
        async loadStrokes(boardId) {
            const state = this._load();
            const board = state.boards.find((b) => b.id === boardId);
            return (board && board.strokes) || [];
        },
        async addStroke(boardId, stroke) {
            const state = this._load();
            const board = state.boards.find((b) => b.id === boardId);
            if (!board) return;
            board.strokes.push(stroke);
            this._save(state);
        },
        subscribe(onChange) {
            this._onChange = onChange;
            window.addEventListener('storage', (e) => {
                if (e.key === STORAGE_KEY) onChange();
            });
        }
    };

    // --- Armazenamento Supabase (sincroniza entre telemóveis) ---
    const SupabaseBoardStorage = {
        async loadBoards() {
            const { data, error } = await window.supabaseClient
                .from('boards')
                .select('id, created_at')
                .order('created_at', { ascending: true });
            if (error) {
                console.warn('Não consegui carregar os quadros:', error.message);
                return [];
            }
            return data || [];
        },
        async createBoard(author) {
            const { data, error } = await window.supabaseClient
                .from('boards')
                .insert({ created_by: author })
                .select('id')
                .single();
            if (error) {
                console.warn('Não consegui criar um novo quadro:', error.message);
                return null;
            }
            return data.id;
        },
        async loadStrokes(boardId) {
            const { data, error } = await window.supabaseClient
                .from('board_strokes')
                .select('color, size, erase, points')
                .eq('board_id', boardId)
                .order('id', { ascending: true });
            if (error) {
                console.warn('Não consegui carregar o quadro:', error.message);
                return [];
            }
            return data || [];
        },
        async addStroke(boardId, stroke) {
            const author = (window.getCurrentUser && window.getCurrentUser()) || null;
            const { error } = await window.supabaseClient.from('board_strokes').insert({
                board_id: boardId,
                color: stroke.color,
                size: stroke.size,
                erase: stroke.erase,
                points: stroke.points,
                author
            });
            if (error) console.warn('Não consegui guardar o traço:', error.message);
        },
        // Avisa quando aparece um quadro novo (criado neste ou noutro telemóvel)
        subscribeToBoards(onNewBoard) {
            window.supabaseClient
                .channel('boards_changes')
                .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'boards' }, (payload) => {
                    onNewBoard(payload.new);
                })
                .subscribe();
        },
        // Traços do quadro atualmente visível (muda-se de canal ao navegar)
        subscribeToStrokes(boardId, onNewStroke) {
            const channel = window.supabaseClient
                .channel('board_strokes_' + boardId)
                .on(
                    'postgres_changes',
                    { event: 'INSERT', schema: 'public', table: 'board_strokes', filter: `board_id=eq.${boardId}` },
                    (payload) => onNewStroke(payload.new)
                )
                .subscribe();
            return () => window.supabaseClient.removeChannel(channel);
        }
    };

    function getBoardStorage() {
        return (window.isSupabaseConfigured && window.isSupabaseConfigured())
            ? SupabaseBoardStorage
            : LocalBoardStorage;
    }

    let canvas, ctx, canvasWrap;
    let BoardStorage;
    let boards = []; // [{id, created_at}], mais antigo primeiro
    let currentIndex = 0;
    let strokes = [];
    let currentStroke = null;
    let isDrawing = false;
    let activeColor = '#c2185b';
    let isErasing = false;
    let pendingOwn = []; // traços enviados por nós, à espera do "eco" do Realtime
    let unsubscribeStrokes = null;

    // "Armar" o quadro: só depois de um toque/clique é que o próximo gesto
    // desenha de facto — evita riscar o desenho sem querer ao fazer scroll
    // com o dedo por cima. Desarma sozinho ao fim de uns segundos parado.
    let armed = false;
    let disarmTimer = null;
    const DISARM_MS = 4000;

    function armCanvas() {
        armed = true;
        if (canvasWrap) canvasWrap.classList.add('armed');
        scheduleDisarm();
    }
    function scheduleDisarm() {
        clearTimeout(disarmTimer);
        disarmTimer = setTimeout(() => {
            armed = false;
            if (canvasWrap) canvasWrap.classList.remove('armed');
        }, DISARM_MS);
    }

    function currentBoard() {
        return boards[currentIndex] || null;
    }

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
        if (!armed) {
            // Primeiro toque só "arma" o quadro; não desenha ainda. Assim,
            // passar o dedo por cima a fazer scroll não risca nada.
            armCanvas();
            return;
        }
        evt.preventDefault();
        scheduleDisarm();
        isDrawing = true;
        const size = isErasing ? 28 : 5;
        currentStroke = { color: activeColor, size, erase: isErasing, points: [getCanvasPoint(evt)] };
        drawStroke(currentStroke);
        canvas.setPointerCapture(evt.pointerId);
    }

    function pointerMove(evt) {
        if (!isDrawing || !currentStroke) return;
        evt.preventDefault();
        scheduleDisarm();
        currentStroke.points.push(getCanvasPoint(evt));
        redrawAll();
        drawStroke(currentStroke);
    }

    function pointerUp() {
        if (!isDrawing || !currentStroke) return;
        isDrawing = false;
        scheduleDisarm();
        const stroke = currentStroke;
        currentStroke = null;
        strokes.push(stroke);
        pendingOwn.push(stroke);
        const board = currentBoard();
        if (board) BoardStorage.addStroke(board.id, stroke);
    }

    function setEraser(on) {
        isErasing = on;
        const btn = document.getElementById('board-eraser-btn');
        if (btn) btn.setAttribute('aria-pressed', String(on));
    }

    function updateNavUI() {
        const indicator = document.getElementById('board-nav-indicator');
        const prevBtn = document.getElementById('board-nav-prev');
        const nextBtn = document.getElementById('board-nav-next');
        if (indicator) indicator.textContent = `${currentIndex + 1} / ${boards.length}`;
        if (prevBtn) prevBtn.disabled = currentIndex <= 0;
        if (nextBtn) nextBtn.disabled = currentIndex >= boards.length - 1;
    }

    // navBusy evita que dois cliques rápidos nas setas se cruzem a meio da
    // animação e deixem o quadro com o traço/posição trocados ("desformatado").
    let navBusy = false;

    async function showBoard(index, direction) {
        if (navBusy) return;
        if (index < 0 || index >= boards.length) return;
        navBusy = true;
        try {
            currentIndex = index;
            const board = currentBoard();
            updateNavUI();

            if (unsubscribeStrokes) { unsubscribeStrokes(); unsubscribeStrokes = null; }

            pendingOwn = [];
            strokes = await BoardStorage.loadStrokes(board.id);
            redrawAll();

            if (canvas && direction) {
                canvas.classList.remove('slide-in-left', 'slide-in-right');
                void canvas.offsetWidth; // força reflow para a animação recomeçar sempre
                canvas.classList.add(direction === 'left' ? 'slide-in-left' : 'slide-in-right');
                setTimeout(() => canvas.classList.remove('slide-in-left', 'slide-in-right'), 250);
            }

            if (BoardStorage.subscribeToStrokes) {
                unsubscribeStrokes = BoardStorage.subscribeToStrokes(board.id, handleIncomingStroke);
            }
        } finally {
            navBusy = false;
        }
    }

    function handleIncomingStroke(newStroke) {
        const key = strokeKey(newStroke);
        const pendingIdx = pendingOwn.findIndex((s) => strokeKey(s) === key);
        if (pendingIdx !== -1) {
            pendingOwn.splice(pendingIdx, 1);
            return;
        }
        if (isDrawing) return;
        strokes.push(newStroke);
        drawStroke(newStroke);
    }

    async function createNewBoard() {
        const author = (window.getCurrentUser && window.getCurrentUser()) || null;
        const newId = await BoardStorage.createBoard(author);
        if (newId == null) return;
        boards.push({ id: newId, created_at: new Date().toISOString() });
        await showBoard(boards.length - 1, 'right');
    }

    // --- Gesto de arrastar na barra de navegação (fora da área de desenho,
    // para não entrar em conflito com o desenhar) ---
    function initSwipeNav(navEl) {
        let startX = null;
        let pointerId = null;
        navEl.addEventListener('pointerdown', (e) => {
            startX = e.clientX;
            pointerId = e.pointerId;
        });
        navEl.addEventListener('pointerup', (e) => {
            if (pointerId !== e.pointerId || startX === null) return;
            const dx = e.clientX - startX;
            startX = null;
            pointerId = null;
            const THRESHOLD = 40;
            if (dx > THRESHOLD) showBoard(currentIndex - 1, 'left');
            else if (dx < -THRESHOLD) showBoard(currentIndex + 1, 'right');
        });
        navEl.addEventListener('pointercancel', () => { startX = null; pointerId = null; });
    }

    async function init() {
        canvas = document.getElementById('board-canvas');
        canvasWrap = document.getElementById('board-canvas-wrap');
        if (!canvas) return;
        ctx = canvas.getContext('2d');
        BoardStorage = getBoardStorage();

        const hintEl = document.getElementById('board-sync-hint');
        if (hintEl) {
            const configured = window.isSupabaseConfigured && window.isSupabaseConfigured();
            hintEl.textContent = configured
                ? ''
                : '💡 Ainda sem Supabase configurado: o quadro só fica guardado neste telemóvel/navegador.';
            hintEl.hidden = configured;
        }

        const colorBtns = document.querySelectorAll('.board-color');
        const eraserBtn = document.getElementById('board-eraser-btn');
        const newBtn = document.getElementById('board-new-btn');
        const prevBtn = document.getElementById('board-nav-prev');
        const nextBtn = document.getElementById('board-nav-next');
        const navEl = document.getElementById('board-nav');

        colorBtns.forEach((btn) => {
            btn.addEventListener('click', () => {
                colorBtns.forEach((b) => b.classList.remove('active'));
                btn.classList.add('active');
                activeColor = btn.dataset.color;
                setEraser(false);
            });
        });

        if (eraserBtn) eraserBtn.addEventListener('click', () => setEraser(!isErasing));
        if (newBtn) newBtn.addEventListener('click', createNewBoard);
        if (prevBtn) prevBtn.addEventListener('click', () => showBoard(currentIndex - 1, 'left'));
        if (nextBtn) nextBtn.addEventListener('click', () => showBoard(currentIndex + 1, 'right'));
        if (navEl) initSwipeNav(navEl);

        canvas.addEventListener('pointerdown', pointerDown);
        canvas.addEventListener('pointermove', pointerMove);
        canvas.addEventListener('pointerup', pointerUp);
        canvas.addEventListener('pointercancel', pointerUp);
        canvas.addEventListener('pointerleave', pointerUp);

        if (BoardStorage.subscribeToBoards) {
            BoardStorage.subscribeToBoards((newBoard) => {
                if (boards.some((b) => b.id === newBoard.id)) return;
                boards.push({ id: newBoard.id, created_at: newBoard.created_at });
                updateNavUI();
            });
        } else {
            BoardStorage.subscribe(async () => {
                boards = await BoardStorage.loadBoards();
                updateNavUI();
            });
        }

        boards = await BoardStorage.loadBoards();
        if (boards.length === 0) {
            const author = (window.getCurrentUser && window.getCurrentUser()) || null;
            const id = await BoardStorage.createBoard(author);
            boards = [{ id, created_at: new Date().toISOString() }];
        }
        currentIndex = boards.length - 1;
        updateNavUI();

        strokes = await BoardStorage.loadStrokes(currentBoard().id);
        redrawAll();
        if (BoardStorage.subscribeToStrokes) {
            unsubscribeStrokes = BoardStorage.subscribeToStrokes(currentBoard().id, handleIncomingStroke);
        }
    }

    document.addEventListener('DOMContentLoaded', init);
})();
