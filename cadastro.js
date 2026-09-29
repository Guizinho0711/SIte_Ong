(() => {
  'use strict';
  const KEY = 'rd_cadastros';
  const $ = s => document.querySelector(s);
  const form = $('#form-cad');
  const load = () => { try { return JSON.parse(localStorage.getItem(KEY)) || []; } catch { return []; } };

  const cpfValido = v => {
    const d = v.replace(/\D/g, '');
    if (d.length !== 11 || /^(\d)\1+$/.test(d)) return false;
    const dv = n => {
      let s = 0;
      for (let i = 0; i < n; i++) s += +d[i] * (n + 1 - i);
      const r = (s * 10) % 11;
      return r === 10 ? 0 : r;
    };
    return dv(9) === +d[9] && dv(10) === +d[10];
  };

  $('#cpf').addEventListener('input', e => {
    const d = e.target.value.replace(/\D/g, '').slice(0, 11);
    e.target.value = d.replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d{1,2})$/, '$1-$2');
  });

  const erro = (id, m) => {
    $('#e-' + id).textContent = m;
    $('#' + id).setAttribute('aria-invalid', !!m);
    return !m;
  };

  form.addEventListener('submit', e => {
    e.preventDefault();
    const v = Object.fromEntries(new FormData(form));
    Object.keys(v).forEach(k => v[k] = v[k].trim());
    const lista = load();
    const cpfNum = v.cpf.replace(/\D/g, '');
    let ok = true;
    ok = erro('nome', v.nome.split(/\s+/).length >= 2 ? '' : 'Informe o nome completo.') && ok;
    ok = erro('email', /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.email) ? '' : 'E-mail inválido.') && ok;
    ok = erro('cpf', !cpfValido(v.cpf) ? 'CPF inválido.' : lista.some(p => p.cpf === cpfNum) ? 'Este CPF já está cadastrado.' : '') && ok;
    ok = erro('endereco', v.endereco.length >= 5 ? '' : 'Informe o endereço.') && ok;
    if (!ok) return;

    lista.push({ id: Date.now(), nome: v.nome, email: v.email.toLowerCase(), cpf: cpfNum, endereco: v.endereco, cras: v.cras, data: new Date().toISOString() });
    localStorage.setItem(KEY, JSON.stringify(lista));
    form.reset();
    const s = $('#status');
    s.hidden = false;
    s.className = 'status ok';
    s.textContent = 'Cadastro enviado com sucesso! A equipe entrará em contato.';
    s.scrollIntoView({ behavior: 'smooth', block: 'center' });
  });
})();
