
import { supabase } from "@/integrations/supabase/client";

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY;

export const isPushSupported = () => {
  return (
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window
  );
};

export const isIOS = () => {
  return (
    /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream
  );
};

export const isStandalone = () => {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as any).standalone ||
    document.referrer.includes("android-app://")
  );
};

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

export const subscribeToPush = async (userId: string) => {
  if (!isPushSupported()) {
    throw new Error("Push notifications are not supported in this browser.");
  }

  try {
    const registration = await navigator.serviceWorker.register("/sw.js");
    const permission = await Notification.requestPermission();

    if (permission !== "granted") {
      throw new Error("Permission not granted for notifications.");
    }

    if (!VAPID_PUBLIC_KEY) {
      throw new Error("VAPID_PUBLIC_KEY is not defined in environment variables.");
    }

    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
    });

    const subscriptionJson = subscription.toJSON();
    
    if (!subscriptionJson.endpoint || !subscriptionJson.keys?.p256dh || !subscriptionJson.keys?.auth) {
      throw new Error("Invalid subscription object received from browser.");
    }

    const { error } = await supabase.from("push_subscriptions").upsert({
      user_id: userId,
      endpoint: subscriptionJson.endpoint,
      p256dh: subscriptionJson.keys.p256dh,
      auth: subscriptionJson.keys.auth,
      user_agent: navigator.userAgent,
    }, {
      onConflict: 'endpoint'
    });

    if (error) throw error;

    return subscription;
  } catch (error) {
    console.error("Error subscribing to push notifications:", error);
    throw error;
  }
};

export const unsubscribeFromPush = async (userId: string) => {
  try {
    const registration = await navigator.serviceWorker.getRegistration();
    if (registration) {
      const subscription = await registration.pushManager.getSubscription();
      if (subscription) {
        await subscription.unsubscribe();
        
        const { error } = await supabase
          .from("push_subscriptions")
          .delete()
          .eq("endpoint", subscription.endpoint);
          
        if (error) throw error;
      }
    }
  } catch (error) {
    console.error("Error unsubscribing from push notifications:", error);
    throw error;
  }
};

export const checkSubscriptionStatus = async (): Promise<NotificationPermission> => {
  if (!isPushSupported()) return "denied";
  return Notification.permission;
};
