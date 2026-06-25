// Cálculo do custo hora-homem de um colaborador.
// Considera o tipo de vínculo (CLT x MEI/PJ) e o regime tributário da empresa.
// Função pura — fácil de testar e reutilizar (OS hoje, orçamento amanhã).

export type EmploymentType = "clt" | "mei_pj";

export interface Additional {
  name: string;
  value: number;
  incides_charges: boolean; // adicional salarial (insalubridade/periculosidade) incide encargos
}

export interface LaborCostInput {
  employmentType: EmploymentType;
  baseSalary: number; // salário (CLT) ou valor mensal da nota (MEI/PJ)
  monthlyHours: number; // carga horária mensal (divisor)
  additionals: Additional[];
  benefitMeal: number;
  benefitFood: number;
  benefitTransport: number;
  benefitFuel: number;
}

// INSS patronal estimado (INSS 20% + RAT médio + terceiros/Sistema S).
// Só incide fora do Simples Nacional. Valor médio configurável.
export const EMPLOYER_INSS_RATE = 0.278;
export const FGTS_RATE = 0.08;

export interface LaborCostResult {
  benefitsTotal: number;
  additionalsCharged: number; // adicionais que incidem encargos
  additionalsExempt: number; // adicionais que não incidem
  remunerationBase: number; // base de encargos = salário + adicionais que incidem
  thirteenth: number;
  vacation: number;
  vacationThird: number;
  fgts: number;
  employerInss: number;
  chargesTotal: number; // soma de todos os encargos provisionados
  monthlyCost: number; // custo mensal total
  hourlyCost: number; // custo hora-homem
}

const round2 = (n: number) => Math.round(n * 100) / 100;

export function computeLaborCost(
  input: LaborCostInput,
  isSimplesNacional: boolean,
): LaborCostResult {
  const additionals = input.additionals ?? [];
  const additionalsCharged = additionals
    .filter((a) => a.incides_charges)
    .reduce((s, a) => s + (Number(a.value) || 0), 0);
  const additionalsExempt = additionals
    .filter((a) => !a.incides_charges)
    .reduce((s, a) => s + (Number(a.value) || 0), 0);

  const benefitsTotal =
    (Number(input.benefitMeal) || 0) +
    (Number(input.benefitFood) || 0) +
    (Number(input.benefitTransport) || 0) +
    (Number(input.benefitFuel) || 0);

  const base = Number(input.baseSalary) || 0;

  // MEI/PJ: sem encargos trabalhistas. Custo = valor pago + benefícios acordados.
  if (input.employmentType === "mei_pj") {
    const monthlyCost =
      base + additionalsCharged + additionalsExempt + benefitsTotal;
    const hours = Number(input.monthlyHours) || 0;
    return {
      benefitsTotal,
      additionalsCharged,
      additionalsExempt,
      remunerationBase: base + additionalsCharged + additionalsExempt,
      thirteenth: 0,
      vacation: 0,
      vacationThird: 0,
      fgts: 0,
      employerInss: 0,
      chargesTotal: 0,
      monthlyCost: round2(monthlyCost),
      hourlyCost: hours > 0 ? round2(monthlyCost / hours) : 0,
    };
  }

  // CLT: encargos provisionados sobre a base remuneratória.
  const remunerationBase = base + additionalsCharged;
  const thirteenth = remunerationBase / 12;
  const vacation = remunerationBase / 12;
  const vacationThird = vacation / 3;

  // FGTS incide sobre remuneração + 13º + férias + 1/3.
  const fgtsBase = remunerationBase + thirteenth + vacation + vacationThird;
  const fgts = fgtsBase * FGTS_RATE;

  // INSS patronal só fora do Simples Nacional.
  const employerInss = isSimplesNacional ? 0 : fgtsBase * EMPLOYER_INSS_RATE;

  const chargesTotal =
    thirteenth + vacation + vacationThird + fgts + employerInss;

  const monthlyCost =
    base +
    additionalsCharged +
    additionalsExempt +
    chargesTotal +
    benefitsTotal;
  const hours = Number(input.monthlyHours) || 0;

  return {
    benefitsTotal,
    additionalsCharged,
    additionalsExempt,
    remunerationBase,
    thirteenth: round2(thirteenth),
    vacation: round2(vacation),
    vacationThird: round2(vacationThird),
    fgts: round2(fgts),
    employerInss: round2(employerInss),
    chargesTotal: round2(chargesTotal),
    monthlyCost: round2(monthlyCost),
    hourlyCost: hours > 0 ? round2(monthlyCost / hours) : 0,
  };
}
