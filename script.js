// Shared progressive navigation enhancement for V1 pages.
const toggle = document.querySelector('.menu-toggle');
const nav = document.querySelector('#main-nav');

if (toggle && nav) {
  document.documentElement.classList.add('js');
  const desktop = window.matchMedia('(min-width: 901px)');

  function closeMenu({ restoreFocus = false } = {}) {
    toggle.setAttribute('aria-expanded', 'false');
    nav.classList.remove('is-open');
    if (restoreFocus) toggle.focus();
  }

  toggle.addEventListener('click', () => {
    const open = toggle.getAttribute('aria-expanded') !== 'true';
    toggle.setAttribute('aria-expanded', String(open));
    nav.classList.toggle('is-open', open);
  });

  nav.addEventListener('click', (event) => {
    const link = event.target.closest('a');
    if (!link) return;
    closeMenu();
    // Keep keyboard focus with the destination when the mobile menu closes.
    if (link.hash && link.origin === location.origin && link.pathname === location.pathname) {
      const target = document.getElementById(link.hash.slice(1));
      if (target) {
        target.setAttribute('tabindex', '-1');
        target.focus({ preventScroll: true });
      }
    }
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && toggle.getAttribute('aria-expanded') === 'true') {
      closeMenu({ restoreFocus: true });
    }
  });
  document.addEventListener('click', (event) => {
    if (!event.target.closest('.nav')) closeMenu();
  });
  desktop.addEventListener('change', () => {
    const hiddenMenuHasFocus = !desktop.matches && nav.contains(document.activeElement);
    closeMenu({ restoreFocus: hiddenMenuHasFocus });
  });
}

const year = document.getElementById('year');
if (year) year.textContent = new Date().getFullYear();
