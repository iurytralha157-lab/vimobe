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
  console.log("[Push] Starting subscription process for user:", userId);
  
  if (!isPushSupported()) {
    throw new Error("Push notifications are not supported in this browser.");
  }

  try {
    // Ensure service worker is ready instead of always registering a new one
    let registration: ServiceWorkerRegistration;
    
    console.log("[Push] Checking for existing service worker...");
    const existingReg = await navigator.serviceWorker.getRegistration("/sw.js");
    
    if (existingReg) {
      console.log("[Push] Using existing service worker registration");
      registration = existingReg;
    } else {
      console.log("[Push] Registering new service worker...");
      registration = await navigator.serviceWorker.register("/sw.js", {
        scope: "/",
      });
    }

    // Wait for the service worker to be active
    if (registration.installing) {
      console.log("[Push] Service worker installing...");
      await new Promise<void>((resolve) => {
        registration.installing?.addEventListener("statechange", (e: any) => {
          if (e.target.state === "activated") resolve();
        });
      });
    }

    console.log("[Push] Requesting notification permission...");
    const permission = await Notification.requestPermission();
    console.log("[Push] Permission result:", permission);

    if (permission !== "granted") {
      throw new Error("Permission not granted for notifications.");
    }

    if (!VAPID_PUBLIC_KEY) {
      throw new Error("VAPID_PUBLIC_KEY is not defined in environment variables.");
    }

    console.log("[Push] Subscribing to push manager...");
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
    });

    const subscriptionJson = subscription.toJSON();
    console.log("[Push] Subscription successful:", subscriptionJson.endpoint);

    if (!subscriptionJson.endpoint || !subscriptionJson.keys?.p256dh || !subscriptionJson.keys?.auth) {
      throw new Error("Invalid subscription object received from browser.");
    }

    // Upsert subscription to database
    console.log("[Push] Saving subscription to database...");
    const { error } = await supabase
      .from("push_subscriptions")
      .upsert({
        user_id: userId,
        subscription: subscriptionJson as any,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'user_id'
      });

    if (error) {
      console.error("[Push] Database error:", error);
      throw error;
    }

    console.log("[Push] Subscription process complete");
    return subscription;
  } catch (error: any) {
    console.error("[Push] Detailed subscription error:", error);
    throw error;
  }
};

export const autoRegisterPush = async (userId: string) => {
  if (!isPushSupported()) return;
  
  // If permission is already granted, we should ensure the subscription is up to date in DB
  if (Notification.permission === "granted") {
    console.log("[Push] Permission already granted, ensuring subscription is active...");
    try {
      await subscribeToPush(userId);
    } catch (error) {
      console.error("[Push] Auto-registration failed:", error);
    }
  }
};

export const unsubscribeFromPush = async (userId: string) => {
  const registration = await navigator.serviceWorker.getRegistration();
  if (!registration) return;

  const subscription = await registration.pushManager.getSubscription();
  if (!subscription) return;

  const endpoint = subscription.endpoint;
  await subscription.unsubscribe();

  const { error } = await supabase
    .from("push_subscriptions")
    .delete()
    .eq("user_id", userId)
    .filter("subscription->>endpoint", "eq", endpoint);

  if (error) throw error;
};

export const checkSubscriptionStatus = async (): Promise<NotificationPermission> => {
  if (!isPushSupported()) return "denied";
  return Notification.permission;
};
