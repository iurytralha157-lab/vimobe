import AppLayout from "@/components/layout/AppLayout";
import { useLanguage } from "@/contexts/LanguageContext";

export default function FinancialEntries() {
  const { t } = useLanguage();
  return <AppLayout><div className="p-6"><h1 className="text-3xl font-bold">{t("financial.entries")}</h1><p className="text-muted-foreground mt-2">Lançamentos financeiros</p></div></AppLayout>;
}
