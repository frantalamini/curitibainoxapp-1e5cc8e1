/**
 * Cálculo canônico do valor total de uma OS COM descontos.
 *
 * Fonte da verdade única — usado pela listagem de OS (coluna Total) e deve ser
 * reutilizado por qualquer tela que mostre o valor final da OS, para evitar
 * divergência (o bug histórico era a lista somar itens brutos sem desconto).
 *
 * Fórmula idêntica à do PDF (src/lib/generateOSPdf.tsx):
 *   subtotalGrupos = produtos + serviços − descontoPeças − descontoServiços
 *   grandTotal     = subtotalGrupos + taxas − descontosItem − descontoGeral
 *   (clampado em 0)
 */

export interface OSItemLite {
  type: string | null;
  total: number | null;
}

export interface OSDiscounts {
  discount_parts_type?: string | null;
  discount_parts_value?: number | null;
  discount_services_type?: string | null;
  discount_services_value?: number | null;
  discount_total_type?: string | null;
  discount_total_value?: number | null;
}

export function computeOSGrandTotal(
  items: OSItemLite[],
  discounts: OSDiscounts,
): number {
  const sumByType = (t: string) =>
    items
      .filter((i) => i.type === t)
      .reduce((sum, i) => sum + (Number(i.total) || 0), 0);

  const totalProducts = sumByType("PRODUCT");
  const totalServices = sumByType("SERVICE");
  const totalFees = sumByType("FEE");
  const totalItemDiscounts = sumByType("DISCOUNT");

  const partsValue = discounts.discount_parts_value || 0;
  const servicesValue = discounts.discount_services_value || 0;
  const totalValue = discounts.discount_total_value || 0;

  const partsDiscount =
    discounts.discount_parts_type === "percentage"
      ? totalProducts * (partsValue / 100)
      : partsValue;

  const servicesDiscount =
    discounts.discount_services_type === "percentage"
      ? totalServices * (servicesValue / 100)
      : servicesValue;

  const subtotalAfterGroupDiscounts =
    totalProducts + totalServices - partsDiscount - servicesDiscount;

  const generalDiscount =
    discounts.discount_total_type === "percentage"
      ? subtotalAfterGroupDiscounts * (totalValue / 100)
      : totalValue;

  const grandTotal =
    subtotalAfterGroupDiscounts +
    totalFees -
    totalItemDiscounts -
    generalDiscount;

  return grandTotal > 0 ? grandTotal : 0;
}
