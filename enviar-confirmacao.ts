// Função do Supabase (Edge Function): envia o e-mail de confirmação pelo Brevo.
// Segredos necessários (Edge Functions > Secrets):
//   BREVO_API_KEY, REMETENTE_EMAIL (verificado no Brevo), SITE_URL (ex.: https://seu-site.vercel.app), WEBHOOK_SECRET (invente uma senha longa)
const BREVO_KEY = Deno.env.get('BREVO_API_KEY')!;
const REMETENTE = Deno.env.get('REMETENTE_EMAIL')!;
const SITE = (Deno.env.get('SITE_URL') ?? '').replace(/\/$/, '');
const SEGREDO = Deno.env.get('WEBHOOK_SECRET')!;

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));

const corpo = (nome: string, link: string) => `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"></head>
<body style="margin:0;background:#fffaf7;font-family:Arial,Helvetica,sans-serif;color:#2b1d22">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:32px 16px">
<table role="presentation" width="100%" style="max-width:560px" cellpadding="0" cellspacing="0">
<tr><td style="padding-bottom:24px;font-size:22px;font-weight:bold;color:#b0405c">✿ Rosa de Ouro</td></tr>
<tr><td style="font-size:16px;line-height:1.6">
<p style="margin:0 0 16px">Olá, <strong>${esc(nome)}</strong>.</p>
<p style="margin:0 0 16px">Recebemos o seu cadastro na Associação Rosa de Ouro. Para confirmar o seu e-mail e concluir a inscrição, clique no botão abaixo.</p>
<table role="presentation" cellpadding="0" cellspacing="0" style="margin:24px 0"><tr><td bgcolor="#b0405c" style="border-radius:999px;padding:14px 28px"><a href="${link}" style="color:#ffffff;text-decoration:none;font-weight:bold;font-size:16px;display:inline-block">Confirmar meu cadastro</a></td></tr></table>
<p style="margin:0 0 8px"><strong>Para ficar tranquilo(a):</strong></p>
<ul style="margin:0 0 16px;padding-left:20px"><li>A equipe entrará em contato pelo telefone informado.</li><li>Veja dias, horários e vagas das oficinas no nosso site.</li><li>Se você não fez este cadastro, é só ignorar este e-mail.</li></ul>
</td></tr>
<tr><td style="border-top:1px solid #efd9dc;padding-top:20px;font-size:13px;color:#6f5860;line-height:1.6">Associação Rosa de Ouro · CNPJ 73.267.908/0001-30<br>Rua Tapaiuna, casa 01, Jardim Santa Maria, São Paulo/SP<br>(11) 4948-3617</td></tr>
</table></td></tr></table></body></html>`;

Deno.serve(async (req) => {
  if (req.headers.get('x-webhook-secret') !== SEGREDO) return new Response('negado', { status: 401 });
  const { type, record } = await req.json();
  if (type !== 'INSERT' || !record?.email || !record?.token) return new Response('ignorado');
  const link = `${SITE}/confirmado.html?t=${record.token}`;
  const r = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: { 'api-key': BREVO_KEY, 'content-type': 'application/json' },
    body: JSON.stringify({
      sender: { name: 'Associação Rosa de Ouro', email: REMETENTE },
      to: [{ email: record.email, name: record.nome }],
      subject: 'Confirme seu cadastro na Associação Rosa de Ouro',
      htmlContent: corpo(record.nome, link),
    }),
  });
  return new Response(await r.text(), { status: r.ok ? 200 : 502 });
});
