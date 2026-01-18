import AppLayout from "@/components/layout/AppLayout";
import { useLanguage } from "@/contexts/LanguageContext";

export default function Agenda() {
  const { t } = useLanguage();
  return <AppLayout><div className="p-6"><h1 className="text-3xl font-bold">{t("nav.agenda")}</h1><p className="text-muted-foreground mt-2">Calendário de compromissos</p></div></AppLayout>;
}
