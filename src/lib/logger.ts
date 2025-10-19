/**
 * Smart logger que desativa logs em produção automaticamente
 * Mantém console.error sempre ativo para tracking crítico
 */
const isProduction = import.meta.env.PROD;

export const logger = {
  log: (...args: any[]) => {
    if (!isProduction) {
      console.log(...args);
    }
  },
  
  error: (...args: any[]) => {
    // Errors sempre visíveis, mesmo em produção
    console.error(...args);
  },
  
  warn: (...args: any[]) => {
    if (!isProduction) {
      console.warn(...args);
    }
  },
  
  debug: (...args: any[]) => {
    if (!isProduction) {
      console.debug(...args);
    }
  },
};
