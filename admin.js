(() => {
  const db = window.rosaDB, esc = window.esc, $ = s => document.querySelector(s);
  const login = $('#login'), area = $('#area'), aviso = $('#aviso'), sair = $('#sair');
  const msg = t => { aviso.textContent = t; };
  if (!db) { $('#f-login').hidden = true; return msg('Banco ainda não configurado: preencha o config.js.'); }

  let of = [], pe = [], ints = [], sl = [], av = [], ig = [];
  const CAT = { oficina: 'Oficina', saude: 'Saúde e bem-estar', apoio: 'Apoio social' };
  const load = async () => {
    const q = (t, c, asc) => db.from(t).select('*').order(c, { ascending: asc });
    const r = await Promise.all([q('oficinas', 'nome', true), q('pessoas', 'nome', true), db.from('integrantes').select('*'), q('slides', 'criado', true), q('avisos', 'criado', false), q('instagram', 'criado', false)]);
    [of, pe, ints, sl, av, ig] = r.map(x => x.data || []);
    draw();
  };
  const run = async (p, ok) => { const { error } = await p; if (error) return msg('Erro: ' + error.message); msg(ok || ''); await load(); };

  const bar = (n, pct, rot) => `<div class="bar"><span>${esc(n)}</span><div class="track"><i style="width:${pct}%"></i></div><em>${rot}</em></div>`;
  function dashboard() {
    const total = pe.length, conf = pe.filter(p => p.confirmado).length;
    const usados = o => ints.filter(x => x.oficina_id === o.id).length;
    const livres = of.reduce((s, o) => o.vagas == null ? s : s + Math.max(o.vagas - usados(o), 0), 0);
    $('#kpis').innerHTML = [[total, 'pessoas cadastradas'], [conf, 'e-mails confirmados'], [ints.length, 'inscrições'], [livres, 'vagas livres']].map(([n, t]) => `<div class="kpi"><strong>${n}</strong><span>${t}</span></div>`).join('');
    $('#d-ofic').innerHTML = of.filter(o => o.vagas != null).map(o => bar(o.nome, Math.min(100, Math.round(usados(o) / o.vagas * 100)), `${usados(o)}/${o.vagas}`)).join('') || '<p class="muted">Sem dados ainda.</p>';
    $('#d-conf').innerHTML = bar('Confirmados', total ? Math.round(conf / total * 100) : 0, conf) + bar('Pendentes', total ? Math.round((total - conf) / total * 100) : 0, total - conf);
  }
  function draw() {
    dashboard();
    $('#lista-oficinas').innerHTML = of.map(o => {
      const mem = ints.filter(x => x.oficina_id === o.id);
      const livres = pe.filter(p => !mem.some(m => m.pessoa_id === p.id));
      const nomes = mem.map(m => { const p = pe.find(x => x.id === m.pessoa_id); return `<li>${esc(p?.nome)} <button type="button" class="icon-btn" data-act="tirar" data-p="${m.pessoa_id}" aria-label="Remover ${esc(p?.nome)}">✕</button></li>`; }).join('') || '<li>Sem integrantes</li>';
      const cats = Object.entries(CAT).map(([k, v]) => `<option value="${k}"${o.categoria === k ? ' selected' : ''}>${v}</option>`).join('');
      return `<article class="card" data-id="${o.id}">
        <p><strong>${mem.length}${o.vagas != null ? '/' + o.vagas : ''}</strong> inscritos</p>
        <label>Nome<input data-f="nome" value="${esc(o.nome)}"></label>
        <label>Dia<input data-f="dia" value="${esc(o.dia || '')}" placeholder="Quarta-feira"></label>
        <label>Horário<input data-f="horario" value="${esc(o.horario || '')}" placeholder="14h às 16h"></label>
        <label>Área<select data-f="categoria">${cats}</select></label>
        <label>Vagas (vazio = sem inscrição)<input data-f="vagas" type="number" min="1" value="${o.vagas ?? ''}"></label>
        <div class="row"><button type="button" class="btn btn-small" data-act="salvar">Salvar</button><button type="button" class="btn btn-small btn-ghost" data-act="del">Excluir</button></div>
        <ul class="mem">${nomes}</ul>
        <div class="row"><select aria-label="Pessoa">${livres.map(p => `<option value="${p.id}">${esc(p.nome)}</option>`).join('')}</select><button type="button" class="btn btn-small" data-act="add">Adicionar integrante</button></div></article>`;
    }).join('') || '<p>Nenhuma atividade cadastrada.</p>';

    $('#lista-pessoas').innerHTML = pe.map(p => { const x = [p.telefone, p.email, p.cras ? 'CRAS: ' + p.cras : ''].filter(Boolean).join(' · '); return `<li data-id="${p.id}"><span>${esc(p.nome)}${x ? ' · ' + esc(x) : ''}</span><button type="button" class="icon-btn" data-act="delp" aria-label="Excluir ${esc(p.nome)}">✕</button></li>`; }).join('') || '<li>Nenhuma pessoa cadastrada.</li>';
    $('#lista-avisos').innerHTML = av.map(a => `<li data-id="${a.id}"><span>${a.fixado ? '📌 ' : ''}${esc(a.titulo)}</span><span><button type="button" class="btn btn-small btn-ghost" data-act="fixa">${a.fixado ? 'Desafixar' : 'Fixar'}</button> <button type="button" class="icon-btn" data-act="dela" aria-label="Excluir aviso">✕</button></span></li>`).join('') || '<li>Nenhum aviso.</li>';
    $('#lista-insta').innerHTML = ig.map(x => `<li data-id="${x.id}"><span>${esc(x.url)}</span><button type="button" class="icon-btn" data-act="deli" aria-label="Remover">✕</button></li>`).join('') || '<li>Nenhuma publicação adicionada.</li>';
    $('#lista-slides').innerHTML = sl.map(s => `<figure data-id="${s.id}"><img src="${esc(s.url)}" alt=""><figcaption>${esc(s.legenda || '')} <button type="button" class="icon-btn" data-act="dels" aria-label="Excluir foto">✕</button></figcaption></figure>`).join('') || '<p>Nenhuma foto.</p>';
  }

  area.addEventListener('click', async e => {
    const b = e.target.closest('button[data-act]'); if (!b) return;
    const box = b.closest('[data-id]'), id = +box.dataset.id;
    const g = k => box.querySelector(`[data-f="${k}"]`).value.trim();
    switch (b.dataset.act) {
      case 'salvar': return run(db.from('oficinas').update({ nome: g('nome'), dia: g('dia') || null, horario: g('horario') || null, categoria: g('categoria'), vagas: g('vagas') === '' ? null : +g('vagas') }).eq('id', id), 'Atividade salva.');
      case 'add': { const v = box.querySelector('select:not([data-f])').value; if (!v) return msg('Cadastre uma pessoa primeiro.'); return run(db.from('integrantes').insert({ oficina_id: id, pessoa_id: +v }), 'Integrante adicionado.'); }
      case 'tirar': return run(db.from('integrantes').delete().match({ oficina_id: id, pessoa_id: +b.dataset.p }));
      case 'del': if (confirm('Excluir esta atividade e seus vínculos?')) return run(db.from('oficinas').delete().eq('id', id)); break;
      case 'delp': if (confirm('Excluir esta pessoa?')) return run(db.from('pessoas').delete().eq('id', id)); break;
      case 'fixa': return run(db.from('avisos').update({ fixado: !av.find(x => x.id === id).fixado }).eq('id', id));
      case 'dela': return run(db.from('avisos').delete().eq('id', id));
      case 'deli': return run(db.from('instagram').delete().eq('id', id));
      case 'dels': { const s = sl.find(x => x.id === id); if (s?.caminho) await db.storage.from('fotos').remove([s.caminho]); return run(db.from('slides').delete().eq('id', id)); }
    }
  });

  const submit = (sel, fn) => $(sel).addEventListener('submit', async e => { e.preventDefault(); await fn(e.target); });
  submit('#f-oficina', async f => { await run(db.from('oficinas').insert({ nome: f.nome.value.trim(), dia: f.dia.value.trim() || null, horario: f.horario.value.trim() || null, categoria: f.categoria.value, vagas: f.vagas.value === '' ? null : +f.vagas.value }), 'Atividade criada.'); f.reset(); });
  submit('#f-pessoa', async f => { await run(db.from('pessoas').insert({ nome: f.nome.value.trim(), telefone: f.telefone.value.trim() }), 'Pessoa cadastrada.'); f.reset(); });
  submit('#f-aviso', async f => { await run(db.from('avisos').insert({ titulo: f.titulo.value.trim(), texto: f.texto.value.trim(), fixado: f.fixado.checked }), 'Aviso publicado.'); f.reset(); });
  submit('#f-insta', async f => {
    const url = f.url.value.trim();
    if (!/^https:\/\/(www\.)?instagram\.com\/(p|reel)\//.test(url)) return msg('Use o link de uma publicação (instagram.com/p/... ou /reel/...).');
    await run(db.from('instagram').insert({ url }), 'Publicação adicionada.'); f.reset();
  });
  const inputFoto = $('#input-foto'), labelFoto = $('#label-foto');
  inputFoto.addEventListener('change', () => { labelFoto.textContent = inputFoto.files[0]?.name || 'Escolher imagem'; });
  submit('#f-slide', async f => {
    const file = f.foto.files[0]; if (!file) return;
    const caminho = Date.now() + '-' + file.name.replace(/[^\w.-]/g, '_');
    const up = await db.storage.from('fotos').upload(caminho, file);
    if (up.error) return msg('Erro: ' + up.error.message);
    const url = db.storage.from('fotos').getPublicUrl(caminho).data.publicUrl;
    await run(db.from('slides').insert({ url, caminho, legenda: f.legenda.value.trim() }), 'Foto publicada.');
    f.reset(); labelFoto.textContent = 'Escolher imagem';
  });

  const nomeDe = u => u?.user_metadata?.display_name || u?.user_metadata?.nome || (u?.email ? u.email.split('@')[0] : '');
  const ola = u => { $('#boas-vindas').textContent = 'Olá, ' + (nomeDe(u) || 'equipe') + '!'; };
  const show = (on, session) => {
    login.hidden = on; area.hidden = !on; sair.hidden = !on;
    if (!on) return;
    ola(session?.user);
    db.auth.getUser().then(({ data }) => data?.user && ola(data.user));
    load();
  };
  db.auth.getSession().then(({ data }) => show(!!data.session, data.session));
  submit('#f-login', async f => {
    const { data, error } = await db.auth.signInWithPassword({ email: f.email.value, password: f.senha.value });
    if (error) return msg('E-mail ou senha inválidos.');
    msg(''); show(true, data.session);
  });
  sair.addEventListener('click', async () => { await db.auth.signOut(); show(false, null); });
})();
