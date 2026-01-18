import AppLayout from "@/components/layout/AppLayout";
import { useLanguage } from "@/contexts/LanguageContext";

export default function Commissions() {
  const { t } = useLanguage();
  return <AppLayout><div className="p-6"><h1 className="text-3xl font-bold">{t("financial.commissions")}</h1><p className="text-muted-foreground mt-2">Comissões de corretores</p></div></AppLayout>;
}
