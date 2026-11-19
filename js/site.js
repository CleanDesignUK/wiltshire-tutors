/* Shared site interactions: cookie preference, mobile rail controls and Web3Forms AJAX. */
(() => {
  'use strict';
  document.querySelectorAll('[data-current-year]').forEach(element => { element.textContent = String(new Date().getFullYear()); });

  // No analytics scripts are installed. Store the visitor's optional-cookie decision only.
  const consentKey = 'wiltshire_tutoring_cookie_choice_v1';
  const banner = document.getElementById('cookie-banner');
  const setBanner = (visible) => {
    if (!banner) return;
    banner.hidden = !visible;
    document.body.classList.toggle('cookie-open', visible);
  };
  try { setBanner(!window.localStorage.getItem(consentKey)); }
  catch (_) { setBanner(true); }
  ['accept', 'decline'].forEach(choice => {
    const button = document.getElementById(`cookie-${choice}`);
    button?.addEventListener('click', () => {
      try { window.localStorage.setItem(consentKey, choice); } catch (_) { /* Storage might be blocked. */ }
      setBanner(false);
    });
  });

  // All card collections have explicit left/right controls on mobile, not tall stacked lists.
  document.querySelectorAll('.hub-card-grid, .process-grid, .values-grid, .tutor-page-grid, .pricing-cards, .blog-index-grid, .tutor-directory-grid').forEach((rail, index) => {
    if (!rail.id) rail.id = `mobile-card-rail-${index}`;
    const controls = document.createElement('div');
    controls.className = 'rail-controls mobile-only-arrows';
    ['prev','next'].forEach(direction => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'rail-arrow';
      button.setAttribute('aria-label', direction === 'prev' ? 'Scroll cards left' : 'Scroll cards right');
      button.dataset.railTarget = rail.id;
      button.dataset.direction = direction;
      button.innerHTML = `<i class="bi bi-chevron-${direction === 'prev' ? 'left' : 'right'}" aria-hidden="true"></i>`;
      controls.appendChild(button);
    });
    rail.parentNode.insertBefore(controls, rail);
  });

  document.querySelectorAll('[data-rail-target]').forEach(button => {
    button.addEventListener('click', () => {
      const target = document.getElementById(button.dataset.railTarget);
      if (!target) return;
      const firstCard = target.firstElementChild;
      if (!firstCard) return;
      const gap = parseFloat(window.getComputedStyle(target).columnGap) || 16;
      const cardWidth = firstCard.getBoundingClientRect().width + gap;
      const count = Math.max(1, Math.floor(target.clientWidth / cardWidth));
      const direction = button.dataset.direction === 'prev' ? -1 : 1;
      target.scrollBy({ left: direction * count * cardWidth, behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' });
    });
  });

  // Prefill a subject/tutor from links without bypassing the shared security handler.
  const params = new URLSearchParams(window.location.search);
  const context = params.get('subject') || params.get('tutor');
  if (context) document.querySelectorAll('.nwt-secure-form textarea[name="message"]').forEach(field => {
    if (!field.value.trim()) field.value = `I would like information about ${context} tutoring for my child. `;
  });

  // Filterable optional directory; each card is one accessible, fully clickable link.
  const directory = document.getElementById('directory-tutors');
  if (directory) {
    const search = document.getElementById('directory-search');
    const level = document.getElementById('directory-level');
    const subject = document.getElementById('directory-subject');
    const count = document.getElementById('directory-results');
    const cards = Array.from(directory.querySelectorAll('[data-tutor-card]'));
    const filter = () => {
      const needle = (search?.value || '').toLowerCase().trim();
      const stage = (level?.value || '').toLowerCase();
      const topic = (subject?.value || '').toLowerCase();
      let shown = 0;
      cards.forEach(card => {
        const haystack = `${card.dataset.name || ''} ${card.dataset.subjects || ''} ${card.dataset.levels || ''}`;
        const visible = (!needle || haystack.includes(needle)) && (!stage || (card.dataset.levels || '').includes(stage)) && (!topic || (card.dataset.subjects || '').includes(topic));
        card.hidden = !visible;
        if (visible) shown++;
      });
      if (count) count.textContent = shown ? `${shown} of ${cards.length} listed tutor${cards.length === 1 ? '' : 's'} shown. Ask us about current availability or tutors not listed.` : `No listed tutors match these filters. Our wider team may still be able to help; please enquire.`;
    };
    [search, level, subject].forEach(control => control?.addEventListener('input', filter));
    filter();
  }
})();
