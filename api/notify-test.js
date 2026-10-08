// Envia uma notificação de teste para o aparelho de quem está logado.
import { firebase, sendPush } from './_firebase.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Use POST' });

  try {
    const { db, messaging, auth } = firebase();
    const idToken = (req.headers.authorization || '').replace(/^Bearer\s+/i, '');
    if (!idToken) return res.status(401).json({ error: 'Faça login de novo.' });
    const user = await auth.verifyIdToken(idToken).catch(() => null);
    if (!user) return res.status(401).json({ error: 'Sessão expirada. Faça login de novo.' });

    const { ownerId, deviceId } = req.body || {};
    if (typeof ownerId !== 'string' || !/^[\w-]{1,128}$/.test(ownerId) || typeof deviceId !== 'string' || !/^[\w-]{1,128}$/.test(deviceId)) {
      return res.status(400).json({ error: 'Pedido inválido.' });
    }

    const ref = db.doc(`users/${ownerId}/devices/${deviceId}`);
    const snap = await ref.get();
    if (!snap.exists || snap.data().uid !== user.uid) {
      return res.status(404).json({ error: 'Este aparelho não está ativado. Ative as notificações de novo.' });
    }

    const result = await sendPush(messaging, snap.data().token, {
      title: 'Notificações ativadas',
      body: 'Tudo certo! Você vai receber os avisos do LoriFat neste aparelho.',
      url: '/#/configuracoes',
      tag: 'test',
    });
    if (result === 'dead') {
      await ref.delete();
      return res.status(410).json({ error: 'O registro deste aparelho expirou. Ative as notificações de novo.' });
    }
    if (result !== 'sent') return res.status(502).json({ error: 'O Firebase não aceitou o envio. Tente de novo em instantes.' });
    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: err.message });
  }
}
