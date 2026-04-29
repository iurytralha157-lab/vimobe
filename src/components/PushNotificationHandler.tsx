
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
        // Small delay to ensure everything is loaded
        await new Promise(resolve => setTimeout(resolve, 2000));
        await autoRegisterPush(user.id);
      };

      handleAutoPush();
    }
  }, [user]);

  return null; // This component doesn't render anything
};
