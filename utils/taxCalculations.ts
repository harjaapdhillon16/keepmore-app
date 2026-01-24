export type TaxBracket = {
  min: number
  max: number
  rate: number
}

export const US_TAX_BRACKETS = {
  single: [
    { min: 0, max: 11600, rate: 0.1 },
    { min: 11600, max: 47150, rate: 0.12 },
    { min: 47150, max: 100525, rate: 0.22 },
    { min: 100525, max: 191950, rate: 0.24 },
    { min: 191950, max: 243725, rate: 0.32 },
    { min: 243725, max: 609350, rate: 0.35 },
    { min: 609350, max: Number.POSITIVE_INFINITY, rate: 0.37 },
  ],
} as const

export const CA_FEDERAL_TAX = {
  brackets: [
    { min: 0, max: 53359, rate: 0.15 },
    { min: 53359, max: 106717, rate: 0.205 },
    { min: 106717, max: 165430, rate: 0.26 },
    { min: 165430, max: 235675, rate: 0.29 },
    { min: 235675, max: Number.POSITIVE_INFINITY, rate: 0.33 },
  ],
} as const

export function calculateBracketTax(income: number, brackets: TaxBracket[]) {
  return brackets.reduce((total, bracket) => {
    if (income <= bracket.min) return total
    const taxable = Math.min(income, bracket.max) - bracket.min
    return total + taxable * bracket.rate
  }, 0)
}

export function estimateUsFederalTax(income: number) {
  return calculateBracketTax(income, [...US_TAX_BRACKETS.single])
}

export function estimateCanadaFederalTax(income: number) {
  return calculateBracketTax(income, [...CA_FEDERAL_TAX.brackets])
}
