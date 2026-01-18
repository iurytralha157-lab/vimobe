import { useLanguage } from "@/contexts/LanguageContext";

export default function AdminDashboard() {
  const { t } = useLanguage();
  return <div className="p-6"><h1 className="text-3xl font-bold">{t("admin.title")}</h1><p className="text-muted-foreground mt-2">Dashboard administrativo</p></div>;
}
