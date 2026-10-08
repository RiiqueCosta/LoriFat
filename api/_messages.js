// Monta os avisos do dia a partir dos registros de um usuário (sem dependências).

const TZ = 'America/Sao_Paulo';

export function todayBR(now = new Date()) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
}

export function addDays(iso, days) {
  const [y, m, d] = iso.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + days));
  return dt.toISOString().slice(0, 10);
}

const day = (v) => (typeof v === 'string' ? v.slice(0, 10) : '');
const money = (v) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(v) || 0);
const sum = (xs) => xs.reduce((s, x) => s + (Number(x.total) || 0), 0);
const plural = (n, one, many) => (n === 1 ? one : many);

/**
 * @returns {{ kind: 'daily'|'overdue'|'recurring'|'quotes', title: string, body: string, url: string, tag: string }[]}
 */
export function buildMessages(records, config = {}, today = todayBR()) {
  const out = [];
  const yesterday = addDays(today, -1);

  const open = records.filter((r) => r.type === 'invoice' && r.status !== 'paid');
  const dueToday = open.filter((i) => day(i.dueDate) === today);
  const overdue = open.filter((i) => day(i.dueDate) && day(i.dueDate) < today);

  // Resumo da manhã
  if (dueToday.length || overdue.length) {
    const parts = [];
    if (dueToday.length) parts.push(`${dueToday.length} ${plural(dueToday.length, 'fatura vence', 'faturas vencem')} hoje (${money(sum(dueToday))})`);
    if (overdue.length) parts.push(`${overdue.length} ${plural(overdue.length, 'vencida', 'vencidas')} (${money(sum(overdue))})`);
    out.push({
      kind: 'daily',
      title: `Bom dia! ${money(sum(dueToday) + sum(overdue))} para cobrar`,
      body: parts.join(' · '),
      url: overdue.length ? '/#/faturas/vencidas' : '/#/faturas/abertas',
      tag: 'daily',
    });
  }

  // Faturas que venceram ontem
  open
    .filter((i) => day(i.dueDate) === yesterday)
    .forEach((i) => out.push({
      kind: 'overdue',
      title: `Fatura ${i.number || ''} venceu ontem`.replace('  ', ' '),
      body: `${i.clientName || 'Cliente'} · ${money(i.total)}. Toque para cobrar.`,
      url: '/#/faturas/vencidas',
      tag: `overdue-${i.id}`,
    }));

  // Cobranças recorrentes para emitir
  records
    .filter((r) => r.type === 'recurring' && r.active !== false && day(r.nextDate) && day(r.nextDate) <= today)
    .forEach((r) => out.push({
      kind: 'recurring',
      title: 'Cobrança mensal para emitir',
      body: `${r.clientName || 'Cliente'} · ${r.title || 'Contrato'} · ${money(r.total)}. Abra o app para gerar a fatura.`,
      url: '/#/recorrentes',
      tag: `recurring-${r.id}`,
    }));

  // Orçamentos perto de vencer
  const validity = Number(config.quoteValidityDays) || 15;
  records
    .filter((r) => r.type === 'quote' && r.status === 'pending')
    .forEach((q) => {
      const until = day(q.validUntil) || (day(q.dateCreated) ? addDays(day(q.dateCreated), validity) : '');
      const when = until === today ? 'hoje' : until === addDays(today, 2) ? 'em 2 dias' : '';
      if (!when) return;
      out.push({
        kind: 'quotes',
        title: `Orçamento ${q.number || ''} vence ${when}`.replace('  ', ' '),
        body: `${q.clientName || 'Cliente'} · ${money(q.total)}. Que tal falar com o cliente?`,
        url: '/#/orcamentos',
        tag: `quote-${q.id}`,
      });
    });

  return out;
}

/** Filtra pelos avisos escolhidos no aparelho e limita a quantidade. */
export function forDevice(messages, prefs = {}, max = 5) {
  return messages.filter((m) => prefs[m.kind] !== false).slice(0, max);
}
