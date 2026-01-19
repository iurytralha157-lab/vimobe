import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  PhoneIncoming,
  PhoneOutgoing,
  PhoneMissed,
  Clock,
  User,
  ChevronDown,
  ChevronUp,
  Phone,
} from "lucide-react";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { useLeadCalls, formatCallDuration, getCallStatusInfo } from "@/hooks/use-telephony";
import { RecordingPlayer } from "./RecordingPlayer";

interface LeadCallsSectionProps {
  leadId: string;
  className?: string;
}

export function LeadCallsSection({ leadId, className }: LeadCallsSectionProps) {
  const { data: calls, isLoading } = useLeadCalls(leadId);
  const [expandedCallId, setExpandedCallId] = useState<string | null>(null);

  const getCallIcon = (direction: string, status: string) => {
    if (status === "missed" || status === "no-answer") {
      return <PhoneMissed className="h-4 w-4 text-red-500" />;
    }
    if (direction === "inbound") {
      return <PhoneIncoming className="h-4 w-4 text-emerald-500" />;
    }
    return <PhoneOutgoing className="h-4 w-4 text-blue-500" />;
  };

  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Phone className="h-4 w-4" />
            Ligações
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  if (!calls?.length) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Phone className="h-4 w-4" />
            Ligações
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-4">
            Nenhuma ligação registrada
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Phone className="h-4 w-4" />
          Ligações
          <Badge variant="secondary" className="ml-auto">
            {calls.length}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {calls.map((call) => {
          const statusInfo = getCallStatusInfo(call.status);
          const isExpanded = expandedCallId === call.id;

          return (
            <Collapsible
              key={call.id}
              open={isExpanded}
              onOpenChange={() => setExpandedCallId(isExpanded ? null : call.id)}
            >
              <div
                className={cn(
                  "rounded-lg border p-3 transition-colors",
                  isExpanded && "bg-muted/50"
                )}
              >
                <CollapsibleTrigger asChild>
                  <Button
                    variant="ghost"
                    className="w-full justify-start p-0 h-auto hover:bg-transparent"
                  >
                    <div className="flex items-center gap-3 w-full">
                      <div className="shrink-0">
                        {getCallIcon(call.direction, call.status)}
                      </div>

                      <div className="flex-1 text-left">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium">
                            {call.direction === "inbound" ? "Recebida" : "Realizada"}
                          </span>
                          <Badge
                            variant="secondary"
                            className={cn("text-xs", statusInfo.bgColor, statusInfo.color)}
                          >
                            {statusInfo.label}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {format(new Date(call.initiated_at), "dd/MM HH:mm", { locale: ptBR })}
                          </span>
                          {call.duration && call.duration > 0 && (
                            <span>{formatCallDuration(call.duration)}</span>
                          )}
                          {call.user && (
                            <span className="flex items-center gap-1">
                              <User className="h-3 w-3" />
                              {call.user.name}
                            </span>
                          )}
                        </div>
                      </div>

                      {call.recording_url && (
                        <div className="shrink-0">
                          {isExpanded ? (
                            <ChevronUp className="h-4 w-4 text-muted-foreground" />
                          ) : (
                            <ChevronDown className="h-4 w-4 text-muted-foreground" />
                          )}
                        </div>
                      )}
                    </div>
                  </Button>
                </CollapsibleTrigger>

                {call.recording_url && (
                  <CollapsibleContent className="mt-3">
                    <RecordingPlayer recordingUrl={call.recording_url} />
                  </CollapsibleContent>
                )}
              </div>
            </Collapsible>
          );
        })}
      </CardContent>
    </Card>
  );
}
