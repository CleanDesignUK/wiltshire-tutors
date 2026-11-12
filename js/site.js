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
  document.querySelectorAll('.hub-card-grid, .process-grid, .values-grid, .tutor-page-grid, .pricing-cards, .blog-index-grid').forEach((rail, index) => {
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

  // Form is intentionally AJAX-only: never navigates to Web3Forms' default success page.
  const forms = [...document.querySelectorAll('[data-enquiry-form]')];
  const query = new URLSearchParams(window.location.search);
  const incomingSubject = query.get('subject');
  if (incomingSubject) {
    forms.forEach(form => {
      const textarea = form.querySelector('textarea[name="message"]');
      if (textarea && !textarea.value) textarea.value = `I'm interested in ${incomingSubject} tutoring. `;
    });
  }
  const notify = async (kind, title, message) => {
    if (window.Swal && typeof window.Swal.fire === 'function') {
      return window.Swal.fire({ icon: kind, title, text: message, confirmButtonColor: '#fa3eb2', confirmButtonText: 'OK', customClass: { confirmButton: 'swal-confirm' } });
    }
    window.alert(`${title}\n${message}`);
  };
  forms.forEach(form => {
    form.addEventListener('submit', async event => {
      event.preventDefault();
      if (!form.reportValidity()) return;
      const botcheck = form.querySelector('input[name="botcheck"]');
      if (botcheck?.checked) return;
      const button = form.querySelector('button[type="submit"]');
      const status = form.querySelector('.form-feedback');
      if (button?.disabled) return;
      const previousLabel = button?.textContent;
      if (button) { button.disabled = true; button.textContent = 'Sending your enquiry…'; }
      if (status) { status.classList.remove('visually-hidden'); status.textContent = 'Sending your enquiry…'; }
      try {
        const response = await fetch('https://api.web3forms.com/submit', {
          method: 'POST', headers: { 'Accept': 'application/json' }, body: new FormData(form)
        });
        const result = await response.json();
        if (!response.ok || result.success !== true) throw new Error(result.message || 'Submission could not be completed');
        form.reset();
        if (status) status.textContent = 'Your enquiry has been sent successfully.';
        await notify('success', 'Thank you!', 'Your enquiry has been submitted. Our team will be in touch with you shortly.');
      } catch (error) {
        if (status) status.textContent = 'Your enquiry was not sent. Please try again or email us directly.';
        await notify('error', 'Unable to send your enquiry', 'Please try again or contact wiltshire@nwttutoring.com directly.');
        console.error('Wiltshire Tutoring form error:', error);
      } finally {
        if (button) { button.disabled = false; button.textContent = previousLabel; }
      }
    });
  });
})();
