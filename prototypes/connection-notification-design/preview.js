const q = selector => document.querySelector(selector);
const variants = {
  card: ['01 · Karta s farebným pásikom', 'Biela plocha, zreteľná stavová ikona a samostatná akcia. Najbližšie k existujúcemu dizajnu aplikácie.'],
  tinted: ['02 · Stavová hlavička', 'Jemne podfarbená hlavička odlíši výsledok aj na hustejšej obrazovke. Telo zachováva neutrálnu plochu aplikácie.'],
  compact: ['03 · Kompaktná notifikácia', 'Menšia karta s názvom providera a výsledkom. Podrobnosti sú dostupné cez View result; vhodná pri viacerých notifikáciách.'],
};
function render() {
  const failed = q('#outcome').value === 'error';
  const provider = q('#long').checked ? 'IBM Flash Source 01 — Bratislava / Production / Storage infrastructure / Primary datacenter' : 'IBM Flash Source 01';
  const cards = [];
  for (let index = 0; index < (q('#stack').checked ? 3 : 1); index++) {
    const card = q('#notification-template').content.firstElementChild.cloneNode(true);
    const name = index === 0 ? provider : ['VMware Production', 'IBM Flash Target 01'][index - 1];
    card.classList.toggle('success', !failed);
    card.querySelector('.status-icon').textContent = failed ? '!' : '✓';
    card.querySelector('.notification-title').textContent = failed ? 'Connection test failed' : 'Connection successful';
    card.querySelector('.provider').textContent = name;
    card.querySelector('.description').textContent = failed ? 'Could not verify the connection. Open the result for details.' : 'The provider is available. All connection checks passed.';
    card.querySelector('.dismiss').onclick = () => { q('#restore').focus(); card.remove(); };
    card.querySelector('.view-result').onclick = () => {
      q('#result-provider').textContent = name;
      q('#result-summary').textContent = failed ? 'Reachability check failed. Verify the endpoint and credentials.' : 'Configuration, credentials and reachability checks passed.';
      q('#result').showModal();
    };
    cards.push(card);
  }
  q('#notifications').replaceChildren(...cards);
}
document.querySelectorAll('button[data-variant]').forEach(button => {
  button.onclick = () => {
    document.body.dataset.variant = button.dataset.variant;
    document.querySelectorAll('button[data-variant]').forEach(choice => choice.setAttribute('aria-pressed', String(choice === button)));
    q('#variant-title').textContent = variants[button.dataset.variant][0];
    q('#variant-description').textContent = variants[button.dataset.variant][1];
  };
});
['#outcome', '#long', '#stack'].forEach(selector => { q(selector).onchange = render; });
q('#dark').onchange = () => document.body.classList.toggle('dark', q('#dark').checked);
q('#restore').onclick = render;
q('#close-result').onclick = () => q('#result').close();
render();
