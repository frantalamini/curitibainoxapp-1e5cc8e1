import { useState, useRef, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { MessageCircle, ChevronDown, ChevronUp, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { 
  useServiceCallMessages, 
  useCreateMessage, 
  useResolveMessage,
  useDeleteMessage,
  ServiceCallMessage,
} from "@/hooks/useServiceCallMessages";
import { useUserRole } from "@/hooks/useUserRole";
import { useCurrentUserPermissions } from "@/hooks/useUserPermissions";
import { ChatMessage } from "./ChatMessage";
import { ChatInput } from "./ChatInput";
import { ResolveMessageModal } from "./ResolveMessageModal";
import { supabase } from "@/integrations/supabase/client";

interface ServiceCallChatProps {
  serviceCallId: string;
  osNumber: number;
}

export const ServiceCallChat = ({ serviceCallId, osNumber }: ServiceCallChatProps) => {
  const [isOpen, setIsOpen] = useState(true);
  const [resolveModalOpen, setResolveModalOpen] = useState(false);
  const [selectedMessage, setSelectedMessage] = useState<ServiceCallMessage | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [messageToDelete, setMessageToDelete] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  
  const scrollRef = useRef<HTMLDivElement>(null);
  
  const { data: messages = [], isLoading } = useServiceCallMessages(serviceCallId);
  const createMessage = useCreateMessage();
  const resolveMessage = useResolveMessage();
  const deleteMessage = useDeleteMessage();
  const { isAdmin } = useUserRole();
  const { data: userPermissions } = useCurrentUserPermissions();

  // Get current user ID
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setCurrentUserId(data.user?.id || null);
    });
  }, []);

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages.length]);

  // Count pending actions
  const pendingCount = messages.filter(m => m.requires_action && !m.resolved_at).length;

  // Check if user is gerencial (can delete)
  const isGerencial = userPermissions?.profileType === 'gerencial';

  const handleResolve = (messageId: string) => {
    const msg = messages.find(m => m.id === messageId);
    setSelectedMessage(msg || null);
    setResolveModalOpen(true);
  };

  const confirmResolve = (messageId: string, notes: string) => {
    resolveMessage.mutate(
      { messageId, resolutionNotes: notes },
      {
        onSuccess: () => setResolveModalOpen(false),
      }
    );
  };

  const handleDelete = (messageId: string) => {
    setMessageToDelete(messageId);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (messageToDelete) {
      deleteMessage.mutate(messageToDelete, {
        onSuccess: () => {
          setDeleteDialogOpen(false);
          setMessageToDelete(null);
        },
      });
    }
  };

  return (
    <Card>
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CardHeader className="p-4 pb-2">
          <CollapsibleTrigger asChild>
            <Button 
              variant="ghost" 
              className="w-full justify-between p-0 h-auto hover:bg-transparent"
            >
              <CardTitle className="text-base flex items-center gap-2">
                <MessageCircle className="h-5 w-5" />
                Chat Interno
                {pendingCount > 0 && (
                  <Badge variant="destructive" className="h-5 px-1.5 text-xs">
                    {pendingCount} pendente{pendingCount > 1 ? 's' : ''}
                  </Badge>
                )}
              </CardTitle>
              {isOpen ? (
                <ChevronUp className="h-4 w-4 text-muted-foreground" />
              ) : (
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              )}
            </Button>
          </CollapsibleTrigger>
        </CardHeader>

        <CollapsibleContent>
          <CardContent className="p-4 pt-2 space-y-4">
            {/* Messages list */}
            <ScrollArea 
              className="h-[300px] pr-4" 
              ref={scrollRef}
            >
              {isLoading ? (
                <div className="flex items-center justify-center h-full">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                  <MessageCircle className="h-10 w-10 mb-2 opacity-50" />
                  <p className="text-sm">Nenhuma mensagem ainda</p>
                  <p className="text-xs">Inicie a conversa abaixo</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {messages.map((msg) => (
                    <ChatMessage
                      key={msg.id}
                      message={msg}
                      currentUserId={currentUserId || ''}
                      isAdmin={isAdmin}
                      isGerencial={isGerencial}
                      onResolve={handleResolve}
                      onDelete={handleDelete}
                    />
                  ))}
                </div>
              )}
            </ScrollArea>

            {/* Input */}
            <ChatInput
              serviceCallId={serviceCallId}
              onSend={(data) => {
                createMessage.mutate({
                  service_call_id: serviceCallId,
                  ...data,
                });
              }}
              isLoading={createMessage.isPending}
            />
          </CardContent>
        </CollapsibleContent>
      </Collapsible>

      {/* Resolve Modal */}
      <ResolveMessageModal
        open={resolveModalOpen}
        onOpenChange={setResolveModalOpen}
        message={selectedMessage}
        osNumber={osNumber}
        onConfirm={confirmResolve}
        isLoading={resolveMessage.isPending}
      />

      {/* Delete Confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir mensagem?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. A mensagem será permanentemente excluída.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
};
