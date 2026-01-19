import { useAuth } from "@/contexts/AuthContext";

export function useCanEditCadences() {
  const { user } = useAuth();
  
  // Check if user has permission to edit cadences
  // For now, allow admin and manager roles
  const role = (user as any)?.role || "user";
  
  return role === "admin" || role === "manager" || role === "owner";
}
