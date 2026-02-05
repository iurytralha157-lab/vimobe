import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger 
} from "@/components/ui/tooltip";
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { 
  Phone, 
  MoreVertical, 
  Archive, 
  Trash2, 
  User, 
  Users,
  ExternalLink,
  UserPlus,
  ArrowRight
} from "lucide-react";
import { Link } from "react-router-dom";
import { formatPhoneForDisplay } from "@/lib/phone-utils";
import { cn } from "@/lib/utils";

interface LeadTag {
  tag: {
    id: string;
    name: string;
    color: string;
  };
}

interface ConversationHeaderProps {
  contactName?: string | null;
  contactPhone?: string | null;
  contactPicture?: string | null;
  contactPresence?: string | null;
  isGroup?: boolean;
  isArchived?: boolean;
  leadId?: string | null;
  leadTags?: LeadTag[];
  pipelineName?: string | null;
  stageName?: string | null;
  stageColor?: string | null;
  onArchive?: () => void;
  onDelete?: () => void;
  onCreateLead?: () => void;
  className?: string;
}

export function ConversationHeader({
  contactName,
  contactPhone,
  contactPicture,
  contactPresence,
  isGroup,
  isArchived,
  leadId,
  leadTags = [],
  pipelineName,
  stageName,
  stageColor,
  onArchive,
  onDelete,
  onCreateLead,
  className
}: ConversationHeaderProps) {
  const displayName = contactName && contactName !== contactPhone 
    ? contactName 
    : formatPhoneForDisplay(contactPhone || "");

  const visibleTags = leadTags.slice(0, 2);
  const remainingTags = leadTags.slice(2);

  const getPresenceIndicator = () => {
    switch (contactPresence) {
      case "composing":
        return (
          <span className="text-xs text-primary animate-pulse flex items-center gap-1">
            <span className="flex gap-0.5">
              <span className="w-1 h-1 rounded-full bg-primary animate-bounce" style={{ animationDelay: "0ms" }} />
              <span className="w-1 h-1 rounded-full bg-primary animate-bounce" style={{ animationDelay: "150ms" }} />
              <span className="w-1 h-1 rounded-full bg-primary animate-bounce" style={{ animationDelay: "300ms" }} />
            </span>
            digitando...
          </span>
        );
      case "recording":
        return (
          <span className="text-xs text-primary animate-pulse flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            gravando áudio...
          </span>
        );
      default:
        return contactName && contactName !== contactPhone ? (
          <span className="text-xs text-muted-foreground truncate">
            {formatPhoneForDisplay(contactPhone || "")}
          </span>
        ) : null;
    }
  };

  return (
    <header className={cn(
      "min-h-[4rem] px-4 py-2 border-b flex items-center justify-between bg-card shrink-0",
      "transition-all duration-200",
      className
    )}>
      <div className="flex items-center gap-3 min-w-0">
        <div className="relative">
          <Avatar className="h-10 w-10 ring-2 ring-background">
            <AvatarImage src={contactPicture || undefined} />
            <AvatarFallback className="bg-primary/10 text-primary">
              {isGroup ? (
                <Users className="w-5 h-5" />
              ) : (
                displayName?.[0]?.toUpperCase() || "?"
              )}
            </AvatarFallback>
          </Avatar>
          {/* Online indicator */}
          {contactPresence === "available" && (
            <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-background rounded-full" />
          )}
        </div>
        
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h2 className="font-semibold text-sm truncate">{displayName}</h2>
            {isGroup && (
              <Badge variant="secondary" className="text-[10px] h-4 px-1.5 shrink-0">
                Grupo
              </Badge>
            )}
          </div>
          {getPresenceIndicator()}
          
          {/* Tags and Pipeline Info */}
          {(visibleTags.length > 0 || pipelineName) && (
            <div className="flex items-center gap-1.5 mt-1 flex-wrap">
              {/* Lead Tags */}
              <TooltipProvider>
                {visibleTags.map((lt) => (
                  <Badge
                    key={lt.tag.id}
                    variant="secondary"
                    className="text-[9px] px-1.5 py-0 h-4 font-medium"
                    style={{
                      backgroundColor: `${lt.tag.color}20`,
                      color: lt.tag.color,
                      borderColor: lt.tag.color,
                    }}
                  >
                    {lt.tag.name}
                  </Badge>
                ))}
                {remainingTags.length > 0 && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Badge
                        variant="outline"
                        className="text-[9px] px-1 py-0 h-4 cursor-help"
                      >
                        +{remainingTags.length}
                      </Badge>
                    </TooltipTrigger>
                    <TooltipContent side="bottom" className="max-w-[200px]">
                      <div className="flex flex-wrap gap-1">
                        {remainingTags.map((lt) => (
                          <Badge
                            key={lt.tag.id}
                            variant="secondary"
                            className="text-[9px] px-1.5 py-0 h-4"
                            style={{
                              backgroundColor: `${lt.tag.color}20`,
                              color: lt.tag.color,
                            }}
                          >
                            {lt.tag.name}
                          </Badge>
                        ))}
                      </div>
                    </TooltipContent>
                  </Tooltip>
                )}
              </TooltipProvider>
              
              {/* Separator */}
              {visibleTags.length > 0 && pipelineName && (
                <span className="text-muted-foreground text-[10px]">•</span>
              )}
              
              {/* Pipeline → Stage */}
              {pipelineName && (
                <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                  <span className="truncate max-w-[100px]">{pipelineName}</span>
                  {stageName && (
                    <>
                      <ArrowRight className="w-2.5 h-2.5" />
                      <Badge
                        variant="outline"
                        className="text-[9px] px-1 py-0 h-4"
                        style={stageColor ? {
                          borderColor: stageColor,
                          color: stageColor,
                        } : undefined}
                      >
                        {stageName}
                      </Badge>
                    </>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center gap-1 shrink-0">
        {leadId ? (
          <Button variant="ghost" size="sm" className="h-8 text-xs" asChild>
            <Link to={`/crm/pipelines?lead=${leadId}`}>
              <User className="w-3.5 h-3.5 mr-1.5" />
              Ver Lead
            </Link>
          </Button>
        ) : onCreateLead && !isGroup && (
          <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={onCreateLead}>
            <UserPlus className="w-3.5 h-3.5 mr-1.5" />
            Criar Lead
          </Button>
        )}
        
        <Button variant="ghost" size="icon" className="h-8 w-8">
          <Phone className="w-4 h-4" />
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <MoreVertical className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48 bg-popover">
            {leadId && (
              <DropdownMenuItem asChild>
                <Link to={`/crm/pipelines?lead=${leadId}`}>
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Abrir Lead
                </Link>
              </DropdownMenuItem>
            )}
            <DropdownMenuItem onClick={onArchive}>
              <Archive className="w-4 h-4 mr-2" />
              {isArchived ? "Desarquivar" : "Arquivar"}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={onDelete} className="text-destructive">
              <Trash2 className="w-4 h-4 mr-2" />
              Remover
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
