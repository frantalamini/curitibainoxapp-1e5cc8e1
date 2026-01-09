/**
 * Utilitários para manipulação de datas com timezone correto (America/Sao_Paulo).
 */

/**
 * Parseia uma string de data (yyyy-MM-dd) como data LOCAL, não UTC.
 * 
 * Problema: new Date("2026-01-08") interpreta como UTC midnight,
 * que em São Paulo (UTC-3) vira 07/01 às 21:00.
 * 
 * Solução: Anexar T00:00:00 (sem Z) força interpretação local.
 * 
 * @param dateString - Data no formato "yyyy-MM-dd" ou timestamp completo
 * @returns Date object interpretado como horário local
 */
export function parseLocalDate(dateString: string): Date {
  if (!dateString) return new Date();
  
  // Se já tem 'T', é um timestamp completo - não modificar
  if (dateString.includes("T")) {
    return new Date(dateString);
  }
  
  // Anexar T00:00:00 para forçar interpretação como horário local
  return new Date(dateString + "T00:00:00");
}
