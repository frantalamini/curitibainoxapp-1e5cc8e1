import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CadastroTipo } from "@/hooks/useCadastros";

type CadastrosTabsProps = {
  activeTab: CadastroTipo | 'todos';
  onTabChange: (tab: CadastroTipo | 'todos') => void;
  counters?: {
    todos?: number;
    cliente?: number;
    fornecedor?: number;
    transportador?: number;
    colaborador?: number;
    outro?: number;
  };
};

export const CadastrosTabs = ({ activeTab, onTabChange, counters }: CadastrosTabsProps) => {
  const tabs = [
    { value: 'todos', label: 'Todos', count: counters?.todos || 0 },
    { value: 'cliente', label: 'Cliente', count: counters?.cliente || 0 },
    { value: 'fornecedor', label: 'Fornecedor', count: counters?.fornecedor || 0 },
    { value: 'transportador', label: 'Transportador', count: counters?.transportador || 0 },
    { value: 'colaborador', label: 'Colaborador', count: counters?.colaborador || 0 },
    { value: 'outro', label: 'Outro', count: counters?.outro || 0 },
  ];

  return (
    <>
      {/* Desktop: Tabs horizontais */}
      <Tabs value={activeTab} onValueChange={onTabChange} className="hidden md:block">
        <TabsList className="bg-transparent border-b border-border rounded-none h-auto p-0 w-full justify-start">
          {tabs.map((tab) => (
            <TabsTrigger
              key={tab.value}
              value={tab.value}
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-[#18487A] data-[state=active]:bg-transparent data-[state=active]:shadow-none px-4 py-3"
            >
              <span className="font-medium text-sm">
                {tab.label}{' '}
                <span className="text-xs text-muted-foreground ml-1">
                  {tab.count}
                </span>
              </span>
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {/* Mobile: Select dropdown */}
      <div className="md:hidden">
        <Select value={activeTab} onValueChange={onTabChange}>
          <SelectTrigger className="w-full">
            <SelectValue>
              {tabs.find(t => t.value === activeTab)?.label} ({tabs.find(t => t.value === activeTab)?.count})
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {tabs.map((tab) => (
              <SelectItem key={tab.value} value={tab.value}>
                {tab.label} ({tab.count})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </>
  );
};
