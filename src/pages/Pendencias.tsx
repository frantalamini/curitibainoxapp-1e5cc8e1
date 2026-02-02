import { useState } from "react";
import { renderContentWithMentions } from "@/lib/mentionUtils";
import { useNavigate } from "react-router-dom";
import MainLayout from "@/components/MainLayout";
import { PageHeader } from "@/components/ui/page-header";
import { PageContainer } from "@/components/ui/page-container";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  AlertCircle,
  Clock,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Search,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { format, formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  usePendingActions,
  getSLAStatus,
  getSLAColorClass,
  getSLALabel,
  SLAStatus,
} from "@/hooks/usePendingActions";
import {
  useResolveMessage,
  MessageCategory,
  MessagePriority,
  CATEGORY_LABELS,
  CATEGORY_ICONS,
  PRIORITY_LABELS,
} from "@/hooks/useServiceCallMessages";
import { useTechnicians } from "@/hooks/useTechnicians";
import { useUserRole } from "@/hooks/useUserRole";
import { ResolveMessageModal } from "@/components/service-calls/ResolveMessageModal";

const SLA_FILTERS: { value: SLAStatus | 'all'; label: string; icon: React.ReactNode }[] = [
  { value: 'all', label: 'Todas', icon: null },
  { value: 'overdue', label: 'Atrasadas', icon: <AlertCircle className="h-4 w-4 text-destructive" /> },
  { value: 'due_today', label: 'Vence Hoje', icon: <Clock className="h-4 w-4 text-orange-500" /> },
  { value: 'on_track', label: 'No Prazo', icon: <CheckCircle2 className="h-4 w-4 text-green-500" /> },
];

const Pendencias = () => {
  const navigate = useNavigate();
  const { isAdmin } = useUserRole();
  
  // Filters
  const [categoryFilter, setCategoryFilter] = useState<MessageCategory | 'all'>('all');
  const [priorityFilter, setPriorityFilter] = useState<MessagePriority | 'all'>('all');
  const [technicianFilter, setTechnicianFilter] = useState<string | 'all'>('all');
  const [slaFilter, setSlaFilter] = useState<SLAStatus | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState("");
  
  // Collapsible sections
  const [overdueOpen, setOverdueOpen] = useState(true);
  const [dueTodayOpen, setDueTodayOpen] = useState(true);
  const [onTrackOpen, setOnTrackOpen] = useState(true);
  
  // Modal
  const [resolveModalOpen, setResolveModalOpen] = useState(false);
  const [selectedPending, setSelectedPending] = useState<any>(null);
  
  // Data
  const { technicians } = useTechnicians();
  const { data: allPending = [], isLoading } = usePendingActions({
    category: categoryFilter !== 'all' ? categoryFilter : null,
    priority: priorityFilter !== 'all' ? priorityFilter : null,
    technicianId: technicianFilter !== 'all' ? technicianFilter : null,
    slaStatus: slaFilter !== 'all' ? slaFilter : null,
  });
  const resolveMessage = useResolveMessage();

  // Filter by search query
  const filteredPending = allPending.filter(p => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      p.content.toLowerCase().includes(query) ||
      p.client_name.toLowerCase().includes(query) ||
      p.technician_name.toLowerCase().includes(query) ||
      `#${p.os_number}`.includes(query)
    );
  });

  // Group by SLA status
  const overdue = filteredPending.filter(p => getSLAStatus(p.due_date) === 'overdue');
  const dueToday = filteredPending.filter(p => getSLAStatus(p.due_date) === 'due_today');
  const onTrack = filteredPending.filter(p => getSLAStatus(p.due_date) === 'on_track' || !p.due_date);

  const handleResolve = (pending: any) => {
    setSelectedPending(pending);
    setResolveModalOpen(true);
  };

  const confirmResolve = (messageId: string, notes: string) => {
    resolveMessage.mutate(
      { messageId, resolutionNotes: notes },
      {
        onSuccess: () => {
          setResolveModalOpen(false);
          setSelectedPending(null);
        },
      }
    );
  };

  const renderPendingCard = (pending: any) => {
    const slaStatus = getSLAStatus(pending.due_date);
    
    return (
      <div
        key={pending.id}
        className={cn(
          "p-4 rounded-lg border bg-card",
          slaStatus === 'overdue' && "border-destructive/50 bg-destructive/5",
          slaStatus === 'due_today' && "border-orange-300 bg-orange-50/50",
        )}
      >
        <div className="flex flex-col sm:flex-row sm:items-start gap-3">
          {/* Main content */}
          <div className="flex-1 min-w-0 space-y-2">
            {/* Header */}
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant="outline" className="font-mono">
                OS #{pending.os_number}
              </Badge>
              {pending.category && (
                <Badge variant="secondary" className="text-xs">
                  {CATEGORY_ICONS[pending.category as MessageCategory]} {CATEGORY_LABELS[pending.category as MessageCategory]}
                </Badge>
              )}
              <span className={cn(
                "text-xs px-2 py-0.5 rounded",
                getSLAColorClass(slaStatus)
              )}>
                {getSLALabel(slaStatus, pending.due_date)}
              </span>
            </div>

            {/* Content */}
            <p className="text-sm line-clamp-2">{renderContentWithMentions(pending.content)}</p>

            {/* Meta */}
            <div className="flex items-center gap-4 text-xs text-muted-foreground flex-wrap">
              <span>👤 {pending.client_name}</span>
              <span>🔧 {pending.technician_name}</span>
              <span>
                {formatDistanceToNow(new Date(pending.created_at), { 
                  addSuffix: true, 
                  locale: ptBR 
                })}
              </span>
              {pending.mentions && pending.mentions.length > 0 && (
                <span className="text-primary">
                  @{pending.mentions.map((m: any) => m.user?.full_name).join(', @')}
                </span>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2 shrink-0">
            <Button
              size="sm"
              variant="outline"
              onClick={() => navigate(`/service-calls/view/${pending.service_call_id}`)}
            >
              <ExternalLink className="h-4 w-4 mr-1" />
              Abrir OS
            </Button>
            {isAdmin && (
              <Button
                size="sm"
                onClick={() => handleResolve(pending)}
                className="bg-green-600 hover:bg-green-700"
              >
                <CheckCircle2 className="h-4 w-4 mr-1" />
                Resolver
              </Button>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <MainLayout>
      <PageContainer>
        <PageHeader title="Pendências" />
        <p className="text-muted-foreground text-sm mb-6 -mt-4">
          Gerencie pendências e solicitações das ordens de serviço
        </p>

        {/* Filters */}
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
              {/* Search */}
              <div className="relative lg:col-span-2">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por conteúdo, cliente, OS..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>

              {/* Category */}
              <Select
                value={categoryFilter}
                onValueChange={(v) => setCategoryFilter(v as any)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Categoria" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas Categorias</SelectItem>
                  {Object.entries(CATEGORY_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {CATEGORY_ICONS[value as MessageCategory]} {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Priority */}
              <Select
                value={priorityFilter}
                onValueChange={(v) => setPriorityFilter(v as any)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Prioridade" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas Prioridades</SelectItem>
                  {Object.entries(PRIORITY_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Technician */}
              <Select
                value={technicianFilter}
                onValueChange={(v) => setTechnicianFilter(v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Técnico" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos Técnicos</SelectItem>
                  {(technicians || []).map((tech) => (
                    <SelectItem key={tech.id} value={tech.id}>
                      {tech.full_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* SLA filter buttons */}
            <div className="flex gap-2 mt-4 flex-wrap">
              {SLA_FILTERS.map((filter) => (
                <Button
                  key={filter.value}
                  size="sm"
                  variant={slaFilter === filter.value ? "default" : "outline"}
                  onClick={() => setSlaFilter(filter.value)}
                  className="gap-1"
                >
                  {filter.icon}
                  {filter.label}
                  {filter.value === 'overdue' && overdue.length > 0 && (
                    <Badge variant="destructive" className="ml-1 h-5 px-1.5">
                      {overdue.length}
                    </Badge>
                  )}
                  {filter.value === 'due_today' && dueToday.length > 0 && (
                    <Badge variant="secondary" className="ml-1 h-5 px-1.5 bg-orange-100 text-orange-700">
                      {dueToday.length}
                    </Badge>
                  )}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Content */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : filteredPending.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <CheckCircle2 className="h-12 w-12 text-green-500 mb-4" />
              <h3 className="text-lg font-medium">Nenhuma pendência</h3>
              <p className="text-muted-foreground text-sm">
                Todas as pendências foram resolvidas ou não há itens correspondentes aos filtros.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {/* Overdue Section */}
            {(slaFilter === 'all' || slaFilter === 'overdue') && overdue.length > 0 && (
              <Card className="border-destructive/50">
                <Collapsible open={overdueOpen} onOpenChange={setOverdueOpen}>
                  <CardHeader className="p-4 pb-2">
                    <CollapsibleTrigger asChild>
                      <Button variant="ghost" className="w-full justify-between p-0 h-auto">
                        <CardTitle className="text-base flex items-center gap-2 text-destructive">
                          <AlertCircle className="h-5 w-5" />
                          Atrasadas ({overdue.length})
                        </CardTitle>
                        {overdueOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                      </Button>
                    </CollapsibleTrigger>
                  </CardHeader>
                  <CollapsibleContent>
                    <CardContent className="p-4 pt-2 space-y-3">
                      {overdue.map(renderPendingCard)}
                    </CardContent>
                  </CollapsibleContent>
                </Collapsible>
              </Card>
            )}

            {/* Due Today Section */}
            {(slaFilter === 'all' || slaFilter === 'due_today') && dueToday.length > 0 && (
              <Card className="border-orange-300">
                <Collapsible open={dueTodayOpen} onOpenChange={setDueTodayOpen}>
                  <CardHeader className="p-4 pb-2">
                    <CollapsibleTrigger asChild>
                      <Button variant="ghost" className="w-full justify-between p-0 h-auto">
                        <CardTitle className="text-base flex items-center gap-2 text-orange-600">
                          <Clock className="h-5 w-5" />
                          Vence Hoje ({dueToday.length})
                        </CardTitle>
                        {dueTodayOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                      </Button>
                    </CollapsibleTrigger>
                  </CardHeader>
                  <CollapsibleContent>
                    <CardContent className="p-4 pt-2 space-y-3">
                      {dueToday.map(renderPendingCard)}
                    </CardContent>
                  </CollapsibleContent>
                </Collapsible>
              </Card>
            )}

            {/* On Track Section */}
            {(slaFilter === 'all' || slaFilter === 'on_track') && onTrack.length > 0 && (
              <Card>
                <Collapsible open={onTrackOpen} onOpenChange={setOnTrackOpen}>
                  <CardHeader className="p-4 pb-2">
                    <CollapsibleTrigger asChild>
                      <Button variant="ghost" className="w-full justify-between p-0 h-auto">
                        <CardTitle className="text-base flex items-center gap-2 text-green-600">
                          <CheckCircle2 className="h-5 w-5" />
                          No Prazo ({onTrack.length})
                        </CardTitle>
                        {onTrackOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                      </Button>
                    </CollapsibleTrigger>
                  </CardHeader>
                  <CollapsibleContent>
                    <CardContent className="p-4 pt-2 space-y-3">
                      {onTrack.map(renderPendingCard)}
                    </CardContent>
                  </CollapsibleContent>
                </Collapsible>
              </Card>
            )}
          </div>
        )}

        {/* Resolve Modal */}
        <ResolveMessageModal
          open={resolveModalOpen}
          onOpenChange={setResolveModalOpen}
          message={selectedPending}
          osNumber={selectedPending?.os_number}
          onConfirm={confirmResolve}
          isLoading={resolveMessage.isPending}
        />
      </PageContainer>
    </MainLayout>
  );
};

export default Pendencias;
