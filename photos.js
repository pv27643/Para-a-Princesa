// ======================
// Carrossel de fotos + gestão (adicionar / remover / fixar) via Supabase Storage
// ======================
(function () {
    const STORAGE_KEY = 'lovePhotos:v1';
    const BUCKET = 'photos';

    // Fotos de origem, usadas como seed no modo local (sem Supabase configurado)
    const SEED_IMAGES = [
        'assets/images/IMG_2714.jpg',
        'assets/images/WhatsApp Image 2025-10-26 at 23.23.42.jpeg',
        'assets/images/WhatsApp Image 2025-10-26 at 23.23.43 (2).jpeg',
        'assets/images/WhatsApp Image 2025-10-26 at 23.23.43 (3).jpeg',
        'assets/images/WhatsApp Image 2025-10-26 at 23.23.43.jpeg',
        'assets/images/WhatsApp Image 2025-10-26 at 23.23.46 (1).jpeg',
        'assets/images/WhatsApp Image 2025-10-26 at 23.23.46 (2).jpeg',
        'assets/images/WhatsApp Image 2025-10-26 at 23.23.46 (3).jpeg',
        'assets/images/WhatsApp Image 2025-10-26 at 23.23.46.jpeg'
    ];

    function fileToDataUrl(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    }

    // --- Armazenamento local (fallback sem Supabase; fotos ficam só neste browser) ---
    const LocalPhotoStorage = {
        _onChange: null,
        async loadAll() {
            let list;
            try {
                const raw = localStorage.getItem(STORAGE_KEY);
                list = raw ? JSON.parse(raw) : null;
            } catch (_) {
                list = null;
            }
            if (!list) {
                list = SEED_IMAGES.map((url, i) => ({ id: 'seed-' + i, url, pinned: i === 0 }));
                await this._save(list);
            }
            return list.slice().sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0));
        },
        async _save(list) {
            try { localStorage.setItem(STORAGE_KEY, JSON.stringify(list)); } catch (_) {}
        },
        async upload(file) {
            const dataUrl = await fileToDataUrl(file);
            const list = await this.loadAll();
            list.push({ id: 'local-' + Date.now(), url: dataUrl, pinned: false });
            await this._save(list);
            if (this._onChange) this._onChange();
        },
        async remove(id) {
            const list = await this.loadAll();
            await this._save(list.filter((p) => p.id !== id));
            if (this._onChange) this._onChange();
        },
        async setPinned(id) {
            const list = await this.loadAll();
            list.forEach((p) => { p.pinned = p.id === id; });
            await this._save(list);
            if (this._onChange) this._onChange();
        },
        subscribe(onChange) {
            this._onChange = onChange;
            window.addEventListener('storage', (e) => {
                if (e.key === STORAGE_KEY) onChange();
            });
        }
    };

    // --- Armazenamento Supabase (fotos partilhadas entre os dois telemóveis) ---
    const SupabasePhotoStorage = {
        async loadAll() {
            const { data, error } = await window.supabaseClient
                .from('photos')
                .select('id, storage_path, pinned')
                .order('pinned', { ascending: false })
                .order('created_at', { ascending: false });
            if (error) {
                console.warn('Não consegui carregar as fotos:', error.message);
                return [];
            }
            return (data || []).map((row) => ({
                id: row.id,
                pinned: row.pinned,
                storage_path: row.storage_path,
                url: window.supabaseClient.storage.from(BUCKET).getPublicUrl(row.storage_path).data.publicUrl
            }));
        },
        async upload(file, uploadedBy) {
            const cleanName = file.name.replace(/[^a-zA-Z0-9.\-_]/g, '_');
            const path = `${Date.now()}-${cleanName}`;
            const { error: uploadError } = await window.supabaseClient.storage
                .from(BUCKET)
                .upload(path, file);
            if (uploadError) {
                console.warn('Não consegui enviar a foto:', uploadError.message);
                return;
            }
            const { error: insertError } = await window.supabaseClient.from('photos').insert({
                storage_path: path,
                uploaded_by: uploadedBy,
                pinned: false
            });
            if (insertError) console.warn('Não consegui guardar a foto:', insertError.message);
        },
        async remove(id, storagePath) {
            await window.supabaseClient.storage.from(BUCKET).remove([storagePath]);
            const { error } = await window.supabaseClient.from('photos').delete().eq('id', id);
            if (error) console.warn('Não consegui remover a foto:', error.message);
        },
        async setPinned(id) {
            await window.supabaseClient.from('photos').update({ pinned: false }).eq('pinned', true);
            const { error } = await window.supabaseClient.from('photos').update({ pinned: true }).eq('id', id);
            if (error) console.warn('Não consegui fixar a foto:', error.message);
        },
        subscribe(onChange) {
            window.supabaseClient
                .channel('photos_changes')
                .on('postgres_changes', { event: '*', schema: 'public', table: 'photos' }, onChange)
                .subscribe();
        }
    };

    function getPhotoStorage() {
        return (window.isSupabaseConfigured && window.isSupabaseConfigured())
            ? SupabasePhotoStorage
            : LocalPhotoStorage;
    }

    let photos = [];
    let currentIndex = 0;
    let rotateInterval = null;

    function currentPhoto() {
        return photos[currentIndex] || null;
    }

    function renderCarousel() {
        const carousel = document.getElementById('dynamic-carousel');
        if (!carousel) return;
        carousel.innerHTML = '';
        photos.forEach((photo, idx) => {
            const img = document.createElement('img');
            img.src = photo.url;
            img.alt = `Momentos felizes ${idx + 1}`;
            img.className = 'center-image carousel-image' + (idx === currentIndex ? ' active' : '');
            img.loading = idx === 0 ? 'eager' : 'lazy';
            img.decoding = 'async';
            carousel.appendChild(img);
        });
        updatePinnedIndicator();
    }

    function updatePinnedIndicator() {
        const badge = document.getElementById('photo-pinned-badge');
        if (!badge) return;
        const photo = currentPhoto();
        badge.hidden = !(photo && photo.pinned);
    }

    function showIndex(idx) {
        if (photos.length === 0) return;
        currentIndex = (idx + photos.length) % photos.length;
        document.querySelectorAll('.carousel-image').forEach((img, i) => {
            img.classList.toggle('active', i === currentIndex);
        });
        updatePinnedIndicator();
    }

    function startRotation() {
        clearInterval(rotateInterval);
        const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        if (prefersReduced || photos.length < 2) return;
        rotateInterval = setInterval(() => showIndex(currentIndex + 1), 3000);
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                clearInterval(rotateInterval);
            } else if (!rotateInterval) {
                rotateInterval = setInterval(() => showIndex(currentIndex + 1), 3000);
            }
        });
    }

    async function refresh(PhotoStorage) {
        photos = await PhotoStorage.loadAll();
        if (currentIndex >= photos.length) currentIndex = 0;
        renderCarousel();
        startRotation();
    }

    document.addEventListener('DOMContentLoaded', () => {
        const carousel = document.getElementById('dynamic-carousel');
        if (!carousel) return;

        const PhotoStorage = getPhotoStorage();
        const hintEl = document.getElementById('photo-sync-hint');
        if (hintEl && !(window.isSupabaseConfigured && window.isSupabaseConfigured())) {
            hintEl.textContent = '💡 Ainda sem Supabase configurado: as fotos adicionadas só ficam neste telemóvel/navegador.';
        }

        document.addEventListener('keydown', (e) => {
            if (e.key === 'ArrowRight') showIndex(currentIndex + 1);
            if (e.key === 'ArrowLeft') showIndex(currentIndex - 1);
        });

        const addBtn = document.getElementById('photo-add-btn');
        const fileInput = document.getElementById('photo-file-input');
        const pinBtn = document.getElementById('photo-pin-btn');
        const removeBtn = document.getElementById('photo-remove-btn');

        if (addBtn && fileInput) {
            addBtn.addEventListener('click', () => fileInput.click());
            fileInput.addEventListener('change', async () => {
                const file = fileInput.files && fileInput.files[0];
                fileInput.value = '';
                if (!file) return;
                const author = (window.getCurrentUser && window.getCurrentUser()) || null;
                await PhotoStorage.upload(file, author);
                refresh(PhotoStorage);
            });
        }

        if (pinBtn) {
            pinBtn.addEventListener('click', async () => {
                const photo = currentPhoto();
                if (!photo) return;
                await PhotoStorage.setPinned(photo.id);
                refresh(PhotoStorage);
            });
        }

        if (removeBtn) {
            removeBtn.addEventListener('click', async () => {
                const photo = currentPhoto();
                if (!photo) return;
                if (!confirm('Remover esta foto? Esta ação não pode ser desfeita.')) return;
                await PhotoStorage.remove(photo.id, photo.storage_path);
                refresh(PhotoStorage);
            });
        }

        PhotoStorage.subscribe(() => refresh(PhotoStorage));
        refresh(PhotoStorage);
    });
})();
