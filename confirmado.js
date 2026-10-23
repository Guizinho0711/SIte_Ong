(() => {
  const $ = id => document.getElementById(id), db = window.rosaDB;
  const mostrar = (ok, t, p) => { $('ico').textContent = ok ? '✓' : '!'; $('ico').className = 'ok' + (ok ? '' : ' erro'); $('t').textContent = t; $('p').textContent = p; };
  const token = new URLSearchParams(location.search).get('t');
  if (!db || !token) return mostrar(false, 'Link inválido', 'Abra o link que enviamos por e-mail ou procure a equipe da associação.');
  db.rpc('confirmar', { p_token: token }).then(({ data, error }) => {
    if (error || !data) return mostrar(false, 'Não foi possível confirmar', 'O link pode estar incorreto. Procure a equipe da associação.');
    mostrar(true, 'Cadastro confirmado!', 'Obrigado! Seu e-mail foi confirmado e a equipe da Rosa de Ouro entrará em contato.');
  });
})();
