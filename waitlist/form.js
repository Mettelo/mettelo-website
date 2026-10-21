const form = document.querySelector('#waitlist-form');
if (form) {
  const fields = form.querySelector('fieldset');
  const status = document.querySelector('#waitlist-status');
  const button = form.querySelector('button');
  let available = false;
  fetch('/waitlist/index.php', {cache:'no-store', headers:{Accept:'application/json'}})
    .then(response => { if(!response.ok) throw new Error(); return response.json(); })
    .then(data => {
      if(data.available !== true) return;
      available = true;
      fields.disabled = false;
      status.textContent = 'Sign up for platform launch updates.';
    }).catch(() => { /* Keep the clear unavailable state on static previews and network faults. */ });
  form.addEventListener('submit', async event => {
    event.preventDefault();
    if(!available || !form.reportValidity()) return;
    const data = new FormData(form);
    button.disabled = true;
    button.textContent = 'Sending…';
    status.textContent = 'Sending your request…';
    try {
      const response = await fetch('/waitlist/index.php', {method:'POST', headers:{'Content-Type':'application/json', Accept:'application/json'}, body:JSON.stringify({name:data.get('name'),email:data.get('email'),consent:data.get('consent')==='yes',website:data.get('website')})});
      const result = await response.json();
      if(!response.ok) throw new Error(result.message || 'We could not send your request. Please try again later.');
      form.reset();
      status.textContent = result.message;
    } catch(error) {
      status.textContent = error instanceof TypeError ? 'Connection interrupted. Your request may have reached us; please check before trying again.' : error.message;
    } finally { button.disabled = false; button.textContent = 'Join the platform waitlist'; }
  });
}
