import AppLayout from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useLanguage } from "@/contexts/LanguageContext";
import { Users, Building2, FileText, TrendingUp } from "lucide-react";

export default function Dashboard() {
  const { t } = useLanguage();

  const stats = [
    { title: t("dashboard.totalLeads"), value: "0", icon: Users, change: "+0%" },
    { title: t("dashboard.activeDeals"), value: "0", icon: TrendingUp, change: "+0%" },
    { title: t("nav.properties"), value: "0", icon: Building2, change: "+0%" },
    { title: t("nav.contracts"), value: "0", icon: FileText, change: "+0%" },
  ];

  return (
    <AppLayout>
      <div className="p-6 space-y-6">
        <h1 className="text-3xl font-bold">{t("dashboard.title")}</h1>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {stats.map((stat) => (
            <Card key={stat.title}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">{stat.title}</CardTitle>
                <stat.icon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stat.value}</div>
                <p className="text-xs text-muted-foreground">{stat.change} desde o mês passado</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </AppLayout>
  );
}
