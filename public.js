(async () => {
  const db = window.rosaDB, esc = window.esc, $ = id => document.getElementById(id);
  const ICO = { oficina: '🎨', saude: '🧘', apoio: '🤝' };
  const AREAS = { oficina: 'Oficinas', saude: 'Saúde e bem-estar', apoio: 'Apoio social' };

  const form = $('f-cadastro'), aviso = $('cad-aviso');
  form.addEventListener('submit', async e => {
    e.preventDefault();
    if (form.site.value) return;
    if (!db) { aviso.textContent = 'Cadastro indisponível no momento. Procure a equipe no espaço.'; return; }
    const escolhidas = [...form.querySelectorAll('input[name="oficinas"]:checked')].map(c => +c.value);
    const btn = form.querySelector('button'); btn.disabled = true;
    const { error } = await db.rpc('cadastrar', { p_nome: form.nome.value, p_telefone: form.telefone.value, p_email: form.email.value, p_cras: form.cras.value, p_oficinas: escolhidas.length ? escolhidas : null });
    btn.disabled = false;
    if (error) { aviso.textContent = /lotada/i.test(error.message) ? 'Uma das oficinas escolhidas está lotada. Ajuste a seleção ou fale com a equipe.' : 'Não foi possível concluir. Confira os dados e tente de novo.'; return; }
    aviso.textContent = 'Cadastro realizado! A equipe entrará em contato pelo telefone informado.';
    form.reset();
  });

  if (!db) { $('lista-atividades').innerHTML = '<li class="muted">As atividades serão exibidas em breve.</li>'; return; }

  const [o, i, a, g] = await Promise.all([
    db.from('oficinas').select('*').order('nome'),
    db.from('integrantes').select('oficina_id'),
    db.from('avisos').select('*').order('fixado', { ascending: false }).order('criado', { ascending: false }),
    db.from('instagram').select('*').order('criado', { ascending: false }).limit(6)
  ]);
  const of = o.data || [], usado = {};
  (i.data || []).forEach(x => usado[x.oficina_id] = (usado[x.oficina_id] || 0) + 1);
  const livres = x => x.vagas == null ? null : Math.max(x.vagas - (usado[x.id] || 0), 0);

  $('st-of').textContent = of.length;
  $('st-livres').textContent = of.reduce((s, x) => s + (livres(x) || 0), 0);
  $('st-insc').textContent = Object.values(usado).reduce((s, n) => s + n, 0);

  let filtro = 'todas';
  const quando = x => (x.dia || 'Dia a confirmar') + ' · ' + (x.horario || 'horário a confirmar');
  const vagasTxt = x => { const l = livres(x); return l == null ? 'Sem inscrição prévia' : l > 0 ? `${l} de ${x.vagas} vagas livres` : 'Turma cheia'; };
  const draw = () => {
    const lista = of.filter(x => filtro === 'todas' || x.categoria === filtro);
    $('lista-atividades').innerHTML = lista.map(x => `<li class="card"><span class="ico" aria-hidden="true">${ICO[x.categoria] || '🌹'}</span><h3>${esc(x.nome)}</h3><p>${esc(quando(x))}</p><p><strong>${vagasTxt(x)}</strong></p></li>`).join('') || '<li class="muted">Nenhuma atividade nesta categoria.</li>';
  };
  const chips = [...document.querySelectorAll('.chip')];
  chips.forEach(c => c.addEventListener('click', () => {
    filtro = c.dataset.filter;
    chips.forEach(k => { k.classList.toggle('active', k === c); k.setAttribute('aria-pressed', k === c); });
    draw();
  }));
  draw();

  const bar = (nome, pct, rot, desc) => `<div class="bar"><span>${esc(nome)}</span><div class="track" role="img" aria-label="${esc(desc)}"><i style="width:${pct}%"></i></div><em>${rot}</em></div>`;
  $('graf-vagas').innerHTML = of.filter(x => x.vagas != null).map(x => { const u = usado[x.id] || 0; return bar(x.nome, Math.min(100, Math.round(u / x.vagas * 100)), `${u}/${x.vagas}`, `${u} de ${x.vagas} vagas ocupadas`); }).join('') || '<p class="muted">Sem dados ainda.</p>';
  $('graf-areas').innerHTML = Object.keys(AREAS).map(k => { const n = of.filter(x => x.categoria === k).length; return bar(AREAS[k], of.length ? Math.round(n / of.length * 100) : 0, n, `${n} atividades em ${AREAS[k]}`); }).join('');

  const abertas = of.filter(x => (livres(x) || 0) > 0);
  $('lista-check-oficinas').innerHTML = abertas.length
    ? abertas.map(x => `<label class="chk"><input type="checkbox" name="oficinas" value="${x.id}"> ${esc(x.nome)} — ${esc(quando(x))}</label>`).join('')
    : '<p class="mut">Nenhuma oficina com vaga no momento.</p>';

  const av = a.data || [];
  if (av.length) $('quadro').innerHTML = av.map(x => `<article class="aviso${x.fixado ? ' fixo' : ''}"><h3>${x.fixado ? '📌 ' : ''}${esc(x.titulo)}</h3><p>${esc(x.texto || '')}</p><small>${new Date(x.criado).toLocaleDateString('pt-BR')}</small></article>`).join('');

  const ig = g.data || [];
  if (ig.length) {
    $('insta-grid').innerHTML = ig.map(x => `<blockquote class="instagram-media" data-instgrm-permalink="${esc(x.url)}" data-instgrm-version="14"></blockquote>`).join('');
    const s = document.createElement('script'); s.async = true; s.src = 'https://www.instagram.com/embed.js'; document.body.append(s);
  }
})();
