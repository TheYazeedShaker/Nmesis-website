/* Runs before styles paint; preferences persist without requiring storage access. */
(() => {
  const root=document.documentElement;
  const key='nmesis-color-theme';
  let theme='dark';
  try { const saved=localStorage.getItem(key);if(saved==='dark'||saved==='light')theme=saved; } catch {}
  const apply=value=>{
    root.dataset.theme=value;
    root.style.colorScheme=value;
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content',value==='dark'?'#101211':'#f7f8f6');
    document.querySelectorAll('[data-theme-toggle]').forEach(button=>{
      const label=value==='dark'?'Light mode':'Dark mode';
      button.setAttribute('aria-label',`Switch to ${label.toLowerCase()}`);
      button.querySelector('[data-theme-label]').textContent=label;
    });
  };
  apply(theme);
  document.addEventListener('DOMContentLoaded',()=>{
    apply(root.dataset.theme);
    document.querySelectorAll('[data-theme-toggle]').forEach(button=>button.addEventListener('click',()=>{
      theme=root.dataset.theme==='dark'?'light':'dark';
      apply(theme);
      try{localStorage.setItem(key,theme);}catch{}
    }));
  });
  window.addEventListener('storage',event=>{
    if(event.key===key&&(event.newValue==='light'||event.newValue==='dark'))apply(event.newValue);
  });
})();
