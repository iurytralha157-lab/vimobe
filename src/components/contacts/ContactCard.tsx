import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { 
  MoreHorizontal, 
  Phone, 
  Mail, 
  ExternalLink,
  UserCircle,
  Calendar,
  MessageCircle,
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { Contact } from '@/hooks/use-contacts-list';

interface ContactCardProps {
  contact: Contact;
  sourceLabels: Record<string, string>;
  onViewDetails?: () => void;
}

export function ContactCard({ contact, sourceLabels, onViewDetails }: ContactCardProps) {
  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  return (
    <div className="p-4 border-b last:border-b-0 space-y-3">
      {/* Header: Name + Actions */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className="font-medium truncate">{contact.name}</p>
          <div className="flex flex-wrap items-center gap-2 mt-1 text-sm text-muted-foreground">
            {contact.phone && (
              <a 
                href={`tel:${contact.phone}`} 
                className="flex items-center gap-1 hover:text-foreground"
              >
                <Phone className="h-3 w-3" />
                <span className="truncate max-w-[120px]">{contact.phone}</span>
              </a>
            )}
            {contact.email && (
              <a 
                href={`mailto:${contact.email}`} 
                className="flex items-center gap-1 hover:text-foreground"
              >
                <Mail className="h-3 w-3" />
                <span className="truncate max-w-[140px]">{contact.email}</span>
              </a>
            )}
          </div>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={onViewDetails}>
              <ExternalLink className="h-4 w-4 mr-2" />
              Ver detalhes
            </DropdownMenuItem>
            {contact.phone && (
              <DropdownMenuItem asChild>
                <a href={`https://wa.me/${contact.phone.replace(/\D/g, '')}`} target="_blank">
                  <Phone className="h-4 w-4 mr-2" />
                  WhatsApp
                </a>
              </DropdownMenuItem>
            )}
            {contact.email && (
              <DropdownMenuItem asChild>
                <a href={`mailto:${contact.email}`}>
                  <Mail className="h-4 w-4 mr-2" />
                  Enviar email
                </a>
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Stage + Assignee Row */}
      <div className="flex items-center gap-3 flex-wrap">
        {contact.stage_name ? (
          <Badge 
            variant="outline" 
            className="gap-1.5"
            style={{ 
              borderColor: contact.stage_color || undefined,
              color: contact.stage_color || undefined
            }}
          >
            <div 
              className="h-2 w-2 rounded-full" 
              style={{ backgroundColor: contact.stage_color || undefined }} 
            />
            {contact.stage_name}
          </Badge>
        ) : (
          <span className="text-muted-foreground text-sm">Sem estágio</span>
        )}

        <div className="h-4 w-px bg-border" />

        {contact.assignee_name ? (
          <div className="flex items-center gap-1.5">
            <Avatar className="h-5 w-5">
              <AvatarImage src={contact.assignee_avatar || undefined} />
              <AvatarFallback className="text-[8px] bg-primary text-primary-foreground">
                {getInitials(contact.assignee_name)}
              </AvatarFallback>
            </Avatar>
            <span className="text-sm text-muted-foreground">{contact.assignee_name.split(' ')[0]}</span>
          </div>
        ) : (
          <span className="text-muted-foreground text-sm flex items-center gap-1">
            <UserCircle className="h-3.5 w-3.5" />
            Sem responsável
          </span>
        )}
      </div>

      {/* Tags + Source + Date Row */}
      <div className="flex items-center gap-2 flex-wrap">
        {/* Tags */}
        {contact.tags && contact.tags.length > 0 && (
          <div className="flex gap-1">
            {contact.tags.slice(0, 2).map(tag => (
              <Badge 
                key={tag.id} 
                variant="secondary"
                className="text-xs"
                style={{ backgroundColor: `${tag.color}20`, color: tag.color }}
              >
                {tag.name}
              </Badge>
            ))}
            {contact.tags.length > 2 && (
              <Badge variant="secondary" className="text-xs">
                +{contact.tags.length - 2}
              </Badge>
            )}
          </div>
        )}

        {/* Source */}
        <Badge variant="outline" className="text-xs">
          {sourceLabels[contact.source] || contact.source}
        </Badge>

        {/* Date */}
        <div className="flex items-center gap-1 text-xs text-muted-foreground ml-auto">
          <Calendar className="h-3 w-3" />
          {format(new Date(contact.created_at), 'dd/MM/yy', { locale: ptBR })}
        </div>
      </div>

      {/* Last Interaction */}
      {contact.last_interaction_at && (
        <div className="pt-2 border-t">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            {contact.last_interaction_channel === 'whatsapp' && (
              <MessageCircle className="h-3 w-3" />
            )}
            <span className="truncate flex-1">
              {contact.last_interaction_preview || 'Interação registrada'}
            </span>
            <span className="shrink-0">
              {formatDistanceToNow(new Date(contact.last_interaction_at), { 
                addSuffix: true, 
                locale: ptBR 
              })}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
