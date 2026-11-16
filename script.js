/* ==========================================================
   Salsa's Portfolio — interaction helpers
   - accessible mobile navigation
   - case-study dialogs
   - image viewer with keyboard and touch navigation
   - graceful handling for missing local image assets
   ========================================================== */
(() => {
    'use strict';

    const $ = (selector, scope = document) => scope.querySelector(selector);
    const $$ = (selector, scope = document) => Array.from(scope.querySelectorAll(selector));

    const isLocal = location.protocol === 'file:' ||
        ['localhost', '127.0.0.1', '[::1]'].includes(location.hostname);
    if (isLocal) document.documentElement.classList.add('is-local');

    const probe = (src) => new Promise((resolve) => {
        if (!src) return resolve(false);
        const img = new Image();
        img.onload = () => resolve(true);
        img.onerror = () => resolve(false);
        img.src = src;
    });

    /* ---------- Mobile navigation ---------- */
    const toggle = $('.nav-toggle');
    const links = $('#nav-links');

    if (toggle && links) {
        const setOpen = (open) => {
            links.classList.toggle('is-open', open);
            toggle.setAttribute('aria-expanded', String(open));
            toggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
            const icon = $('i', toggle);
            if (icon) icon.className = open ? 'fa-solid fa-xmark' : 'fa-solid fa-bars';
        };

        toggle.addEventListener('click', () => setOpen(toggle.getAttribute('aria-expanded') !== 'true'));
        $$('a', links).forEach((link) => link.addEventListener('click', () => setOpen(false)));
        document.addEventListener('keydown', (event) => {
            if (event.key === 'Escape' && links.classList.contains('is-open')) {
                setOpen(false);
                toggle.focus();
            }
        });
        document.addEventListener('click', (event) => {
            if (links.classList.contains('is-open') &&
                !links.contains(event.target) && !toggle.contains(event.target)) setOpen(false);
        });
    }

    /* ---------- Highlight the visible navigation section ---------- */
    if ('IntersectionObserver' in window) {
        const navLinks = $$('.nav-links a');
        const targets = navLinks
            .map((link) => $(link.getAttribute('href')))
            .filter(Boolean);

        const observer = new IntersectionObserver((entries) => {
            entries.forEach((entry) => {
                if (!entry.isIntersecting) return;
                navLinks.forEach((link) => {
                    const current = link.getAttribute('href') === `#${entry.target.id}`;
                    if (current) link.setAttribute('aria-current', 'true');
                    else link.removeAttribute('aria-current');
                });
            });
        }, { rootMargin: '-42% 0px -48% 0px' });

        targets.forEach((target) => observer.observe(target));
    }

    /* ---------- Profile photo fallback ---------- */
    const frame = $('.profile-frame');
    const photo = frame ? $('img', frame) : null;
    if (frame && photo) {
        const useInitial = () => frame.classList.add('no-photo');
        photo.addEventListener('error', useInitial);
        if (photo.complete && photo.naturalWidth === 0) useInitial();
    }

    /* ---------- Shared dialog helpers ---------- */
    function openDialog(dialog) {
        if (!dialog) return;
        if (typeof dialog.showModal === 'function') {
            if (!dialog.open) dialog.showModal();
        } else {
            dialog.setAttribute('open', '');
        }
        document.body.classList.add('is-locked');
    }

    $$('[data-open]').forEach((button) => {
        button.addEventListener('click', () => {
            const dialog = document.getElementById(button.dataset.open);
            if (!dialog) return;
            openDialog(dialog);
            const content = $('.modal-content', dialog);
            if (content) content.scrollTop = 0;
            dialog._opener = button;
        });
    });

    $$('dialog').forEach((dialog) => {
        dialog.addEventListener('click', (event) => {
            if (event.target === dialog) dialog.close();
        });
        dialog.addEventListener('close', () => {
            if (!$('dialog[open]')) document.body.classList.remove('is-locked');
            if (dialog._opener) dialog._opener.focus();
        });
    });

    $$('[data-close]').forEach((button) => {
        button.addEventListener('click', () => button.closest('dialog')?.close());
    });

    /* ---------- Image viewer ---------- */
    const viewer = $('#lightbox');
    const viewerImg = viewer ? $('.lightbox-img', viewer) : null;
    const viewerCaption = viewer ? $('.lightbox-caption', viewer) : null;
    const viewerCounter = viewer ? $('.lightbox-counter', viewer) : null;
    const viewerOriginal = viewer ? $('.lightbox-original', viewer) : null;
    const prevBtn = viewer ? $('.lightbox-prev', viewer) : null;
    const nextBtn = viewer ? $('.lightbox-next', viewer) : null;

    let items = [];
    let index = 0;
    let returnFocusTo = null;

    const showImage = (nextIndex) => {
        if (!items.length || !viewerImg) return;
        index = (nextIndex + items.length) % items.length;
        const item = items[index];
        viewerImg.src = item.src;
        viewerImg.alt = item.alt;
        viewerCaption.textContent = item.caption || '';
        viewerCounter.textContent = items.length > 1 ? `${index + 1} / ${items.length}` : '';
        viewerOriginal.href = item.src;
        prevBtn.hidden = nextBtn.hidden = items.length < 2;
    };

    const openViewer = (list, start, trigger) => {
        if (!list.length || !viewer) return;
        items = list;
        returnFocusTo = trigger || null;
        showImage(start);
        openDialog(viewer);
    };

    if (viewer && viewerImg && prevBtn && nextBtn) {
        prevBtn.addEventListener('click', () => showImage(index - 1));
        nextBtn.addEventListener('click', () => showImage(index + 1));

        viewer.addEventListener('keydown', (event) => {
            if (event.key === 'ArrowLeft' && items.length > 1) showImage(index - 1);
            if (event.key === 'ArrowRight' && items.length > 1) showImage(index + 1);
        });

        let touchStartX = null;
        viewer.addEventListener('touchstart', (event) => {
            touchStartX = event.changedTouches[0]?.clientX ?? null;
        }, { passive: true });
        viewer.addEventListener('touchend', (event) => {
            if (touchStartX === null || items.length < 2) return;
            const endX = event.changedTouches[0]?.clientX ?? touchStartX;
            const delta = endX - touchStartX;
            if (Math.abs(delta) > 50) showImage(index + (delta < 0 ? 1 : -1));
            touchStartX = null;
        }, { passive: true });

        viewer.addEventListener('close', () => {
            viewerImg.removeAttribute('src');
            if (returnFocusTo) returnFocusTo.focus();
        });
    }

    /* ---------- Photo galleries on experience cards ---------- */
    const refreshActionRows = () => {
        $$('.card-actions').forEach((row) => {
            const hasVisible = Array.from(row.children).some((child) => !child.hidden);
            row.classList.toggle('has-actions', hasVisible);
        });
    };

    refreshActionRows();

    $$('.card-gallery').forEach(async (list) => {
        const entries = $$('li', list);
        const checks = await Promise.all(entries.map(async (li) => ({
            li,
            ok: await probe(li.dataset.src)
        })));

        const photos = checks.filter((check) => check.ok).map((check) => ({
            src: check.li.dataset.src,
            alt: check.li.dataset.alt || '',
            caption: list.dataset.title || ''
        }));

        const trigger = $('.gallery-trigger', list.parentElement);
        if (!photos.length || !trigger) return;

        const count = $('.count', trigger);
        if (count && photos.length > 1) count.textContent = `(${photos.length})`;
        trigger.hidden = false;
        trigger.addEventListener('click', () => openViewer(photos, 0, trigger));
        refreshActionRows();
    });

    /* ---------- Project covers and case-study screenshots ---------- */
    const loadShot = async (figure) => {
        const src = figure.dataset.src;
        const alt = figure.dataset.alt || '';
        if (!src) return;

        const zoomable = figure.hasAttribute('data-zoom');
        const ok = await probe(src);
        if (!ok) {
            const placeholder = document.createElement('div');
            placeholder.className = 'shot-placeholder';

            const icon = document.createElement('i');
            icon.className = 'fa-regular fa-image';
            icon.setAttribute('aria-hidden', 'true');

            const message = document.createElement('span');
            message.textContent = zoomable ? 'Screenshot coming soon' : 'Preview coming soon';

            const path = document.createElement('span');
            path.className = 'dev-path';
            path.textContent = `Add file: ${src}`;
            placeholder.append(icon, message, path);
            figure.append(placeholder);
            return;
        }

        const img = document.createElement('img');
        img.src = src;
        img.alt = alt;
        img.loading = 'lazy';
        img.decoding = 'async';

        if (!zoomable) {
            figure.append(img);
            return;
        }

        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'shot-btn';
        button.setAttribute('aria-label', `Enlarge image: ${alt || 'project image'}`);
        button.append(img);
        figure.append(button);
        figure.classList.add('is-loaded');

        if (figure.dataset.caption) {
            const caption = document.createElement('figcaption');
            caption.textContent = figure.dataset.caption;
            figure.append(caption);
        }

        button.addEventListener('click', () => {
            const scope = figure.closest('.modal-body') || document;
            const loaded = $$('.shot.is-loaded[data-zoom]', scope).map((shot) => ({
                src: shot.dataset.src,
                alt: shot.dataset.alt || '',
                caption: shot.dataset.caption || ''
            }));
            const start = loaded.findIndex((item) => item.src === src);
            openViewer(loaded, Math.max(start, 0), button);
        });
    };

    $$('.shot').forEach((figure) => { loadShot(figure); });
})();
