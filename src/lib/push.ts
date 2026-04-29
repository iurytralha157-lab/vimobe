import { supabase } from "@/integrations/supabase/client";

const VAPID_PUBLIC_KEY = "BIBDZeT9TF-iZmGwLSvP5DhEDiUxn267umIKFc0aLM2mjN1hXHn6Rmy7xJylT4VWl_8Mdc0U7vXL3UE-GJbcN-M";

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export const isPushSupported = () => {
  return "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
};

export const subscribeToPush = async (userId: string) => {
  try {
    if (!isPushSupported()) {
      throw new Error("Push notifications are not supported in this browser.");
    }

    const permission = await Notification.requestPermission();
    if (permission !== "granted") {
      throw new Error("Permission not granted for notifications.");
    }

    const registration = await navigator.serviceWorker.register("/sw.js");
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
    });

    const { endpoint, keys } = subscription.toJSON();
    if (!endpoint || !keys?.p256dh || !keys?.auth) {
      throw new Error("Invalid subscription object.");
    }

    const { error } = await supabase.from("push_subscriptions").upsert({
      user_id: userId,
      endpoint,
      p256dh: keys.p256dh,
      auth: keys.auth,
      user_agent: navigator.userAgent,
      updated_at: new Date().toISOString(),
    }, { onConflict: "endpoint" });

    if (error) throw error;

    return { ok: true };
  } catch (error: any) {
    console.error("Error subscribing to push:", error);
    return { ok: false, error: error.message };
  }
};

export const unsubscribeFromPush = async (userId: string) => {
  try {
    const registration = await navigator.serviceWorker.getRegistration();
    if (!registration) return { ok: true };

    const subscription = await registration.pushManager.getSubscription();
    if (subscription) {
      const endpoint = subscription.endpoint;
      await subscription.unsubscribe();
      await supabase.from("push_subscriptions").delete().eq("endpoint", endpoint);
    }

    return { ok: true };
  } catch (error: any) {
    console.error("Error unsubscribing from push:", error);
    return { ok: false, error: error.message };
  }
};
