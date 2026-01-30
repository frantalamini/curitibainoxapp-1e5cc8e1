import { format, formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { UserAvatar } from "@/components/UserAvatar";
import { 
  CheckCircle2, 
  Clock, 
  FileImage, 
  FileText, 
  Mic, 
  Trash2,
  ExternalLink 
} from "lucide-react";
import {
  ServiceCallMessage,
  CATEGORY_LABELS,
  CATEGORY_ICONS,
  PRIORITY_LABELS,
  PRIORITY_COLORS,
} from "@/hooks/useServiceCallMessages";
import { getSLAStatus, getSLAColorClass, getSLALabel } from "@/hooks/usePendingActions";

interface ChatMessageProps {
  message: ServiceCallMessage;
  currentUserId: string;
  isAdmin: boolean;
  isGerencial: boolean;
  onResolve: (messageId: string) => void;
  onDelete: (messageId: string) => void;
}

export const ChatMessage = ({
  message,
  currentUserId,
  isAdmin,
  isGerencial,
  onResolve,
  onDelete,
}: ChatMessageProps) => {
  const isOwn = message.author_id === currentUserId;
  const slaStatus = getSLAStatus(message.due_date);
  
  // Parse mentions from content (format: @[userId:userName])
  const renderContentWithMentions = (content: string) => {
    // Simple regex to find @mentions in format @[id:name]
    const mentionRegex = /@\[([^\]]+)\]/g;
    const parts: React.ReactNode[] = [];
    let lastIndex = 0;
    let match;

    while ((match = mentionRegex.exec(content)) !== null) {
      // Add text before mention
      if (match.index > lastIndex) {
        parts.push(content.slice(lastIndex, match.index));
      }
      
      // Parse mention [id:name]
      const [, mentionData] = match;
      const [, ...nameParts] = mentionData.split(':');
      const name = nameParts.join(':') || mentionData;
      
      parts.push(
        <span key={match.index} className="text-primary font-medium">
          @{name}
        </span>
      );
      
      lastIndex = match.index + match[0].length;
    }
    
    // Add remaining text
    if (lastIndex < content.length) {
      parts.push(content.slice(lastIndex));
    }
    
    return parts.length > 0 ? parts : content;
  };

  const getAttachmentIcon = (type: string) => {
    switch (type) {
      case 'image':
        return <FileImage className="h-4 w-4" />;
      case 'audio':
        return <Mic className="h-4 w-4" />;
      default:
        return <FileText className="h-4 w-4" />;
    }
  };

  return (
    <div className={cn(
      "flex gap-3 p-3 rounded-lg",
      isOwn ? "bg-primary/5" : "bg-muted/50"
    )}>
      {/* Avatar */}
      <UserAvatar
        initial={message.author?.full_name?.charAt(0) || "?"}
        name={message.author?.full_name || "Usuário"}
        size="sm"
        showTooltip={false}
      />

      {/* Content */}
      <div className="flex-1 min-w-0 space-y-2">
        {/* Header */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-medium text-sm">
            {message.author?.full_name || "Usuário"}
          </span>
          <span className="text-xs text-muted-foreground" title={format(new Date(message.created_at), "PPpp", { locale: ptBR })}>
            {formatDistanceToNow(new Date(message.created_at), { 
              addSuffix: true, 
              locale: ptBR 
            })}
          </span>
          
          {/* Resolved badge */}
          {message.resolved_at && (
            <Badge variant="outline" className="text-green-600 bg-green-50 text-xs">
              <CheckCircle2 className="h-3 w-3 mr-1" />
              Resolvido
            </Badge>
          )}
        </div>

        {/* Message content */}
        <p className="text-sm whitespace-pre-wrap break-words">
          {renderContentWithMentions(message.content)}
        </p>

        {/* Attachments */}
        {message.attachments && message.attachments.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-2">
            {message.attachments.map((att) => (
              <a
                key={att.id}
                href={att.file_url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-background border text-sm hover:bg-muted transition-colors"
              >
                {getAttachmentIcon(att.file_type)}
                <span className="truncate max-w-[150px]">{att.file_name}</span>
                <ExternalLink className="h-3 w-3 text-muted-foreground" />
              </a>
            ))}
          </div>
        )}

        {/* Pending action info */}
        {message.requires_action && !message.resolved_at && (
          <div className={cn(
            "flex items-center gap-3 flex-wrap p-2 rounded-md",
            slaStatus === 'overdue' ? "bg-destructive/10" : 
            slaStatus === 'due_today' ? "bg-orange-50" : "bg-muted"
          )}>
            {/* Category badge */}
            {message.category && (
              <Badge variant="secondary" className="text-xs">
                {CATEGORY_ICONS[message.category]} {CATEGORY_LABELS[message.category]}
              </Badge>
            )}
            
            {/* Priority */}
            <span className={cn("text-xs font-medium", PRIORITY_COLORS[message.priority])}>
              {PRIORITY_LABELS[message.priority]}
            </span>

            {/* SLA */}
            {message.due_date && (
              <span className={cn("text-xs flex items-center gap-1", getSLAColorClass(slaStatus))}>
                <Clock className="h-3 w-3" />
                {getSLALabel(slaStatus, message.due_date)}
              </span>
            )}

            {/* Resolve button - only for admin */}
            {isAdmin && (
              <Button
                size="sm"
                variant="outline"
                className="h-7 text-xs ml-auto"
                onClick={() => onResolve(message.id)}
              >
                <CheckCircle2 className="h-3 w-3 mr-1" />
                Resolver
              </Button>
            )}
          </div>
        )}

        {/* Resolution notes */}
        {message.resolved_at && message.resolution_notes && (
          <div className="text-xs text-muted-foreground bg-green-50 p-2 rounded-md">
            <span className="font-medium">Observação:</span> {message.resolution_notes}
          </div>
        )}
      </div>

      {/* Delete button - only for gerencial */}
      {isGerencial && (
        <Button
          size="icon"
          variant="ghost"
          className="h-8 w-8 text-muted-foreground hover:text-destructive"
          onClick={() => onDelete(message.id)}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
};
