import { MobileCard, MobileCardHeader, MobileCardRow } from "@/components/ui/mobile-card";
import { Phone, Mail, MapPin, Building2 } from "lucide-react";

interface Client {
  id: string;
  full_name: string;
  nome_fantasia?: string | null;
  phone: string;
  email?: string | null;
  city?: string | null;
  state?: string | null;
  street?: string | null;
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
      return `${client.city}/${client.state}`;
    }
    return client.city ? `${client.city}/${client.state}` : null;
  };

  return (
    <MobileCard>
      <MobileCardHeader
        title={client.full_name}
        subtitle={client.nome_fantasia || undefined}
        onView={onView}
        onEdit={onEdit}
        onDelete={onDelete}
      />
      
      <div className="space-y-1">
        <MobileCardRow
          icon={<Phone className="h-4 w-4" />}
          value={client.phone}
        />
        
        {client.email && (
          <MobileCardRow
            icon={<Mail className="h-4 w-4" />}
            value={client.email}
          />
        )}
        
        {formatAddress() && (
          <MobileCardRow
            icon={<MapPin className="h-4 w-4" />}
            value={formatAddress()}
          />
        )}
        
        {client.cpf_cnpj && (
          <MobileCardRow
            icon={<Building2 className="h-4 w-4" />}
            value={client.cpf_cnpj}
          />
        )}
      </div>
    </MobileCard>
  );
}
