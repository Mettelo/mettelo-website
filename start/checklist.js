// Personal progress only: no requests, accounts or membership decisions.
(() => {
  const key = 'mettelo:onboarding:v1';
  const boxes = [...document.querySelectorAll('[data-step]')];
  const progress = document.getElementById('onboarding-progress');
  const text = document.getElementById('progress-text');
  const status = document.getElementById('storage-status');
  const reset = document.querySelector('.reset-progress');
  if (!boxes.length || !progress || !text || !status || !reset) return;

  let canSave = true;
  const ids = new Set(boxes.map(box => box.dataset.step));
  try {
    const saved = JSON.parse(localStorage.getItem(key) || '[]');
    if (Array.isArray(saved)) {
      const completed = new Set(saved.filter(id => typeof id === 'string' && ids.has(id)));
      boxes.forEach(box => { box.checked = completed.has(box.dataset.step); });
    }
  } catch {
    // Corrupt or blocked storage must never prevent using the checklist.
  }

  function render({ save = false } = {}) {
    const completed = boxes.filter(box => box.checked).map(box => box.dataset.step);
    progress.value = completed.length;
    progress.textContent = `${completed.length} of ${boxes.length}`;
    text.textContent = completed.length === boxes.length
      ? '7 of 7 steps complete — you’re ready to keep exploring.'
      : `${completed.length} of ${boxes.length} steps complete`;
    boxes.forEach(box => box.closest('.checklist-item').classList.toggle('is-complete', box.checked));
    reset.disabled = completed.length === 0;
    if (save) {
      try {
        localStorage.setItem(key, JSON.stringify(completed));
        canSave = true;
      } catch {
        canSave = false;
      }
    }
    status.textContent = canSave
      ? 'Progress stays in this browser only. Nothing is submitted to Mettelo.'
      : 'Browser storage is unavailable. You can still tick steps, but progress may not survive a reload.';
  }

  reset.hidden = false;
  boxes.forEach(box => box.addEventListener('change', () => render({ save: true })));
  reset.addEventListener('click', () => {
    boxes.forEach(box => { box.checked = false; });
    try { localStorage.removeItem(key); canSave = true; } catch { canSave = false; }
    render();
    boxes[0].focus();
  });
  // Do not create a storage record until the visitor uses the checklist.
  render();
})();
