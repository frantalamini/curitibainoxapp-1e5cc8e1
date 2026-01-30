import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { 
  Send, 
  Paperclip, 
  AtSign, 
  FileText, 
  Loader2,
  X,
  MessageSquarePlus
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAllUsers, UserWithRole } from "@/hooks/useUsers";
import { useMessageTemplates, TEMPLATE_ICONS } from "@/hooks/useMessageTemplates";
import { 
  MessageCategory, 
  MessagePriority,
  CATEGORY_LABELS,
  CATEGORY_ICONS,
  PRIORITY_LABELS,
  DEFAULT_SLA_HOURS,
} from "@/hooks/useServiceCallMessages";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { addHours, format } from "date-fns";

interface ChatInputProps {
  onSend: (data: {
    content: string;
    category?: MessageCategory | null;
    priority?: MessagePriority;
    requires_action?: boolean;
    due_date?: string | null;
    mentioned_user_ids?: string[];
    attachments?: {
      file_url: string;
      file_name: string;
      file_type: 'image' | 'document' | 'audio';
      file_size?: number;
      file_path?: string;
    }[];
  }) => void;
  isLoading?: boolean;
  serviceCallId: string;
}

export const ChatInput = ({ onSend, isLoading, serviceCallId }: ChatInputProps) => {
  const [content, setContent] = useState("");
  const [requiresAction, setRequiresAction] = useState(false);
  const [category, setCategory] = useState<MessageCategory | null>(null);
  const [priority, setPriority] = useState<MessagePriority>("normal");
  const [dueDate, setDueDate] = useState<string>("");
  const [mentionedUsers, setMentionedUsers] = useState<UserWithRole[]>([]);
  const [showMentions, setShowMentions] = useState(false);
  const [mentionSearch, setMentionSearch] = useState("");
  const [attachments, setAttachments] = useState<{
    file_url: string;
    file_name: string;
    file_type: 'image' | 'document' | 'audio';
    file_size?: number;
    file_path?: string;
  }[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const { data: allUsers = [] } = useAllUsers();
  const { data: templates = [] } = useMessageTemplates();

  // Filter users for mention dropdown
  const filteredUsers = allUsers.filter(user =>
    user.full_name.toLowerCase().includes(mentionSearch.toLowerCase())
  );

  // Handle @ key for mentions
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === '@') {
      setShowMentions(true);
      setMentionSearch("");
    }
    if (e.key === 'Escape') {
      setShowMentions(false);
    }
  };

  // Add mention to content
  const addMention = (user: UserWithRole) => {
    const mentionText = `@[${user.user_id}:${user.full_name}] `;
    setContent(prev => {
      // Remove the @ that triggered the dropdown
      const lastAtIndex = prev.lastIndexOf('@');
      return prev.slice(0, lastAtIndex) + mentionText;
    });
    setMentionedUsers(prev => 
      prev.some(u => u.user_id === user.user_id) ? prev : [...prev, user]
    );
    setShowMentions(false);
    textareaRef.current?.focus();
  };

  // Remove mention
  const removeMention = (userId: string) => {
    setMentionedUsers(prev => prev.filter(u => u.user_id !== userId));
  };

  // Apply template
  const applyTemplate = (template: typeof templates[0]) => {
    setContent(prev => prev + template.content);
    if (template.category) {
      setCategory(template.category);
      setRequiresAction(true);
      // Auto-set due date based on default SLA
      const defaultHours = DEFAULT_SLA_HOURS[priority];
      const defaultDue = addHours(new Date(), defaultHours);
      setDueDate(format(defaultDue, "yyyy-MM-dd'T'HH:mm"));
    }
    textareaRef.current?.focus();
  };

  // Handle file upload
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);
    
    try {
      for (const file of Array.from(files)) {
        // Determine file type
        let fileType: 'image' | 'document' | 'audio' = 'document';
        if (file.type.startsWith('image/')) fileType = 'image';
        else if (file.type.startsWith('audio/')) fileType = 'audio';

        // Upload to storage - sanitize filename to avoid invalid characters
        const sanitizedName = file.name
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '') // Remove acentos
          .replace(/[^a-zA-Z0-9._-]/g, '_') // Substitui caracteres especiais por underscore
          .replace(/_+/g, '_'); // Remove underscores duplicados
        const fileName = `${Date.now()}-${sanitizedName}`;
        const filePath = `${serviceCallId}/${fileName}`;
        
        const { error: uploadError } = await supabase.storage
          .from('chat-attachments')
          .upload(filePath, file);

        if (uploadError) throw uploadError;

        // Store the file_path for signed URL generation later
        // file_url is kept as empty string for backwards compatibility
        setAttachments(prev => [...prev, {
          file_url: '', // Not used anymore - signed URLs generated on-demand
          file_name: file.name,
          file_type: fileType,
          file_size: file.size,
          file_path: filePath,
        }]);
      }
    } catch (error: any) {
      toast({
        title: "Erro ao enviar arquivo",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // Remove attachment
  const removeAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  // Update due date when priority changes
  useEffect(() => {
    if (requiresAction && !dueDate) {
      const defaultHours = DEFAULT_SLA_HOURS[priority];
      const defaultDue = addHours(new Date(), defaultHours);
      setDueDate(format(defaultDue, "yyyy-MM-dd'T'HH:mm"));
    }
  }, [priority, requiresAction]);

  // Submit handler
  const handleSubmit = () => {
    if (!content.trim() && attachments.length === 0) return;

    onSend({
      content: content.trim(),
      category: requiresAction ? category : null,
      priority: requiresAction ? priority : 'normal',
      requires_action: requiresAction,
      due_date: requiresAction && dueDate ? new Date(dueDate).toISOString() : null,
      mentioned_user_ids: mentionedUsers.map(u => u.user_id),
      attachments,
    });

    // Reset form
    setContent("");
    setRequiresAction(false);
    setCategory(null);
    setPriority("normal");
    setDueDate("");
    setMentionedUsers([]);
    setAttachments([]);
  };

  return (
    <div className="border rounded-lg p-3 space-y-3 bg-background">
      {/* Attachments preview */}
      {attachments.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {attachments.map((att, index) => (
            <div 
              key={index}
              className="flex items-center gap-2 px-2 py-1 rounded bg-muted text-sm"
            >
              <span className="truncate max-w-[150px]">{att.file_name}</span>
              <Button
                size="icon"
                variant="ghost"
                className="h-5 w-5"
                onClick={() => removeAttachment(index)}
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          ))}
        </div>
      )}

      {/* Mentioned users */}
      {mentionedUsers.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {mentionedUsers.map(user => (
            <div 
              key={user.user_id}
              className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/10 text-primary text-xs"
            >
              @{user.full_name}
              <Button
                size="icon"
                variant="ghost"
                className="h-4 w-4"
                onClick={() => removeMention(user.user_id)}
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          ))}
        </div>
      )}

      {/* Main input area */}
      <div className="flex gap-2 items-start">
        {/* Attachment button */}
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/*,audio/*,.pdf,.doc,.docx,.xls,.xlsx"
          className="hidden"
          onChange={handleFileUpload}
        />
        <Button
          size="icon"
          variant="ghost"
          className="shrink-0"
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading}
        >
          {isUploading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Paperclip className="h-4 w-4" />
          )}
        </Button>

        {/* Mention button */}
        <Popover open={showMentions} onOpenChange={setShowMentions}>
          <PopoverTrigger asChild>
            <Button size="icon" variant="ghost" className="shrink-0">
              <AtSign className="h-4 w-4" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-64 p-2" align="start">
            <Input
              placeholder="Buscar usuário..."
              value={mentionSearch}
              onChange={(e) => setMentionSearch(e.target.value)}
              className="mb-2"
            />
            <div className="max-h-48 overflow-y-auto space-y-1">
              {filteredUsers.map(user => (
                <button
                  key={user.user_id}
                  className="w-full text-left px-2 py-1.5 rounded hover:bg-muted text-sm"
                  onClick={() => addMention(user)}
                >
                  {user.full_name}
                  {user.profile_type && (
                    <span className="text-xs text-muted-foreground ml-2">
                      ({user.profile_type})
                    </span>
                  )}
                </button>
              ))}
              {filteredUsers.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-2">
                  Nenhum usuário encontrado
                </p>
              )}
            </div>
          </PopoverContent>
        </Popover>

        {/* Text area */}
        <div className="flex-1 relative">
          <Textarea
            ref={textareaRef}
            placeholder="Digite sua mensagem..."
            value={content}
            onChange={(e) => setContent(e.target.value)}
            onKeyDown={handleKeyDown}
            className="min-h-[60px] resize-none pr-10"
          />
        </div>

        {/* Templates dropdown */}
        <Popover>
          <PopoverTrigger asChild>
            <Button size="icon" variant="ghost" className="shrink-0">
              <MessageSquarePlus className="h-4 w-4" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-64 p-2" align="end">
            <p className="text-xs text-muted-foreground mb-2 px-2">
              Templates Rápidos
            </p>
            <div className="space-y-1">
              {templates.map(template => (
                <button
                  key={template.id}
                  className="w-full text-left px-2 py-1.5 rounded hover:bg-muted text-sm flex items-center gap-2"
                  onClick={() => applyTemplate(template)}
                >
                  <span>
                    {template.category 
                      ? TEMPLATE_ICONS[template.category] 
                      : TEMPLATE_ICONS.default}
                  </span>
                  {template.title}
                </button>
              ))}
            </div>
          </PopoverContent>
        </Popover>

        {/* Send button */}
        <Button
          size="icon"
          className="shrink-0"
          onClick={handleSubmit}
          disabled={isLoading || (!content.trim() && attachments.length === 0)}
        >
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Send className="h-4 w-4" />
          )}
        </Button>
      </div>

      {/* Pending action options */}
      <div className="space-y-3 pt-2 border-t">
        <div className="flex items-center gap-2">
          <Checkbox
            id="requires-action"
            checked={requiresAction}
            onCheckedChange={(checked) => setRequiresAction(!!checked)}
          />
          <Label htmlFor="requires-action" className="text-sm font-normal cursor-pointer">
            Marcar como pendência
          </Label>
        </div>

        {requiresAction && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pl-6">
            {/* Category */}
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Categoria</Label>
              <Select
                value={category || ""}
                onValueChange={(v) => setCategory(v as MessageCategory)}
              >
                <SelectTrigger className="h-8 text-sm">
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(CATEGORY_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value} className="text-sm">
                      {CATEGORY_ICONS[value as MessageCategory]} {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Priority */}
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Prioridade</Label>
              <Select
                value={priority}
                onValueChange={(v) => setPriority(v as MessagePriority)}
              >
                <SelectTrigger className="h-8 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(PRIORITY_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value} className="text-sm">
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Due date */}
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Prazo</Label>
              <Input
                type="datetime-local"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="h-8 text-sm"
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
