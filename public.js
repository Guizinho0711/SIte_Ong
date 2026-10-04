(async () => {
  const db = window.rosaDB, esc = window.esc, $ = id => document.getElementById(id);
  const form = $('f-cadastro'), aviso = $('cad-aviso');

  form.addEventListener('submit', async e => {
    e.preventDefault();
    if (form.site.value) return;
    if (!db) { aviso.textContent = 'Cadastro indisponível no momento. Procure a equipe no espaço.'; return; }
    const escolhidas = [...form.querySelectorAll('input[name="oficinas"]:checked')].map(c => +c.value);
    const btn = form.querySelector('button'); btn.disabled = true;
    const { error } = await db.rpc('cadastrar', {
      p_nome: form.nome.value,
      p_telefone: form.telefone.value,
      p_email: form.email.value,
      p_cras: form.cras.value,
      p_oficinas: escolhidas.length ? escolhidas : null
    });
    btn.disabled = false;
    if (error) {
      aviso.textContent = /lotada/i.test(error.message)
        ? 'Uma das oficinas escolhidas está lotada. Ajuste a seleção ou fale com a equipe.'
        : 'Não foi possível concluir. Confira os dados e tente de novo.';
      return;
    }
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

    const detalhe = x => [x.dia, x.horario].filter(Boolean).join(' · ');

    $('vagas').querySelector('.cards').innerHTML = oficinas.map(x => {
      const livres = x.vagas - (usado[x.id] || 0);
      return `<li class="card"><h3>${esc(x.nome)}</h3><p>${esc(detalhe(x))}</p><p><strong>${livres > 0 ? livres + ' vagas livres' : 'Turma cheia'}</strong> (de ${x.vagas})</p></li>`;
    }).join('');

    const livres = oficinas.filter(x => x.vagas - (usado[x.id] || 0) > 0);
    const checkbox = $('lista-check-oficinas');
    checkbox.innerHTML = livres.length
      ? livres.map(x => `<label class="chk"><input type="checkbox" name="oficinas" value="${x.id}"> ${esc(x.nome)}${detalhe(x) ? ' — ' + esc(detalhe(x)) : ''}</label>`).join('')
      : '<p class="mut">Nenhuma oficina com vaga no momento.</p>';

    $('vagas').hidden = false;
  } else {
    $('lista-check-oficinas').innerHTML = '<p class="mut">Nenhuma oficina cadastrada ainda.</p>';
  }
})();
