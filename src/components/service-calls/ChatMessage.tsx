import { format, formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { renderContentWithMentions } from "@/lib/mentionUtils";
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
  ExternalLink,
  Loader2
} from "lucide-react";
import {
  ServiceCallMessage,
  MessageAttachment,
  CATEGORY_LABELS,
  CATEGORY_ICONS,
  PRIORITY_LABELS,
  PRIORITY_COLORS,
} from "@/hooks/useServiceCallMessages";
import { getSLAStatus, getSLAColorClass, getSLALabel } from "@/hooks/usePendingActions";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { useState } from "react";
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
  const [openingAttachmentId, setOpeningAttachmentId] = useState<string | null>(null);

  // Extract file path from old file_url format for backwards compatibility
  const extractPathFromUrl = (fileUrl: string): string | null => {
    const match = fileUrl.match(/\/object\/public\/chat-attachments\/(.+)$/);
    return match ? match[1] : null;
  };

  // Open attachment using signed URL
  const openAttachment = async (att: MessageAttachment) => {
    // Determine the path: prefer file_path, fallback to extracting from file_url
    const path = att.file_path || extractPathFromUrl(att.file_url);
    
    if (!path) {
      toast({
        title: "Erro ao abrir anexo",
        description: "Não foi possível determinar o caminho do arquivo.",
        variant: "destructive",
      });
      return;
    }

    setOpeningAttachmentId(att.id);

    try {
      const { data, error } = await supabase.storage
        .from('chat-attachments')
        .createSignedUrl(path, 3600); // 1 hour expiry

      if (error) throw error;

      window.open(data.signedUrl, "_blank", "noopener,noreferrer");
    } catch (error: any) {
      console.error("Erro ao gerar URL assinada:", error);
      toast({
        title: "Não foi possível abrir o anexo",
        description: "Tente novamente. Se o problema persistir, entre em contato com o suporte.",
        variant: "destructive",
      });
    } finally {
      setOpeningAttachmentId(null);
    }
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
              <button
                key={att.id}
                onClick={() => openAttachment(att)}
                disabled={openingAttachmentId === att.id}
                className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-background border text-sm hover:bg-muted transition-colors cursor-pointer disabled:opacity-50"
              >
                {openingAttachmentId === att.id ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  getAttachmentIcon(att.file_type)
                )}
                <span className="truncate max-w-[150px]">{att.file_name}</span>
                <ExternalLink className="h-3 w-3 text-muted-foreground" />
              </button>
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
