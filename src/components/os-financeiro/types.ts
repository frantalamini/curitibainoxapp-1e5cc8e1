// Types for financial management in service calls

export type DiscountType = 'percent' | 'value';

export interface DiscountCategory {
  type: DiscountType;
  value: number;
  calculated: number;
}

export interface DiscountConfig {
  parts: DiscountCategory;
  services: DiscountCategory;
  total: DiscountCategory;
}

export type PaymentMethodType = 
  | 'dinheiro' 
  | 'pix' 
  | 'cartao_credito' 
  | 'cartao_debito' 
  | 'boleto' 
  | 'transferencia' 
  | 'outros';

// Renamed to avoid conflict with PaymentMethod from usePaymentMethods.ts
export interface OSPaymentEntry {
  id: string;
  method: PaymentMethodType;
  amount: number;
  details?: string;
}

export interface Installment {
  id?: string;
  number: number;
  days: number;
  dueDate: Date;
  amount: number;
  status: 'OPEN' | 'PAID' | 'CANCELED';
  isEdited?: boolean;
  paymentMethod?: string;
}

export interface PaymentConfig {
  startDate: string;
  installmentDays: number[];
  paymentMethods: OSPaymentEntry[];
}

export interface CalculatedTotals {
  subtotalParts: number;
  subtotalServices: number;
  discountParts: number;
  discountServices: number;
  discountTotal: number;
  totalParts: number;
  totalServices: number;
  grandTotal: number;
}

// Webhook payload structure
export interface FinancialWebhookPayload {
  os_id: string;
  os_number?: number;
  client_id: string;
  subtotal_pecas: number;
  subtotal_servicos: number;
  descontos: {
    pecas: { tipo: DiscountType; valor: number; calculado: number };
    servicos: { tipo: DiscountType; valor: number; calculado: number };
    os: { tipo: DiscountType; valor: number; calculado: number };
  };
  total_os: number;
  pagamento: {
    data_inicio_prazo: string;
    parcelas: Array<{
      numero: number;
      dias: number;
      vencimento: string;
      valor: number;
      status?: string;
    }>;
    formas: Array<{
      method: string;
      valor: number;
      detalhes?: string;
    }>;
  };
  created_at: string;
}
