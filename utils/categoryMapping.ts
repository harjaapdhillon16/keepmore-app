export const CATEGORIES = {
  BUSINESS: [
    'Office Supplies',
    'Software and Tools',
    'Professional Services',
    'Marketing and Advertising',
    'Travel (Business)',
    'Meals (Business)',
    'Home Office',
    'Equipment',
  ],
  PERSONAL: [
    'Housing',
    'Transportation',
    'Food and Dining',
    'Shopping',
    'Entertainment',
    'Health and Fitness',
    'Utilities',
    'Insurance',
    'Education',
    'Personal Care',
    'Subscriptions',
    'Miscellaneous',
  ],
  INVESTMENT: [
    'Stock Purchase',
    'Stock Sale',
    'Dividend Income',
    'Interest Income',
    'Capital Gains',
    'Capital Losses',
  ],
} as const

export type CategoryGroup = keyof typeof CATEGORIES

export function getAllCategories() {
  return Object.values(CATEGORIES).flat()
}
