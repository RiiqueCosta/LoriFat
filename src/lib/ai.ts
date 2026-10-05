/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Leitura de propostas com IA (Gemini via Firebase AI Logic).
 * A chamada passa pelo Firebase, então nenhuma chave de API fica exposta no navegador.
 * Pré-requisito: ativar o "Firebase AI Logic" (Gemini Developer API) no console do Firebase.
 */

import { getAI, getGenerativeModel, GoogleAIBackend, Schema } from 'firebase/ai';
import app from './firebase';
import { LineItem } from '../types';

/** Modelo usado. Pode ser trocado via variável VITE_GEMINI_MODEL no .env. */
const MODEL_NAME: string =
  ((import.meta as any).env?.VITE_GEMINI_MODEL as string | undefined) || 'gemini-3.5-flash';

/** Limite de tamanho por arquivo (o envio inline aceita ~20 MB por requisição). */
export const MAX_FILE_BYTES = 15 * 1024 * 1024;

export const ACCEPTED_FILE_TYPES = [
  'application/pdf',
  'image/png', 'image/jpeg', 'image/webp', 'image/heic', 'image/heif',
  'audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/x-wav', 'audio/ogg', 'audio/webm',
  'audio/aac', 'audio/flac', 'audio/mp4', 'audio/x-m4a', 'audio/m4a', 'audio/aiff',
  'text/plain',
];

export interface ExtractedProposal {
  suggestedType: 'quote' | 'invoice';
  clientName: string;
  clientCompany: string;
  clientEmail: string;
  clientPhone: string;
  items: LineItem[];
  taxPercent: number;
  discount: number;
  dueDate: string;
  notes: string;
  transcription: string;
}

export type ProposalInput =
  | { kind: 'text'; text: string }
  | { kind: 'file'; file: Blob; mimeType: string };

const proposalSchema = Schema.object({
  properties: {
    suggestedType: Schema.enumString({
      enum: ['quote', 'invoice'],
      description: "'invoice' se o documento for uma fatura/cobrança/nota de serviço já prestado; caso contrário 'quote'.",
    }),
    clientName: Schema.string({ description: 'Nome do cliente (pessoa ou contato) a quem a proposta é destinada.' }),
    clientCompany: Schema.string({ description: 'Empresa do cliente, se houver.' }),
    clientEmail: Schema.string({ description: 'E-mail do cliente, se houver.' }),
    clientPhone: Schema.string({ description: 'Telefone do cliente, se houver.' }),
    items: Schema.array({
      description: 'Cada serviço/produto cobrado como uma linha.',
      items: Schema.object({
        properties: {
          description: Schema.string({ description: 'Descrição clara do serviço ou produto.' }),
          quantity: Schema.number({ description: 'Quantidade (horas, unidades, meses...). Use 1 se não informado.' }),
          unitPrice: Schema.number({ description: 'Valor unitário em reais, número puro (ex.: 1500.5).' }),
        },
      }),
    }),
    taxPercent: Schema.number({ description: 'Percentual de imposto somado ao valor, se explícito. Senão 0.' }),
    discount: Schema.number({ description: 'Desconto total em reais, se explícito. Senão 0.' }),
    dueDate: Schema.string({ description: 'Data de vencimento/pagamento no formato AAAA-MM-DD, se houver. Senão vazio.' }),
    notes: Schema.string({ description: 'Condições comerciais: prazos, forma de pagamento, validade, garantia, observações.' }),
    transcription: Schema.string({ description: 'Transcrição fiel do conteúdo da proposta em texto corrido (para áudio, o que foi falado).' }),
  },
  optionalProperties: ['clientCompany', 'clientEmail', 'clientPhone', 'dueDate', 'notes', 'transcription'],
});

const PROMPT = `Você é um assistente de faturamento de uma empresa brasileira de TI.
Leia a proposta comercial fornecida (pode ser PDF, foto, texto ou áudio) e extraia os dados para criar um orçamento ou fatura.

Regras:
- Valores em reais: converta "R$ 1.500,00" para 1500. Nunca invente valores.
- Liste cada serviço/produto cobrado como um item separado.
- Se só houver um valor total para um pacote, crie 1 item com quantidade 1 e o total como valor unitário.
- Se um valor for recorrente (ex.: mensal), deixe isso claro na descrição do item.
- Não inclua o nome da empresa emissora (quem está vendendo) como cliente.
- Só preencha imposto e desconto se estiverem explícitos.
- Campos não encontrados: deixe texto vazio ou 0.
- Escreva tudo em português do Brasil.`;

let cachedModel: ReturnType<typeof getGenerativeModel> | null = null;
function getModel() {
  if (!cachedModel) {
    const ai = getAI(app, { backend: new GoogleAIBackend() });
    cachedModel = getGenerativeModel(ai, {
      model: MODEL_NAME,
      generationConfig: {
        responseMimeType: 'application/json',
        responseSchema: proposalSchema,
        temperature: 0.1,
      },
    });
  }
  return cachedModel;
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(',')[1] || '');
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

const num = (v: unknown) => {
  const n = typeof v === 'number' ? v : parseFloat(String(v ?? '').replace(',', '.'));
  return Number.isFinite(n) && n >= 0 ? Math.round(n * 100) / 100 : 0;
};
const str = (v: unknown) => (typeof v === 'string' ? v.trim() : '');

function normalize(raw: any): ExtractedProposal {
  const items: LineItem[] = Array.isArray(raw?.items)
    ? raw.items
        .map((i: any) => ({
          description: str(i?.description),
          quantity: num(i?.quantity) || 1,
          unitPrice: num(i?.unitPrice),
        }))
        .filter((i: LineItem) => i.description || i.unitPrice)
        .slice(0, 100)
    : [];
  const dueDate = /^\d{4}-\d{2}-\d{2}$/.test(str(raw?.dueDate)) ? str(raw.dueDate) : '';
  return {
    suggestedType: raw?.suggestedType === 'invoice' ? 'invoice' : 'quote',
    clientName: str(raw?.clientName),
    clientCompany: str(raw?.clientCompany),
    clientEmail: str(raw?.clientEmail),
    clientPhone: str(raw?.clientPhone),
    items,
    taxPercent: num(raw?.taxPercent),
    discount: num(raw?.discount),
    dueDate,
    notes: str(raw?.notes).slice(0, 5000),
    transcription: str(raw?.transcription),
  };
}

function friendlyError(err: unknown): Error {
  const e = err as any;
  const code = String(e?.code || '');
  const status: number | undefined = e?.customErrorData?.status;
  const msg = String(e?.message || err);
  // Mensagem do Google sem a URL, para mostrar como detalhe.
  const detail = msg.replace(/^.*?Error fetching from \S+:\s*/, '').slice(0, 300);
  const withDetail = (text: string) => new Error(`${text}\n\nDetalhe técnico: ${detail}`);

  if (code.includes('api-not-enabled') || /SERVICE_DISABLED/i.test(msg)) {
    return withDetail('A IA ainda não está ativada no Firebase. Abra o console do Firebase → AI Logic → "Get started" (Gemini Developer API). Se acabou de ativar, aguarde alguns minutos.');
  }
  if (/API_KEY_SERVICE_BLOCKED|API key not valid|API_KEY_INVALID|referer|blocked/i.test(msg)) {
    return withDetail('A chave de API do Firebase está bloqueando a IA. No Google Cloud Console → APIs e serviços → Credenciais, edite a "Browser key" do projeto e inclua a "Firebase AI Logic API" (e localhost/seu domínio, se houver restrição de sites).');
  }
  if (status === 429 || /quota|RESOURCE_EXHAUSTED/i.test(msg)) {
    return withDetail('Limite de uso da IA atingido. Aguarde alguns minutos e tente novamente.');
  }
  if (status === 404 || (/not found/i.test(msg) && /model/i.test(msg))) {
    return withDetail(`O modelo "${MODEL_NAME}" não está disponível. Defina outro em VITE_GEMINI_MODEL no arquivo .env.`);
  }
  if (/app.?check/i.test(msg) || status === 401) {
    return withDetail('O Firebase recusou a chamada (App Check/autenticação). Verifique se o App Check está exigido para o AI Logic.');
  }
  if (status === 403) {
    return withDetail('O Google recusou o acesso à IA (permissão negada).');
  }
  if (status === 400) {
    return withDetail('A IA recusou o pedido (requisição inválida).');
  }
  if (!status && /Failed to fetch|NetworkError|network/i.test(msg)) {
    return withDetail('Falha de conexão com a IA. Verifique sua internet (ou bloqueadores/antivírus) e tente novamente.');
  }
  return withDetail('Não foi possível ler a proposta.');
}

export async function extractProposal(input: ProposalInput): Promise<ExtractedProposal> {
  const parts: any[] = [PROMPT];

  if (input.kind === 'text') {
    const text = input.text.trim();
    if (!text) throw new Error('Cole o texto da proposta.');
    parts.push('Proposta:\n"""\n' + text.slice(0, 100_000) + '\n"""');
  } else {
    if (input.file.size > MAX_FILE_BYTES) {
      throw new Error('Arquivo muito grande (máx. 15 MB).');
    }
    const mimeType = input.mimeType.split(';')[0];
    if (mimeType === 'text/plain') {
      parts.push('Proposta:\n"""\n' + (await input.file.text()).slice(0, 100_000) + '\n"""');
    } else {
      parts.push({ inlineData: { mimeType, data: await blobToBase64(input.file) } });
    }
  }

  let text: string;
  try {
    const result = await getModel().generateContent(parts);
    text = result.response.text();
  } catch (err) {
    console.error('AI error:', err);
    throw friendlyError(err);
  }

  try {
    const data = normalize(JSON.parse(text));
    if (data.items.length === 0 && !data.clientName && !data.clientCompany) {
      throw new Error('empty');
    }
    return data;
  } catch {
    throw new Error('A IA não encontrou dados de proposta nesse conteúdo. Verifique o arquivo e tente novamente.');
  }
}

/** Escolhe um formato de gravação de áudio suportado pelo navegador. */
export function pickRecordingMimeType(): string {
  const candidates = ['audio/webm;codecs=opus', 'audio/ogg;codecs=opus', 'audio/mp4', 'audio/webm'];
  if (typeof MediaRecorder === 'undefined') return '';
  return candidates.find(t => MediaRecorder.isTypeSupported(t)) || '';
}
