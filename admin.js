(() => {
  const db = window.rosaDB, esc = window.esc, $ = s => document.querySelector(s);
  const login = $('#login'), painel = $('#painel'), aviso = $('#aviso');
  const msg = t => { aviso.textContent = t; };
  if (!db) { login.hidden = true; return msg('Banco ainda não configurado: preencha o config.js (veja o passo a passo).'); }

  let oficinas = [], pessoas = [], ints = [], slides = [];
  const load = async () => {
    const [o, p, i, s] = await Promise.all([
      db.from('oficinas').select('*').order('nome'), db.from('pessoas').select('*').order('nome'),
      db.from('integrantes').select('*'), db.from('slides').select('*').order('criado')]);
    [oficinas, pessoas, ints, slides] = [o.data || [], p.data || [], i.data || [], s.data || []];
    draw();
  };
  const run = async (promise, ok) => {
    const { error } = await promise;
    if (error) return msg('Erro: ' + error.message);
    msg(ok || ''); await load();
  };

  function draw() {
    $('#lista-oficinas').innerHTML = oficinas.map(o => {
      const mem = ints.filter(x => x.oficina_id === o.id);
      const livres = pessoas.filter(p => !mem.some(m => m.pessoa_id === p.id));
      const nomes = mem.map(m => {
        const p = pessoas.find(x => x.id === m.pessoa_id);
        return `<li>${esc(p?.nome)} <button type="button" data-act="tirar" data-p="${m.pessoa_id}" aria-label="Remover ${esc(p?.nome)}">✕</button></li>`;
      }).join('') || '<li>Sem integrantes</li>';
      const quando = [o.dia, o.horario].filter(Boolean).join(' · ');
      return `<article class="card" data-id="${o.id}"><h3>${esc(o.nome)}</h3>
        <p>${esc(quando)} · <strong>${mem.length}/${o.vagas}</strong> vagas ocupadas</p>
        <ul class="mem">${nomes}</ul>
        <div class="row"><select aria-label="Pessoa">${livres.map(p => `<option value="${p.id}">${esc(p.nome)}</option>`).join('')}</select><button type="button" class="btn btn-small" data-act="add">Adicionar</button></div>
        <div class="row"><input type="number" min="1" value="${o.vagas}" aria-label="Vagas (sem limite máximo)"><button type="button" class="btn btn-small btn-ghost" data-act="vagas">Salvar vagas</button><button type="button" class="btn btn-small btn-ghost" data-act="del">Excluir</button></div></article>`;
    }).join('') || '<p>Nenhuma oficina cadastrada.</p>';

    $('#lista-pessoas').innerHTML = pessoas.map(p => {
      const extra = [p.email, p.cras ? 'CRAS: ' + p.cras : null].filter(Boolean).join(' · ');
      return `<li data-id="${p.id}"><span>${esc(p.nome)} · ${esc(p.telefone || 'sem telefone')}${extra ? ' · ' + esc(extra) : ''}</span><button type="button" class="icon-btn" data-act="delp" aria-label="Excluir ${esc(p.nome)}">✕</button></li>`;
    }).join('') || '<li>Nenhuma pessoa cadastrada.</li>';

    $('#lista-slides').innerHTML = slides.map(s => `<figure data-id="${s.id}"><img src="${esc(s.url)}" alt=""><figcaption>${esc(s.legenda || '')} <button type="button" class="icon-btn" data-act="dels" aria-label="Excluir foto">✕</button></figcaption></figure>`).join('') || '<p>Nenhuma foto.</p>';
  }

  painel.addEventListener('click', async e => {
    const b = e.target.closest('button[data-act]');
    if (!b) return;
    const box = b.closest('[data-id]'), id = +box.dataset.id;
    switch (b.dataset.act) {
      case 'add': {
        const v = box.querySelector('select').value;
        if (!v) return msg('Cadastre uma pessoa primeiro.');
        return run(db.from('integrantes').insert({ oficina_id: id, pessoa_id: +v }), 'Integrante adicionado.');
      }
      case 'tirar': return run(db.from('integrantes').delete().match({ oficina_id: id, pessoa_id: +b.dataset.p }));
      case 'vagas': return run(db.from('oficinas').update({ vagas: +box.querySelector('input').value }).eq('id', id), 'Vagas atualizadas.');
      case 'del': if (confirm('Excluir esta oficina e seus vínculos?')) return run(db.from('oficinas').delete().eq('id', id)); break;
      case 'delp': if (confirm('Excluir esta pessoa?')) return run(db.from('pessoas').delete().eq('id', id)); break;
      case 'dels': {
        const s = slides.find(x => x.id === id);
        if (s?.caminho) await db.storage.from('fotos').remove([s.caminho]);
        return run(db.from('slides').delete().eq('id', id));
      }
    }
  });

  $('#f-oficina').addEventListener('submit', async e => {
    e.preventDefault(); const f = e.target;
    await run(db.from('oficinas').insert({ nome: f.nome.value.trim(), dia: f.dia.value.trim(), horario: f.horario.value.trim(), vagas: +f.vagas.value }), 'Oficina criada.'); f.reset();
  });
  $('#f-pessoa').addEventListener('submit', async e => {
    e.preventDefault(); const f = e.target;
    await run(db.from('pessoas').insert({ nome: f.nome.value.trim(), telefone: f.telefone.value.trim() }), 'Pessoa cadastrada.'); f.reset();
  });

  const inputFoto = $('#input-foto'), labelFoto = $('#label-foto');
  if (inputFoto) inputFoto.addEventListener('change', () => {
    labelFoto.textContent = inputFoto.files[0]?.name || 'Escolher imagem';
  });

  $('#f-slide').addEventListener('submit', async e => {
    e.preventDefault(); const f = e.target, file = f.foto.files[0];
    if (!file) return;
    const caminho = Date.now() + '-' + file.name.replace(/[^\w.-]/g, '_');
    const up = await db.storage.from('fotos').upload(caminho, file);
    if (up.error) return msg('Erro: ' + up.error.message);
    const url = db.storage.from('fotos').getPublicUrl(caminho).data.publicUrl;
    await run(db.from('slides').insert({ url, caminho, legenda: f.legenda.value.trim() }), 'Foto publicada.');
    f.reset(); labelFoto.textContent = 'Escolher imagem';
  });

  const show = (on, session) => {
    login.hidden = on; painel.hidden = !on;
    if (on) {
      const u = session?.user;
      const nome = u?.user_metadata?.display_name || u?.user_metadata?.nome || u?.email;
      $('#boas-vindas').textContent = 'Olá, ' + esc(nome) + '!';
      load();
    }
  };
  db.auth.getSession().then(({ data }) => show(!!data.session, data.session));
  $('#f-login').addEventListener('submit', async e => {
    e.preventDefault(); const f = e.target;
    const { data, error } = await db.auth.signInWithPassword({ email: f.email.value, password: f.senha.value });
    if (error) return msg('E-mail ou senha inválidos.');
    msg(''); show(true, data.session);
  });
  $('#sair').addEventListener('click', async () => { await db.auth.signOut(); show(false, null); });
})();
