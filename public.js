(async () => {
  const db = window.rosaDB, esc = window.esc, $ = id => document.getElementById(id);
  const form = $('f-cadastro'), aviso = $('cad-aviso');
  form.addEventListener('submit', async e => {
    e.preventDefault();
    if (form.site.value) return;
    if (!db) { aviso.textContent = 'Cadastro indisponível no momento. Procure a equipe no espaço.'; return; }
    const btn = form.querySelector('button'); btn.disabled = true;
    const { error } = await db.rpc('cadastrar', { p_nome: form.nome.value, p_telefone: form.telefone.value, p_oficina: form.oficina.value ? +form.oficina.value : null });
    btn.disabled = false;
    if (error) { aviso.textContent = /lotada/i.test(error.message) ? 'Essa oficina está lotada. Escolha outra ou fale com a equipe.' : 'Não foi possível concluir. Confira os dados e tente de novo.'; return; }
    aviso.textContent = 'Cadastro realizado! A equipe entrará em contato pelo telefone informado.';
    form.reset();
  });
  if (!db) return;
  const [s, o, i] = await Promise.all([
    db.from('slides').select('*').order('criado'),
    db.from('oficinas').select('*').order('nome'),
    db.from('integrantes').select('oficina_id')
  ]);
  const slides = s.data || [], oficinas = o.data || [];

  if (slides.length) {
    const sec = $('galeria'), box = sec.querySelector('.slides');
    box.innerHTML = slides.map((x, n) => `<figure class="slide${n ? '' : ' on'}"><img src="${esc(x.url)}" alt="${esc(x.legenda || 'Foto da associação')}" loading="lazy">${x.legenda ? `<figcaption>${esc(x.legenda)}</figcaption>` : ''}</figure>`).join('');
    sec.hidden = false;
    let k = 0;
    const go = n => { box.children[k].classList.remove('on'); k = (n + slides.length) % slides.length; box.children[k].classList.add('on'); };
    sec.querySelector('.prev').onclick = () => go(k - 1);
    sec.querySelector('.next').onclick = () => go(k + 1);
    if (slides.length > 1) setInterval(() => go(k + 1), 5000);
  }

  if (oficinas.length) {
    const usado = {};
    (i.data || []).forEach(x => usado[x.oficina_id] = (usado[x.oficina_id] || 0) + 1);
    $('vagas').querySelector('.cards').innerHTML = oficinas.map(x => {
      const livres = x.vagas - (usado[x.id] || 0);
      return `<li class="card"><h3>${esc(x.nome)}</h3><p>${esc(x.dia || '')}</p><p><strong>${livres > 0 ? livres + ' vagas livres' : 'Turma cheia'}</strong> (de ${x.vagas})</p></li>`;
    }).join('');
    $('sel-oficina').insertAdjacentHTML('beforeend', oficinas.filter(x => x.vagas - (usado[x.id] || 0) > 0).map(x => `<option value="${x.id}">${esc(x.nome)}${x.dia ? ' — ' + esc(x.dia) : ''}</option>`).join(''));
    $('vagas').hidden = false;
  }
})();
