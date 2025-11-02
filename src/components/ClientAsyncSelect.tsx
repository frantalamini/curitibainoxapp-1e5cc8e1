import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Check, ChevronsUpDown, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { useDebounce } from "@/hooks/useDebounce";
import { useClientSearch } from "@/hooks/useClientSearch";
import { supabase } from "@/integrations/supabase/client";

interface ClientAsyncSelectProps {
  value: string;
  onChange: (clientId: string) => void;
  onNewClientClick: () => void;
  error?: boolean;
}

export const ClientAsyncSelect = ({ 
  value, 
  onChange, 
  onNewClientClick,
  error 
}: ClientAsyncSelectProps) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [open, setOpen] = useState(false);
  const debouncedSearch = useDebounce(searchTerm, 300);
  
  const { data: results, isLoading } = useClientSearch(debouncedSearch, open);
  
  const { data: selectedClient } = useQuery({
    queryKey: ["client", value],
    queryFn: async () => {
      if (!value) return null;
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .eq('id', value)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!value,
  });

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              role="combobox"
              aria-expanded={open}
              className={cn(
                "flex-1 justify-between",
                error && "border-destructive"
              )}
            >
              {selectedClient ? (
                <span className="truncate">{selectedClient.full_name}</span>
              ) : (
                <span className="text-muted-foreground">Digite para buscar...</span>
              )}
              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[400px] p-0" align="start">
            <Command shouldFilter={false}>
              <CommandInput 
                placeholder="Buscar por nome, fantasia ou CNPJ..."
                value={searchTerm}
                onValueChange={setSearchTerm}
              />
              <CommandList>
                <CommandEmpty>
                  {isLoading ? "Buscando..." : searchTerm.length < 2 ? "Digite pelo menos 2 caracteres" : "Nenhum resultado"}
                </CommandEmpty>
                {results && results.length > 0 && (
                  <CommandGroup>
                    {results.map((client) => (
                      <CommandItem
                        key={client.id}
                        onSelect={() => {
                          onChange(client.id);
                          setOpen(false);
                          setSearchTerm("");
                        }}
                        className="flex items-start gap-2 py-3"
                      >
                        <Check
                          className={cn(
                            "mt-1 h-4 w-4 shrink-0",
                            value === client.id ? "opacity-100" : "opacity-0"
                          )}
                        />
                        <div className="flex flex-col flex-1 min-w-0">
                          <span className="font-medium truncate">{client.full_name}</span>
                          {(client.nome_fantasia || client.cpf_cnpj) && (
                            <span className="text-xs text-muted-foreground truncate">
                              {client.nome_fantasia && client.nome_fantasia}
                              {client.nome_fantasia && client.cpf_cnpj && " • "}
                              {client.cpf_cnpj && client.cpf_cnpj}
                            </span>
                          )}
                        </div>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                )}
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>

        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={onNewClientClick}
          title="Novo Cliente"
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      {selectedClient && (
        <div className="flex items-start gap-2 p-3 bg-muted rounded-md">
          <div className="flex-1 min-w-0">
            <p className="font-semibold truncate">{selectedClient.full_name}</p>
            <p className="text-sm text-muted-foreground">
              Telefone: {selectedClient.phone}
            </p>
            {selectedClient.street && (
              <p className="text-sm text-muted-foreground truncate">
                {selectedClient.street}, {selectedClient.number}
                {selectedClient.city && ` - ${selectedClient.city}`}
              </p>
            )}
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8 shrink-0"
            onClick={() => onChange("")}
            title="Limpar seleção"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
};
