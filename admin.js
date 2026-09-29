(() => {
  'use strict';
  const KEY = 'rd_cadastros', SESSION = 'rd_admin';
  // Login único da equipe. Para trocar a senha: gere o SHA-256 da nova senha e cole em SENHA_HASH.
  const ADMIN_EMAIL = 'admin@rosadeouro.org';
  const SENHA_HASH = '27da879543b9779731c76b1b1b782804017cbd40239367f29c83dfd2254995f2';

  const $ = s => document.querySelector(s);
  const load = () => { try { return JSON.parse(localStorage.getItem(KEY)) || []; } catch { return []; } };
  const sha = async t => [...new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(t)))].map(b => b.toString(16).padStart(2, '0')).join('');
  const fmtCpf = c => c.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');

  const mostrar = logado => {
    $('#login-box').hidden = logado;
    $('#painel').hidden = !logado;
    $('#sair').hidden = !logado;
    if (logado) render();
  };

  $('#form-login').addEventListener('submit', async e => {
    e.preventDefault();
    const okEmail = $('#a-email').value.trim().toLowerCase() === ADMIN_EMAIL;
    const okSenha = (await sha($('#a-senha').value)) === SENHA_HASH;
    if (okEmail && okSenha) {
      sessionStorage.setItem(SESSION, '1');
      $('#a-senha').value = '';
      mostrar(true);
    } else {
      const m = $('#login-msg');
      m.hidden = false;
      m.textContent = 'E-mail ou senha incorretos.';
    }
  });

  $('#sair').addEventListener('click', e => { e.preventDefault(); sessionStorage.removeItem(SESSION); mostrar(false); });

  const render = () => {
    const q = $('#busca').value.trim().toLowerCase();
    const todos = load();
    const lista = todos.filter(p => [p.nome, p.email, p.cpf, fmtCpf(p.cpf), p.cras].join(' ').toLowerCase().includes(q));
    $('#total').textContent = '(' + lista.length + ' de ' + todos.length + ')';
    const tb = $('#linhas');
    tb.replaceChildren();
    if (!lista.length) {
      const tr = tb.insertRow(), td = tr.insertCell();
      td.colSpan = 7;
      td.textContent = 'Nenhum cadastro encontrado.';
      return;
    }
    lista.forEach(p => {
      const tr = tb.insertRow();
      [p.nome, p.email, fmtCpf(p.cpf), p.endereco, p.cras || '—', new Date(p.data).toLocaleDateString('pt-BR')].forEach(t => { tr.insertCell().textContent = t; });
      const b = document.createElement('button');
      b.className = 'btn btn-small btn-danger';
      b.type = 'button';
      b.textContent = 'Excluir';
      b.setAttribute('aria-label', 'Excluir cadastro de ' + p.nome);
      b.addEventListener('click', () => {
        if (confirm('Excluir o cadastro de ' + p.nome + '?')) {
          localStorage.setItem(KEY, JSON.stringify(load().filter(x => x.id !== p.id)));
          render();
        }
      });
      tr.insertCell().append(b);
    });
  };
  $('#busca').addEventListener('input', render);

  $('#csv').addEventListener('click', () => {
    const cel = t => {
      t = String(t ?? '');
      if (/^[=+\-@]/.test(t)) t = "'" + t; // evita injeção de fórmula no Excel
      return '"' + t.replace(/"/g, '""') + '"';
    };
    const linhas = [['Nome', 'E-mail', 'CPF', 'Endereço', 'CRAS', 'Data'], ...load().map(p => [p.nome, p.email, fmtCpf(p.cpf), p.endereco, p.cras, p.data])];
    const blob = new Blob(['\ufeff' + linhas.map(l => l.map(cel).join(';')).join('\n')], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'cadastros-rosa-de-ouro.csv';
    a.click();
    URL.revokeObjectURL(a.href);
  });

  mostrar(sessionStorage.getItem(SESSION) === '1');
})();
