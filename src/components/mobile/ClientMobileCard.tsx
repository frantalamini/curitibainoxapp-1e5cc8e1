import { MobileCard, MobileCardHeader, MobileCardRow, MobileCardFooter } from "@/components/ui/mobile-card";
import { Phone, Mail, MapPin, Building2, FileText } from "lucide-react";

interface Client {
  id: string;
  full_name: string;
  nome_fantasia?: string | null;
  phone: string;
  phone_2?: string | null;
  email?: string | null;
  city?: string | null;
  state?: string | null;
  street?: string | null;
  number?: string | null;
  neighborhood?: string | null;
  cpf_cnpj?: string | null;
}

interface ClientMobileCardProps {
  client: Client;
  onView: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

export function ClientMobileCard({ client, onView, onEdit, onDelete }: ClientMobileCardProps) {
  const formatAddress = () => {
    if (client.street && client.city) {
      const parts = [client.street];
      if (client.number) parts.push(client.number);
      if (client.neighborhood) parts.push(client.neighborhood);
      return `${parts.join(", ")} - ${client.city}/${client.state}`;
    }
    return client.city ? `${client.city}/${client.state}` : null;
  };

  return (
    <MobileCard onClick={onView}>
      <MobileCardHeader
        title={client.full_name}
        subtitle={client.nome_fantasia || undefined}
      />
      
      <div className="space-y-1">
        <MobileCardRow
          icon={<Phone className="h-4 w-4" />}
          label="Telefone"
          value={
            <div>
              <span>{client.phone}</span>
              {client.phone_2 && <span className="text-muted-foreground"> / {client.phone_2}</span>}
            </div>
          }
        />
        
        {client.email && (
          <MobileCardRow
            icon={<Mail className="h-4 w-4" />}
            label="Email"
            value={client.email}
          />
        )}
        
        {formatAddress() && (
          <MobileCardRow
            icon={<MapPin className="h-4 w-4" />}
            label="Endereço"
            value={formatAddress()}
          />
        )}
        
        {client.cpf_cnpj && (
          <MobileCardRow
            icon={<FileText className="h-4 w-4" />}
            label="CPF/CNPJ"
            value={client.cpf_cnpj}
          />
        )}
      </div>
      
      <MobileCardFooter
        onView={onView}
        onEdit={onEdit}
        onDelete={onDelete}
      />
    </MobileCard>
  );
}
