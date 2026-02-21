/**
 * Auto-Categorization Engine
 *
 * Simple keyword matching to auto-assign expense categories to Plaid transactions.
 */

/**
 * Auto-categorize a transaction based on merchant name and Plaid's category
 * @returns Expense category name or null if no match
 */
export function autoCategorize(
  merchantName: string,
  plaidCategory: string[]
): string | null {
  const merchant = merchantName.toLowerCase();

  // Keyword rules (ordered by specificity)
  if (
    merchant.includes('home depot') ||
    merchant.includes('lowes') ||
    merchant.includes('ace hardware') ||
    merchant.includes('hardware')
  ) {
    return 'Repairs & Maintenance';
  }

  if (
    merchant.includes('walmart') ||
    merchant.includes('target') ||
    merchant.includes('costco') ||
    merchant.includes('amazon') ||
    merchant.includes('sam\'s club')
  ) {
    return 'Supplies';
  }

  if (
    merchant.includes('comcast') ||
    merchant.includes('at&t') ||
    merchant.includes('verizon') ||
    merchant.includes('duke energy') ||
    merchant.includes('pg&e') ||
    merchant.includes('electric') ||
    merchant.includes('utility') ||
    merchant.includes('water') ||
    merchant.includes('gas company')
  ) {
    return 'Utilities';
  }

  if (
    merchant.includes('state farm') ||
    merchant.includes('allstate') ||
    merchant.includes('geico') ||
    merchant.includes('progressive') ||
    merchant.includes('insurance')
  ) {
    return 'Insurance';
  }

  if (
    merchant.includes('mcdonald') ||
    merchant.includes('subway') ||
    merchant.includes('grocery') ||
    merchant.includes('food') ||
    merchant.includes('restaurant') ||
    merchant.includes('safeway') ||
    merchant.includes('kroger') ||
    merchant.includes('whole foods')
  ) {
    return 'Food';
  }

  // Fallback: use Plaid's category
  const categoryStr = plaidCategory.join(' ').toLowerCase();

  if (categoryStr.includes('utilities') || categoryStr.includes('utility')) {
    return 'Utilities';
  }
  if (categoryStr.includes('insurance')) {
    return 'Insurance';
  }
  if (categoryStr.includes('food') || categoryStr.includes('restaurant')) {
    return 'Food';
  }
  if (categoryStr.includes('home') || categoryStr.includes('maintenance')) {
    return 'Repairs & Maintenance';
  }
  if (categoryStr.includes('supplies') || categoryStr.includes('shopping')) {
    return 'Supplies';
  }

  return null;
}

/**
 * Resolve category name to category ID from org's categories
 * @returns Category ID or null if no match
 */
export function resolveCategory(
  categoryName: string,
  orgCategories: { id: string; name: string }[]
): string | null {
  const searchName = categoryName.toLowerCase().trim();

  // Exact match
  const exact = orgCategories.find(
    (c) => c.name.toLowerCase().trim() === searchName
  );
  if (exact) return exact.id;

  // Partial match
  const partial = orgCategories.find((c) =>
    c.name.toLowerCase().includes(searchName)
  );
  if (partial) return partial.id;

  return null;
}
