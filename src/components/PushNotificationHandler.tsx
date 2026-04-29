
import { useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { autoRegisterPush, isPushSupported } from "@/lib/push";

export const PushNotificationHandler = () => {
  const { user } = useAuth();

  useEffect(() => {
    if (user && isPushSupported()) {
      // Check for permission and register if already granted or if we want to prompt
      // For now, only auto-register if already granted to avoid annoying prompts
      // but we could also prompt once per session if not denied.
      const handleAutoPush = async () => {
        // Delay to ensure the app is stable
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        const permission = Notification.permission;
        
        if (permission === "granted") {
          await autoRegisterPush(user.id);
        } else if (permission === "default") {
          // If they haven't decided yet, we can try to prompt once
          // Note: Browsers might block this if not from a direct click, 
          // but we try it for a smoother experience if allowed.
          console.log("[Push] Permission is default, attempting auto-subscription...");
          try {
            await autoRegisterPush(user.id);
          } catch (e) {
            console.log("[Push] Auto-prompt blocked or failed:", e);
          }
        }
      };

      handleAutoPush();
    }
  }, [user]);

  return null; // This component doesn't render anything
};
