/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Central de ações: abre formulários/diálogos e grava no banco com feedback.
 */

import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { AppRecord, Client, Expense, Invoice, Note, Quote, Recurring, Service } from './types';
import type { DataApi } from './useData';
import { useFeedback } from './lib/feedback';
import {
  buildPricingFields, displayNumber, getItems, nextRecurringDate, recurringInvoiceId,
} from './lib/billing';
import { downloadDocumentPdf } from './lib/documents';
import { addDays, dateKey, formatCurrency, formatDate, generateId, todayISO } from './lib/utils';
import { navigate } from './lib/router';
import { Modal } from './components/Modal';
import { DocumentForm, RecordPrefill } from './components/forms/DocumentForm';
import { ClientForm } from './components/forms/ClientForm';
import { ExpenseForm, ExpensePrefill } from './components/forms/ExpenseForm';
import { RecurringForm } from './components/forms/RecurringForm';
import { DocumentDetail } from './components/DocumentDetail';
import { SendDialog } from './components/ChargeDialog';
import { ProposalImport } from './components/ai/ProposalImport';
import { ReceiptImport } from './components/ai/ReceiptImport';
import { ServiceForm } from './components/forms/ServiceForm';
import { activeServices, linkItemsToServices, ServicesContext } from './lib/services';

type CreateType = 'invoice' | 'quote' | 'client' | 'expense' | 'recurring' | 'service';

export interface DocActions {
  create: (type: CreateType, opts?: { clientId?: string; prefill?: RecordPrefill; expensePrefill?: ExpensePrefill }) => void;
  edit: (rec: AppRecord) => void;
  view: (rec: Invoice | Quote) => void;
  duplicate: (rec: Invoice | Quote) => void;
  remove: (rec: AppRecord) => Promise<void>;
  markPaid: (inv: Invoice) => Promise<void>;
  markPending: (inv: Invoice) => Promise<void>;
  setQuoteStatus: (q: Quote, status: Quote['status']) => Promise<void>;
  convertToInvoice: (q: Quote) => Promise<void>;
  downloadPdf: (rec: Invoice | Quote) => Promise<void>;
  send: (rec: Invoice | Quote) => void;
  charge: (inv: Invoice) => void;
  importProposal: () => void;
  scanReceipt: () => void;
  generateRecurringNow: (rec: Recurring) => Promise<void>;
  toggleRecurring: (rec: Recurring) => Promise<void>;
  toggleService: (s: Service) => Promise<void>;
  saveNote: (note: Note) => Promise<boolean>;
}

type ModalState =
  | { kind: 'doc-form'; type: 'invoice' | 'quote'; initial?: Invoice | Quote; prefill?: RecordPrefill }
  | { kind: 'client-form'; initial?: Client }
  | { kind: 'expense-form'; initial?: Expense; prefill?: ExpensePrefill }
  | { kind: 'recurring-form'; initial?: Recurring; clientId?: string }
  | { kind: 'service-form'; initial?: Service }
  | { kind: 'detail'; id: string }
  | { kind: 'send'; id: string; mode: 'send' | 'charge' }
  | { kind: 'import' }
  | { kind: 'receipt' };

const ActionsContext = createContext<DocActions | null>(null);

export function useActions(): DocActions {
  const ctx = useContext(ActionsContext);
  if (!ctx) throw new Error('useActions precisa estar dentro de <ActionsProvider>');
  return ctx;
}

const TYPE_LABEL: Record<AppRecord['type'], string> = {
  invoice: 'Fatura', quote: 'Orçamento', client: 'Cliente', expense: 'Despesa', note: 'Nota', recurring: 'Cobrança recorrente', service: 'Serviço',
};

export function ActionsProvider({ data, children }: { data: DataApi; children: React.ReactNode }) {
  const feedback = useFeedback();
  const [modal, setModal] = useState<ModalState | null>(null);
  const close = useCallback(() => setModal(null), []);
  const { records, config, addRecord, updateRecord, deleteRecord } = data;

  const clients = useMemo(() => records.filter((r): r is Client => r.type === 'client'), [records]);
  const clientById = useMemo(() => new Map(clients.map(c => [c.id, c])), [clients]);
  const services = useMemo(() => activeServices(records), [records]);
  const findRecord = (id: string) => records.find(r => r.id === id);

  /** Salva (cria ou atualiza) e devolve o registro salvo. */
  const persist = async <T extends AppRecord>(rec: T, isNew: boolean): Promise<T | null> => {
    if (isNew) return (await addRecord(rec)) as T | null;
    return (await updateRecord(rec.id, rec)) ? rec : null;
  };

  const actions: DocActions = {
    create: (type, opts = {}) => {
      if (type === 'invoice' || type === 'quote') {
        setModal({ kind: 'doc-form', type, prefill: opts.prefill ?? (opts.clientId ? { clientId: opts.clientId } : undefined) });
      } else if (type === 'client') setModal({ kind: 'client-form' });
      else if (type === 'expense') setModal({ kind: 'expense-form', prefill: opts.expensePrefill });
      else if (type === 'service') setModal({ kind: 'service-form' });
      else setModal({ kind: 'recurring-form', clientId: opts.clientId });
    },

    edit: rec => {
      switch (rec.type) {
        case 'invoice':
        case 'quote': setModal({ kind: 'doc-form', type: rec.type, initial: rec }); break;
        case 'client': setModal({ kind: 'client-form', initial: rec }); break;
        case 'expense': setModal({ kind: 'expense-form', initial: rec }); break;
        case 'recurring': setModal({ kind: 'recurring-form', initial: rec }); break;
        case 'service': setModal({ kind: 'service-form', initial: rec }); break;
        default: break;
      }
    },

    view: rec => setModal({ kind: 'detail', id: rec.id }),

    duplicate: rec => setModal({
      kind: 'doc-form',
      type: rec.type,
      prefill: {
        clientId: rec.clientId,
        items: getItems(rec).map(i => ({ ...i })),
        taxPercent: rec.taxPercent,
        discount: rec.discount,
        notes: rec.notes,
      },
    }),

    remove: async rec => {
      let description = 'Esta ação não pode ser desfeita.';
      if (rec.type === 'client') {
        const linked = records.filter(r => (r.type === 'invoice' || r.type === 'quote' || r.type === 'recurring') && r.clientId === rec.id).length;
        if (linked) description = `Este cliente tem ${linked} documento(s) vinculado(s), que continuarão existindo. ${description}`;
      }
      const label = rec.type === 'invoice' || rec.type === 'quote' ? `${TYPE_LABEL[rec.type].toLowerCase()} ${displayNumber(rec)}` : TYPE_LABEL[rec.type].toLowerCase();
      const ok = await feedback.confirm({ title: `Excluir ${label}?`, description, confirmLabel: 'Excluir', danger: true });
      if (!ok) return;
      if (await deleteRecord(rec.id)) {
        feedback.success(`${TYPE_LABEL[rec.type]} excluído${rec.type === 'invoice' || rec.type === 'expense' || rec.type === 'note' || rec.type === 'recurring' ? 'a' : ''}`);
        if (rec.type === 'client') navigate('clients');
      }
    },

    markPaid: async inv => {
      if (await updateRecord(inv.id, { status: 'paid', paidAt: todayISO() } as Partial<Invoice>)) {
        feedback.toast({
          kind: 'success',
          title: 'Pagamento registrado',
          description: `${displayNumber(inv)} · ${formatCurrency(inv.total)}`,
          action: { label: 'Desfazer', onClick: () => actions.markPending(inv) },
        });
      }
    },

    markPending: async inv => {
      if (await updateRecord(inv.id, { status: 'pending', paidAt: null } as unknown as Partial<Invoice>)) {
        feedback.info('Fatura voltou para pendente');
      }
    },

    setQuoteStatus: async (q, status) => {
      const labels = { pending: 'Orçamento marcado como aguardando', approved: 'Orçamento aprovado', rejected: 'Orçamento marcado como recusado' };
      if (await updateRecord(q.id, { status } as Partial<Quote>)) {
        if (status === 'approved') {
          feedback.toast({ kind: 'success', title: labels.approved, action: { label: 'Gerar fatura', onClick: () => actions.convertToInvoice({ ...q, status }) } });
        } else feedback.info(labels[status]);
      }
    },

    convertToInvoice: async q => {
      const issue = todayISO();
      const inv: Invoice = {
        id: generateId(),
        type: 'invoice',
        ownerId: '',
        dateCreated: issue,
        dueDate: addDays(issue, config.defaultDueDays || 15),
        status: 'pending',
        clientId: q.clientId,
        clientName: q.clientName,
        notes: q.notes || '',
        ...buildPricingFields(getItems(q), q.taxPercent || 0, q.discount || 0),
      };
      const saved = await addRecord(inv);
      if (!saved) return;
      if (q.status !== 'approved') await updateRecord(q.id, { status: 'approved' } as Partial<Quote>);
      feedback.toast({
        kind: 'success',
        title: `Fatura ${(saved as Invoice).number} criada`,
        description: `A partir do orçamento ${displayNumber(q)}`,
        action: { label: 'Abrir fatura', onClick: () => setModal({ kind: 'detail', id: saved.id }) },
      });
    },

    downloadPdf: async rec => {
      try {
        await downloadDocumentPdf(rec, config, clientById.get(rec.clientId));
      } catch (err) {
        feedback.error('Não foi possível gerar o PDF', (err as Error).message);
      }
    },

    send: rec => setModal({ kind: 'send', id: rec.id, mode: 'send' }),
    charge: inv => setModal({ kind: 'send', id: inv.id, mode: 'charge' }),
    importProposal: () => setModal({ kind: 'import' }),
    scanReceipt: () => setModal({ kind: 'receipt' }),

    generateRecurringNow: async rec => {
      const cycle = dateKey(rec.nextDate) || todayISO();
      const id = recurringInvoiceId(rec.id, cycle);
      if (records.some(r => r.id === id)) {
        feedback.info('A fatura deste ciclo já foi gerada');
        return;
      }
      const issue = todayISO();
      const inv: Invoice = {
        id,
        type: 'invoice',
        ownerId: '',
        dateCreated: issue,
        dueDate: addDays(issue, rec.dueDays ?? (config.defaultDueDays || 15)),
        status: 'pending',
        clientId: rec.clientId,
        clientName: rec.clientName,
        notes: rec.notes || '',
        recurringId: rec.id,
        ...buildPricingFields(rec.items, rec.taxPercent, rec.discount),
      };
      const saved = await addRecord(inv);
      if (!saved) return;
      await updateRecord(rec.id, { nextDate: nextRecurringDate(cycle, rec.dayOfMonth), lastGenerated: issue } as Partial<Recurring>);
      feedback.toast({
        kind: 'success',
        title: `Fatura ${(saved as Invoice).number} gerada`,
        action: { label: 'Cobrar agora', onClick: () => setModal({ kind: 'send', id: saved.id, mode: 'charge' }) },
      });
    },

    toggleRecurring: async rec => {
      if (await updateRecord(rec.id, { active: !rec.active } as Partial<Recurring>)) {
        feedback.info(rec.active ? 'Cobrança pausada' : 'Cobrança reativada');
      }
    },

    toggleService: async s => {
      const active = s.active === false;
      if (await updateRecord(s.id, { active } as Partial<Service>)) {
        feedback.info(active ? 'Serviço reativado' : 'Serviço desativado', active ? undefined : 'Ele some do catálogo, mas o histórico continua.');
      }
    },

    saveNote: async note => {
      const exists = records.some(r => r.id === note.id);
      const ok = exists ? await updateRecord(note.id, note) : !!(await addRecord(note));
      return ok;
    },
  };

  // --- Handlers dos formulários --------------------------------------------------

  const submitDocument = async (rec: Invoice | Quote, newClient?: Client, initial?: Invoice | Quote) => {
    if (newClient) {
      const c = await addRecord(newClient);
      if (!c) return;
    }
    const saved = await persist(rec, !initial);
    if (!saved) return;
    close();
    const label = rec.type === 'invoice' ? 'Fatura' : 'Orçamento';
    if (initial) {
      feedback.success(`${label} atualizad${rec.type === 'invoice' ? 'a' : 'o'}`);
    } else {
      feedback.toast({
        kind: 'success',
        title: `${label} ${saved.number || ''} criad${rec.type === 'invoice' ? 'a' : 'o'}`.replace('  ', ' '),
        description: `${saved.clientName} · ${formatCurrency(saved.total)}`,
        action: { label: 'Enviar ao cliente', onClick: () => setModal({ kind: 'send', id: saved.id, mode: 'send' }) },
      });
    }
  };

  const submitClient = async (c: Client, initial?: Client) => {
    const saved = await persist(c, !initial);
    if (!saved) return;
    close();
    // Atualiza o nome nos documentos se mudou.
    if (initial && initial.name !== c.name) {
      const linked = records.filter(r => (r.type === 'invoice' || r.type === 'quote' || r.type === 'recurring') && r.clientId === c.id);
      await Promise.all(linked.map(r => updateRecord(r.id, { clientName: c.name } as Partial<Invoice>)));
    }
    feedback.toast({
      kind: 'success',
      title: initial ? 'Cliente atualizado' : 'Cliente cadastrado',
      action: initial ? undefined : { label: 'Ver ficha', onClick: () => navigate('client', saved.id) },
    });
  };

  const submitExpense = async (e: Expense, initial?: Expense) => {
    if (!(await persist(e, !initial))) return;
    close();
    feedback.success(initial ? 'Despesa atualizada' : 'Despesa lançada', `${e.description} · ${formatCurrency(e.total)}`);
  };

  const submitRecurring = async (r: Recurring, newClient?: Client, initial?: Recurring) => {
    if (newClient && !(await addRecord(newClient))) return;
    if (!(await persist(r, !initial))) return;
    close();
    feedback.success(initial ? 'Contrato atualizado' : 'Cobrança recorrente criada', `${r.clientName} · ${formatCurrency(r.total)}/mês`);
  };

  const submitService = async (s: Service, initial?: Service) => {
    if (!(await persist(s, !initial))) return;
    close();
    feedback.success(initial ? 'Serviço atualizado' : 'Serviço cadastrado', `${s.name} · ${formatCurrency(s.price)}`);
  };

  // --- Renderização do modal atual ----------------------------------------------------

  let content: React.ReactNode = null;
  let title: React.ReactNode = '';
  let description: React.ReactNode;
  let size: 'sm' | 'md' | 'lg' | 'xl' = 'md';

  if (modal) {
    switch (modal.kind) {
      case 'doc-form': {
        const isInv = modal.type === 'invoice';
        title = modal.initial ? `Editar ${isInv ? 'fatura' : 'orçamento'}` : isInv ? 'Nova fatura' : 'Novo orçamento';
        description = modal.initial ? displayNumber(modal.initial) : undefined;
        size = 'lg';
        content = (
          <DocumentForm
            key={modal.initial?.id || 'new'}
            type={modal.type}
            initial={modal.initial}
            prefill={modal.prefill}
            clients={clients}
            records={records}
            config={config}
            onCancel={close}
            onSubmit={(rec, nc) => submitDocument(rec, nc, modal.initial)}
          />
        );
        break;
      }
      case 'client-form':
        title = modal.initial ? 'Editar cliente' : 'Novo cliente';
        size = 'lg';
        content = <ClientForm initial={modal.initial} onCancel={close} onSubmit={c => submitClient(c, modal.initial)} />;
        break;
      case 'expense-form':
        title = modal.initial ? 'Editar despesa' : 'Nova despesa';
        content = <ExpenseForm initial={modal.initial} prefill={modal.prefill} onCancel={close} onSubmit={e => submitExpense(e, modal.initial)} />;
        break;
      case 'recurring-form':
        title = modal.initial ? 'Editar cobrança recorrente' : 'Nova cobrança recorrente';
        description = 'Gera uma fatura automaticamente todo mês.';
        size = 'lg';
        content = (
          <RecurringForm initial={modal.initial} clients={clients} config={config} presetClientId={modal.clientId}
            onCancel={close} onSubmit={(r, nc) => submitRecurring(r, nc, modal.initial)} />
        );
        break;
      case 'service-form':
        title = modal.initial ? 'Editar serviço' : 'Novo serviço';
        description = modal.initial ? undefined : 'Fica no catálogo para usar em faturas e orçamentos.';
        content = (
          <ServiceForm initial={modal.initial} onCancel={close} onSubmit={sv => submitService(sv, modal.initial)}
            categories={[...new Set(services.map(x => x.category?.trim()).filter((c): c is string => !!c))]} />
        );
        break;
      case 'detail': {
        const rec = findRecord(modal.id) as Invoice | Quote | undefined;
        if (rec) {
          title = `${rec.type === 'invoice' ? 'Fatura' : 'Orçamento'} ${displayNumber(rec)}`;
          description = `${rec.clientName} · emitido em ${formatDate(rec.dateCreated)}`;
          content = <DocumentDetail record={rec} config={config} client={clientById.get(rec.clientId)} actions={actions} onClose={close} />;
        }
        break;
      }
      case 'send': {
        const rec = findRecord(modal.id) as Invoice | Quote | undefined;
        if (rec) {
          title = modal.mode === 'charge' ? 'Cobrar cliente' : `Enviar ${rec.type === 'invoice' ? 'fatura' : 'orçamento'}`;
          content = <SendDialog record={rec} mode={modal.mode} config={config} client={clientById.get(rec.clientId)} onDone={close} />;
        }
        break;
      }
      case 'import':
        title = 'Importar proposta com IA';
        content = (
          <ProposalImport
            onCancel={close}
            onConfirm={(type, prefill) => {
              if (prefill.items?.length && services.length) {
                const { items, linked } = linkItemsToServices(prefill.items, services);
                prefill = { ...prefill, items };
                if (linked) feedback.info(`${linked} ${linked === 1 ? 'item ligado' : 'itens ligados'} ao seu catálogo de serviços`);
              }
              setModal({ kind: 'doc-form', type, prefill });
            }}
          />
        );
        break;
      case 'receipt':
        title = 'Ler comprovante com IA';
        content = <ReceiptImport onCancel={close} onResult={prefill => setModal({ kind: 'expense-form', prefill })} />;
        break;
    }
  }

  return (
    <ActionsContext.Provider value={actions}>
      <ServicesContext.Provider value={services}>
        {children}
        <Modal isOpen={!!modal && !!content} onClose={close} title={title} description={description} size={size}>
          {content}
        </Modal>
      </ServicesContext.Provider>
    </ActionsContext.Provider>
  );
}
