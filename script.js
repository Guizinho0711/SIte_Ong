(() => {
  'use strict';
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];

  // Menu mobile
  const btn = $('.menu-btn'), nav = $('#menu');
  const setMenu = open => {
    nav.classList.toggle('open', open);
    btn.setAttribute('aria-expanded', open);
    btn.setAttribute('aria-label', open ? 'Fechar menu' : 'Abrir menu');
  };
  btn.addEventListener('click', () => setMenu(!nav.classList.contains('open')));
  nav.addEventListener('click', e => e.target.tagName === 'A' && setMenu(false));
  document.addEventListener('keydown', e => e.key === 'Escape' && setMenu(false));

  // Link ativo conforme a rolagem
  const links = $$('.nav a[href^="#"]');
  const spy = new IntersectionObserver(entries => {
    entries.forEach(en => {
      if (en.isIntersecting) {
        links.forEach(a => a.classList.toggle('on', a.getAttribute('href') === '#' + en.target.id));
      }
    });
  }, { rootMargin: '-45% 0px -50% 0px' });
  $$('main section[id]').forEach(s => spy.observe(s));

  // Filtro de atividades
  const chips = $$('.chip'), cards = $$('#lista-atividades .card');
  chips.forEach(chip => chip.addEventListener('click', () => {
    const f = chip.dataset.filter;
    chips.forEach(c => {
      const on = c === chip;
      c.classList.toggle('active', on);
      c.setAttribute('aria-pressed', on);
    });
    cards.forEach(card => { card.hidden = f !== 'todas' && card.dataset.cat !== f; });
  }));

  // Revelação suave e contadores
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const count = el => {
    const end = +el.dataset.count;
    if (reduce) return;
    const t0 = performance.now();
    const tick = t => {
      const p = Math.min((t - t0) / 900, 1);
      el.textContent = Math.round(end * p);
      if (p < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  };
  const io = new IntersectionObserver((entries, o) => entries.forEach(en => {
    if (!en.isIntersecting) return;
    en.target.classList.add('in');
    $$('[data-count]', en.target).forEach(count);
    o.unobserve(en.target);
  }), { threshold: .15 });
  $$('.card, .timeline li, .stats, .quote, .table-wrap, .dash').forEach(el => {
    el.classList.add('reveal');
    io.observe(el);
  });

  // Integração com o dashboard Rosa Digital
  const URL_DASH = 'https://rosadigital.onrender.com/';
  const load = $('#dash-load'), body = $('.dash-body'), msg = $('#dash-msg');
  if (load) load.addEventListener('click', () => {
    load.disabled = true;
    msg.textContent = 'Acordando o servidor… isso pode levar até um minuto.';
    const frame = document.createElement('iframe');
    frame.src = URL_DASH;
    frame.title = 'Dashboard Rosa Digital';
    frame.loading = 'lazy';
    frame.referrerPolicy = 'no-referrer';
    const fail = setTimeout(() => {
      msg.innerHTML = 'O painel demorou a responder. <a href="' + URL_DASH + '" target="_blank" rel="noopener">Abra em nova aba ↗</a>';
      load.disabled = false;
    }, 60000);
    frame.addEventListener('load', () => {
      clearTimeout(fail);
      body.classList.add('live');
      body.replaceChildren(frame);
    });
    body.append(frame);
    frame.style.cssText = 'position:absolute;width:1px;height:1px;opacity:0';
    frame.addEventListener('load', () => (frame.style.cssText = ''), { once: true });
  });

  // Ano no rodapé
  $('#ano').textContent = new Date().getFullYear();
})();
