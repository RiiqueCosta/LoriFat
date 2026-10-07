<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Lori Faturamento

Sistema de faturamento da Lori-TI: faturas, orçamentos, clientes, despesas, cobranças recorrentes e relatórios,
com IA (Gemini via Firebase AI Logic) e PIX.

## Rodar localmente

1. `npm install`
2. `npm run dev` → http://localhost:3000

Publicado automaticamente na Vercel a cada push no `main`.

## Funcionalidades

- **Faturas e orçamentos** com vários itens, desconto, impostos, numeração sequencial (FAT-2026-0001 / ORC-2026-0001),
  edição, duplicação, conversão de orçamento em fatura e PDF com logo.
- **Cobrança** pelo WhatsApp com mensagem pronta, **PIX copia e cola + QR Code** com o valor da fatura (gerado no próprio app),
  faturas vencidas destacadas automaticamente.
- **Cobranças recorrentes**: contratos mensais que geram a fatura sozinhos na data configurada.
- **Clientes** com ficha completa: histórico, total faturado, em aberto, prazo médio de pagamento e "cobrar tudo".
- **Despesas** por mês e categoria, com **leitura de cupom/nota por IA** (foto).
- **Importar proposta com IA** (PDF, foto, texto ou áudio) → orçamento ou fatura preenchidos.
- **Assistente IA**: perguntas sobre faturamento, clientes, despesas e cobranças.
- **Relatórios** e **exportação para o contador** (CSV de receitas recebidas e despesas) + backup em JSON.
- **App instalável (PWA)**, modo escuro completo, layout para celular com barra inferior.
- Funciona offline (cache do Firestore) e sincroniza quando a conexão volta.

## Importar proposta com IA

Em **Orçamentos** ou **Faturas**, clique em **Importar proposta com IA** para enviar uma proposta pronta
(PDF, foto, texto colado ou áudio). A IA (Gemini) transcreve a proposta, identifica cliente, itens, valores,
desconto, imposto e condições, e abre o formulário já preenchido para você revisar e salvar como
orçamento ou fatura. Se o cliente ainda não existir, ele pode ser cadastrado no mesmo passo.

### Configuração (uma vez)

1. No [console do Firebase](https://console.firebase.google.com/project/lori-faturamento/ailogic), abra **AI Logic**
   e clique em **Get started** → escolha **Gemini Developer API** (tem nível gratuito, não exige plano Blaze).
2. Publique as regras atualizadas de `firestore.rules` (Firestore → Regras).
3. (Opcional) Para trocar o modelo, defina `VITE_GEMINI_MODEL` no `.env`.

A chamada passa pelo Firebase AI Logic, então nenhuma chave da API do Gemini fica exposta no navegador.
Recomenda-se ativar o **Firebase App Check** para evitar uso indevido da cota.

### Vários itens por orçamento/fatura

Orçamentos e faturas agora aceitam várias linhas de itens, desconto em R$ e observações (que aparecem no PDF).
Registros antigos, com um único item, continuam funcionando normalmente.
