import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
  ExternalLink
} from "lucide-react";
import { Link } from "react-router-dom";
import { formatPhoneForDisplay } from "@/lib/phone-utils";
import { cn } from "@/lib/utils";

interface ConversationHeaderProps {
  contactName?: string | null;
  contactPhone?: string | null;
  contactPicture?: string | null;
  contactPresence?: string | null;
  isGroup?: boolean;
  isArchived?: boolean;
  leadId?: string | null;
  onArchive?: () => void;
  onDelete?: () => void;
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
  onArchive,
  onDelete,
  className
}: ConversationHeaderProps) {
  const displayName = contactName && contactName !== contactPhone 
    ? contactName 
    : formatPhoneForDisplay(contactPhone || "");

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
      "h-16 px-4 border-b flex items-center justify-between bg-card shrink-0",
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
        </div>
      </div>

      <div className="flex items-center gap-1 shrink-0">
        {leadId && (
          <Button variant="ghost" size="sm" className="h-8 text-xs" asChild>
            <Link to={`/crm/pipelines?lead=${leadId}`}>
              <User className="w-3.5 h-3.5 mr-1.5" />
              Ver Lead
            </Link>
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
          <DropdownMenuContent align="end" className="w-48">
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
