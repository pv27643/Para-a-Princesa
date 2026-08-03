// Animação de explosão de corações ao carregar
document.addEventListener('DOMContentLoaded', function() {
  setTimeout(() => {
    const heartsContainer = document.getElementById('heartsContainer');

    // Criar 30 corações
    for (let i = 0; i < 30; i++) {
      const heart = document.createElement('div');
      heart.className = 'heart';
      heart.innerHTML = '❤️';

      // Posição aleatória na largura da tela
      heart.style.left = Math.random() * 90 + '%';
      heart.style.bottom = '0px';

      // Delay aleatório para cada coração
      heart.style.animationDelay = (Math.random() * 1.5) + 's';

      // Adicionar ao container
      heartsContainer.appendChild(heart);
    }

    // Remover container após animação
    setTimeout(() => {
      heartsContainer.remove();
    }, 5000);
  }, 500);
});

// Sequência "Amo-te Muito" + páginas de amor
(function(){
  let seqState = { running: false, skipped: false, currentPage: 0, pages: [] };
  const fakeNumber = 36;
  const targetPhrase = "Amo-te muito Marta/Maria";

  function setSeqHTML(html) {
    const el = document.getElementById('seq-text');
    if (el) el.innerHTML = html;
  }
  function showOverlay() {
    seqState.skipped = false;
    seqState.running = true;
    const overlay = document.getElementById('love-sequence-overlay');
    if (overlay) {
      overlay.classList.remove('hidden');
      overlay.style.display = 'flex';
      overlay.setAttribute('aria-hidden','false');
    }
  }
  function hideOverlay() {
    const overlay = document.getElementById('love-sequence-overlay');
    if (overlay) {
      overlay.classList.add('hidden');
      overlay.style.display = '';
      overlay.setAttribute('aria-hidden','true');
    }
    seqState.running = false;
  }
  window.skipSequence = function() {
    seqState.skipped = true;
  };

  function typeText(text, speed=40) {
    return new Promise(resolve=>{
      const el = document.getElementById('seq-text');
      if (!el) return resolve();
      el.textContent = '';
      let i = 0;
      (function step(){
        if (seqState.skipped) { el.textContent = text; return resolve(); }
        if (i < text.length) {
          el.textContent += text[i++];
          setTimeout(step, speed);
        } else {
          setTimeout(resolve, 500);
        }
      })();
    });
  }
  function eraseText(speed=24) {
    return new Promise(resolve=>{
      const el = document.getElementById('seq-text');
      if (!el) return resolve();
      let txt = el.textContent;
      let i = txt.length;
      (function step(){
        if (seqState.skipped) { el.textContent = ''; return resolve(); }
        if (i > 0) {
          i--;
          el.textContent = txt.slice(0,i);
          setTimeout(step, speed);
        } else resolve();
      })();
    });
  }
  async function showLines(lines) {
    const container = document.getElementById('seq-extra');
    container.innerHTML = '';
    for (let i=0;i<lines.length;i++) {
      if (seqState.skipped) {
        container.innerHTML = lines.map(l=>`<div class="seq-line show">${l}</div>`).join('');
        return;
      }
      const div = document.createElement('div');
      div.className = 'seq-line';
      div.textContent = lines[i];
      container.appendChild(div);
      requestAnimationFrame(()=> div.classList.add('show'));
      await new Promise(r=>setTimeout(r, 700));
    }
  }

  function populatePagesWithRepeats(count) {
    const perPage = 6; // linhas por página
    const pages = [];
    for (let i=0;i<count;i+=perPage) {
      const chunk = [];
      for (let j=0;j<perPage && (i+j)<count; j++) {
        chunk.push(`<div style="padding:8px 0;font-size:18px;color:#c83a6f;font-weight:600;text-align:center;">${targetPhrase}</div>`);
      }
      pages.push(`<div class="page-block">${chunk.join('')}</div>`);
    }
    seqState.pages = pages;
    seqState.currentPage = 0;
    showPage(0);
  }

  function showPage(idx) {
    const pc = document.getElementById('page-content');
    const counter = document.getElementById('page-counter');
    const prevBtn = document.getElementById('prev-btn');
    const nextBtn = document.getElementById('next-btn');
    if (!pc) return;
    pc.innerHTML = seqState.pages[idx] || '<div style="text-align:center;color:#777;">Sem conteúdo</div>';
    seqState.currentPage = idx;
    if (counter) counter.textContent = `${idx+1}/${Math.max(1, seqState.pages.length)}`;
    if (prevBtn) prevBtn.disabled = idx <= 0;
    if (nextBtn) nextBtn.disabled = idx >= seqState.pages.length - 1;
    setTimeout(()=> {
      const container = document.getElementById('love-pages-container');
      if (container) container.scrollIntoView({behavior:'smooth', block:'center'});
    }, 120);
  }

  // Navegação/fecho
  window.previousPage = window.previousPage || function() {
    if (seqState.currentPage > 0) { seqState.currentPage--; showPage(seqState.currentPage); }
  };
  window.nextPage = window.nextPage || function() {
    if (seqState.currentPage < seqState.pages.length - 1) { seqState.currentPage++; showPage(seqState.currentPage); }
  };
  window.closeLovePages = window.closeLovePages || function() {
    const c = document.getElementById('love-pages-container');
    if (c) { c.classList.add('love-pages-hidden'); c.setAttribute('aria-hidden','true'); }
  };

  // Sequência: pergunta -> número fictício -> comparações -> mensagem fofa -> abrir páginas
  window.runSequence = async function() {
    if (seqState.running) return;
    showOverlay();
    await new Promise(r => setTimeout(r, 150)); // garantir render do overlay
    // 1) Pergunta
    await typeText('Sabes quantas vezes disseste "Amo-te Muito Ivan"?', 40);
    if (seqState.skipped) { hideOverlay(); return; }
    await new Promise(r=>setTimeout(r, 450));
    await eraseText(24);
    if (seqState.skipped) { hideOverlay(); return; }
    // 2) Número fictício
    setSeqHTML(`<span class="seq-number" aria-live="polite">${fakeNumber}</span><div style="font-size:12px;color:#666;margin-top:6px;">vezes</div>`);
    const numEl = document.querySelector('.seq-number');
    if (numEl) numEl.animate([{ transform: 'scale(0.6)' }, { transform: 'scale(1.08)' }, { transform: 'scale(1)' }], { duration: 700, easing:'cubic-bezier(.2,.8,.2,1)' });
    await new Promise(r=>setTimeout(r, 900));
    if (seqState.skipped) { hideOverlay(); return; }
    // 3) Comparações (3 linhas)
    await showLines([
      "Mais doce que chocolate quente num dia frio.",
      "Mais brilhante que a primeira estrela da noite.",
      "Mais calma que um abraço ao fim do dia."
    ]);
    await new Promise(r=>setTimeout(r, 800));
    if (seqState.skipped) { hideOverlay(); return; }
    // 4) Mensagem fofa
    setSeqHTML(`<div style="font-weight:700;color:#c83a6f;">És o meu sorriso diário 💕</div>`);
    await new Promise(r=>setTimeout(r, 1000));
    // 5) Preparar e abrir páginas
    populatePagesWithRepeats(fakeNumber);
    hideOverlay();
    const container = document.getElementById('love-pages-container');
    if (container) {
      container.classList.remove('love-pages-hidden');
      container.setAttribute('aria-hidden','false');
      if (window.innerWidth <= 480) {
        setTimeout(()=> container.scrollIntoView({behavior:'smooth', block:'start'}), 80);
      }
    }
  };

  // Alias novo e explícito para iniciar sequência (evita conflitos)
  window.openSequenceEntry = function() { runSequence(); };

  // Garantir botão visível e acessível
  document.addEventListener('DOMContentLoaded', function() {
    const btn = document.getElementById('digital-gift-btn');
    if (!btn) return;
    btn.style.display = 'block';
    btn.style.visibility = 'visible';
    btn.style.opacity = '1';
    btn.style.pointerEvents = 'auto';
    if (!btn.hasAttribute('role')) btn.setAttribute('role','button');
    if (!btn.hasAttribute('tabindex')) btn.setAttribute('tabindex','0');
    // Listener em captura: impede qualquer outro handler de abrir o caderno diretamente
    btn.addEventListener('click', function(e){
      e.preventDefault(); e.stopPropagation(); e.stopImmediatePropagation();
      window.openSequenceEntry();
    }, { capture: true });
    btn.addEventListener('keydown', function(e) {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); window.openSequenceEntry(); }
    });
  });
})();

// Guard: se o botão for removido/ocultado por outro script/CSS, recria e mantém visível
document.addEventListener('DOMContentLoaded', function () {
  function attachBtnHandlers(btn){
    // limpar onclick legado, se existir
    try { btn.onclick = null; } catch(_) {}
    btn.addEventListener('click', function(e){
      e.preventDefault(); e.stopPropagation(); e.stopImmediatePropagation();
      if (typeof window.openSequenceEntry === 'function') window.openSequenceEntry();
    }, { capture: true });
    btn.addEventListener('keydown', function(e){
      if (e.key==='Enter' || e.key===' ') {
        e.preventDefault();
        if (typeof window.openSequenceEntry === 'function') window.openSequenceEntry();
      }
    });
  }
  function ensureBtn() {
    let btn = document.getElementById('digital-gift-btn');
    if (!btn) {
      const sec = document.querySelector('section.digital-gift') || document.body;
      btn = document.createElement('div');
      btn.id = 'digital-gift-btn';
      btn.className = 'digital-gift-title clickable-title';
      btn.setAttribute('role','button');
      btn.setAttribute('tabindex','0');
      btn.textContent = 'Amo-te Muito Marta/Maria❤️';
      sec.appendChild(btn);
    }
    // forçar visibilidade
    btn.style.display = 'block';
    btn.style.visibility = 'visible';
    btn.style.opacity = '1';
    btn.style.pointerEvents = 'auto';
    attachBtnHandlers(btn);
  }
  ensureBtn();
  // observar remoções/alterações no DOM e repor o botão caso desapareça
  new MutationObserver(ensureBtn).observe(document.body, { childList: true, subtree: true });
});

// O carrossel de fotos passou a ser gerido pelo photos.js (upload/remover/fixar).
// O contador/calendário dos pintainhos passou a ser gerido pelo ducks.js (Supabase Realtime).
