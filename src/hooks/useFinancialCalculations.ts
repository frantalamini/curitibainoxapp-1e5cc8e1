import { useMemo } from "react";
import { addDays, format } from "date-fns";
import { 
  DiscountConfig, 
  CalculatedTotals, 
  Installment, 
  PaymentMethod, 
  FinancialWebhookPayload,
  PaymentConfig 
} from "@/components/os-financeiro/types";

interface UseFinancialCalculationsProps {
  subtotalParts: number;
  subtotalServices: number;
  discounts: DiscountConfig;
}

export const useFinancialCalculations = ({
  subtotalParts,
  subtotalServices,
  discounts,
}: UseFinancialCalculationsProps): CalculatedTotals => {
  return useMemo(() => {
    // Calculate parts discount
    let discountParts = 0;
    if (discounts.parts.type === 'percent') {
      discountParts = subtotalParts * (discounts.parts.value / 100);
    } else {
      discountParts = Math.min(discounts.parts.value, subtotalParts);
    }
    const totalParts = subtotalParts - discountParts;

    // Calculate services discount
    let discountServices = 0;
    if (discounts.services.type === 'percent') {
      discountServices = subtotalServices * (discounts.services.value / 100);
    } else {
      discountServices = Math.min(discounts.services.value, subtotalServices);
    }
    const totalServices = subtotalServices - discountServices;

    // Calculate total OS discount (applied on subtotal after category discounts)
    const subtotalAfterCategories = totalParts + totalServices;
    let discountTotal = 0;
    if (discounts.total.type === 'percent') {
      discountTotal = subtotalAfterCategories * (discounts.total.value / 100);
    } else {
      discountTotal = Math.min(discounts.total.value, subtotalAfterCategories);
    }
    const grandTotal = subtotalAfterCategories - discountTotal;

    return {
      subtotalParts,
      subtotalServices,
      discountParts,
      discountServices,
      discountTotal,
      totalParts,
      totalServices,
      grandTotal,
    };
  }, [subtotalParts, subtotalServices, discounts]);
};

// Generate installments with cumulative dates
export const generateInstallments = (
  startDate: Date,
  installmentDays: number[],
  total: number
): Installment[] => {
  if (installmentDays.length === 0 || total <= 0) return [];

  const valuePerInstallment = total / installmentDays.length;
  let currentDate = new Date(startDate);

  return installmentDays.map((days, index) => {
    // Cumulative: add days from previous date
    currentDate = addDays(currentDate, days);

    return {
      number: index + 1,
      days,
      dueDate: new Date(currentDate),
      amount: valuePerInstallment,
      status: 'OPEN' as const,
      isEdited: false,
    };
  });
};

// Validate payment methods sum
export const validatePaymentMethods = (
  methods: PaymentMethod[],
  total: number
): { valid: boolean; diff: number } => {
  const sum = methods.reduce((acc, m) => acc + m.amount, 0);
  return {
    valid: Math.abs(sum - total) < 0.01,
    diff: total - sum,
  };
};

// Prepare webhook payload
export const prepareWebhookPayload = (
  serviceCallId: string,
  clientId: string,
  osNumber: number | undefined,
  discounts: DiscountConfig,
  calculatedTotals: CalculatedTotals,
  paymentConfig: {
    startDate: Date;
    installmentDays: number[];
  },
  installments: Array<{ number: number; days: number; dueDate: Date; amount: number; status: string }>,
  paymentMethods: PaymentMethod[]
): FinancialWebhookPayload => {
  return {
    os_id: serviceCallId,
    os_number: osNumber,
    client_id: clientId,
    subtotal_pecas: calculatedTotals.subtotalParts,
    subtotal_servicos: calculatedTotals.subtotalServices,
    descontos: {
      pecas: {
        tipo: discounts.parts.type,
        valor: discounts.parts.value,
        calculado: calculatedTotals.discountParts,
      },
      servicos: {
        tipo: discounts.services.type,
        valor: discounts.services.value,
        calculado: calculatedTotals.discountServices,
      },
      os: {
        tipo: discounts.total.type,
        valor: discounts.total.value,
        calculado: calculatedTotals.discountTotal,
      },
    },
    total_os: calculatedTotals.grandTotal,
    pagamento: {
      data_inicio_prazo: format(paymentConfig.startDate, 'yyyy-MM-dd'),
      parcelas: installments.map(inst => ({
        numero: inst.number,
        dias: inst.days,
        vencimento: format(inst.dueDate, 'yyyy-MM-dd'),
        valor: inst.amount,
        status: inst.status,
      })),
      formas: paymentMethods.map(pm => ({
        method: pm.method,
        valor: pm.amount,
        detalhes: pm.details,
      })),
    },
    created_at: new Date().toISOString(),
  };
};

// Parse payment_config JSON from database
export const parsePaymentConfig = (config: unknown): PaymentConfig | null => {
  if (!config || typeof config !== 'object') return null;
  
  const c = config as Record<string, unknown>;
  
  return {
    startDate: c.start_date as string || '',
    installmentDays: Array.isArray(c.installment_days) ? c.installment_days : [],
    paymentMethods: Array.isArray(c.payment_methods) 
      ? c.payment_methods.map((pm: any) => ({
          id: pm.id || crypto.randomUUID(),
          method: pm.method,
          amount: pm.amount,
          details: pm.details,
        }))
      : [],
  };
};

// Build payment_config JSON for database
export const buildPaymentConfig = (
  startDate: Date,
  installmentDays: number[],
  paymentMethods: PaymentMethod[]
): Record<string, unknown> => {
  return {
    start_date: format(startDate, 'yyyy-MM-dd'),
    installment_days: installmentDays,
    payment_methods: paymentMethods.map(pm => ({
      id: pm.id,
      method: pm.method,
      amount: pm.amount,
      details: pm.details,
    })),
  };
};
