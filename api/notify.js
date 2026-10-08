// Rotina diária (Vercel Cron, ver vercel.json): manda os avisos do dia para cada aparelho cadastrado.
// O Vercel chama com "Authorization: Bearer <CRON_SECRET>".
import { firebase, sendPush } from './_firebase.js';
import { buildMessages, forDevice, todayBR } from './_messages.js';

export default async function handler(req, res) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.authorization !== `Bearer ${secret}`) {
    return res.status(401).json({ error: 'Não autorizado' });
  }

  try {
    const { db, messaging } = firebase();
    const today = todayBR();
    const stats = { today, users: 0, devices: 0, sent: 0, removed: 0, errors: 0 };

    for (const userRef of await db.collection('users').listDocuments()) {
      const devices = await userRef.collection('devices').get();
      if (devices.empty) continue;
      stats.users++;

      const [recordsSnap, configSnap] = await Promise.all([
        userRef.collection('records').get(),
        userRef.collection('settings').doc('config').get(),
      ]);
      const messages = buildMessages(recordsSnap.docs.map((d) => d.data()), configSnap.data() || {}, today);
      if (!messages.length) continue;

      for (const device of devices.docs) {
        const { token, prefs } = device.data();
        if (!token) continue;
        stats.devices++;
        for (const msg of forDevice(messages, prefs)) {
          const result = await sendPush(messaging, token, msg);
          if (result === 'sent') stats.sent++;
          else if (result === 'error') stats.errors++;
          else {
            await device.ref.delete();
            stats.removed++;
            break;
          }
        }
      }
    }

    console.log('Notificações do dia:', JSON.stringify(stats));
    return res.status(200).json(stats);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: err.message });
  }
}
