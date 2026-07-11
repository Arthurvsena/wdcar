import api from '../api';

export function pushSupported() {
  return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
}

export function pushPermission() {
  if (!pushSupported()) return 'unsupported';
  return Notification.permission; // 'default' | 'granted' | 'denied'
}

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i += 1) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

// Pede permissão, cria a inscrição de push e registra no backend.
export async function subscribeToPush() {
  if (!pushSupported()) return { ok: false, reason: 'unsupported' };

  const permission = await Notification.requestPermission();
  if (permission !== 'granted') return { ok: false, reason: permission };

  const registration = await navigator.serviceWorker.ready;
  let subscription = await registration.pushManager.getSubscription();
  if (!subscription) {
    const { data } = await api.get('/notifications/vapid-public-key');
    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(data.public_key),
    });
  }
  await api.post('/notifications/subscribe', subscription.toJSON());
  return { ok: true };
}

// Reenvia a inscrição ao backend se a permissão já foi concedida antes
// (garante que o servidor conheça este dispositivo após login/troca de conta).
export async function resubscribeIfGranted() {
  if (!pushSupported() || Notification.permission !== 'granted') return;
  try {
    await subscribeToPush();
  } catch (e) {
    // silencioso: push é um extra, nunca deve quebrar o app
  }
}

export async function unsubscribeFromPush() {
  if (!pushSupported()) return;
  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    if (subscription) {
      await api.post('/notifications/unsubscribe', { endpoint: subscription.endpoint });
      await subscription.unsubscribe();
    }
  } catch (e) {
    // silencioso
  }
}
