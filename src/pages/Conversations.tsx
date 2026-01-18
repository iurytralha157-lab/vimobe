import AppLayout from "@/components/layout/AppLayout";
import { useLanguage } from "@/contexts/LanguageContext";

export default function Conversations() {
  const { t } = useLanguage();
  return <AppLayout><div className="p-6"><h1 className="text-3xl font-bold">{t("nav.conversations")}</h1><p className="text-muted-foreground mt-2">Inbox de mensagens</p></div></AppLayout>;
}
