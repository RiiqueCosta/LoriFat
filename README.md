<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/911413c8-e513-4ea1-bb1f-b3f432793635

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`

## Importar proposta com IA

Em **Orçamentos** ou **Faturas**, clique em **Importar proposta com IA** para enviar uma proposta pronta
(PDF, foto, texto colado ou áudio). A IA (Gemini) transcreve a proposta, identifica cliente, itens, valores,
desconto, imposto e condições, e abre o formulário já preenchido para você revisar e salvar como
orçamento ou fatura. Se o cliente ainda não existir, ele pode ser cadastrado no mesmo passo.

### Configuração (uma vez)

1. No [console do Firebase](https://console.firebase.google.com/project/lori-faturamento/ailogic), abra **AI Logic**
   e clique em **Get started** → escolha **Gemini Developer API** (tem nível gratuito, não exige plano Blaze).
2. Publique as regras atualizadas de `firestore.rules` (Firestore → Regras), que agora aceitam os campos
   `items`, `discount` e `notes`.
3. (Opcional) Para trocar o modelo, defina `VITE_GEMINI_MODEL` no `.env`.

A chamada passa pelo Firebase AI Logic, então nenhuma chave da API do Gemini fica exposta no navegador.
Recomenda-se ativar o **Firebase App Check** para evitar uso indevido da cota.

### Vários itens por orçamento/fatura

Orçamentos e faturas agora aceitam várias linhas de itens, desconto em R$ e observações (que aparecem no PDF).
Registros antigos, com um único item, continuam funcionando normalmente.
