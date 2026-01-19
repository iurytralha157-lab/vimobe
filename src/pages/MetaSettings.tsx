import { AppLayout } from "@/components/layout/AppLayout";
import { MetaIntegrationSettings } from "@/components/integrations/MetaIntegrationSettings";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";
import { useLanguage } from "@/contexts/LanguageContext";

export default function MetaSettings() {
  const { t } = useLanguage();
  const meta = t.settings.integrations.meta;

  return (
    <AppLayout>
      <div className="container py-6 space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link to="/settings">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold">{meta.title}</h1>
            <p className="text-muted-foreground">
              {meta.description}
            </p>
          </div>
        </div>

        <MetaIntegrationSettings />
      </div>
    </AppLayout>
  );
}
