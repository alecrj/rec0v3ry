/**
 * Auto-Categorization Engine
 *
 * Maps merchant names to expense categories using pattern matching.
 * Learns from org-specific merchant→category assignments.
 */

export interface CategoryMatch {
  categoryName: string;
  confidence: 'high' | 'medium' | 'low';
}

/**
 * Default merchant patterns → category name
 * Patterns are matched case-insensitively as substrings of merchant name
 */
const DEFAULT_PATTERNS: Array<{ patterns: string[]; category: string }> = [
  // Repairs & Maintenance
  {
    patterns: ['home depot', 'lowe\'s', 'lowes', 'ace hardware', 'true value', 'menards', 'fastenal', 'grainger'],
    category: 'Repairs & Maintenance',
  },
  // Supplies
  {
    patterns: ['walmart', 'target', 'amazon', 'costco', 'sam\'s club', 'sams club', 'dollar general', 'dollar tree', 'five below', 'dollar store', 'office depot', 'staples'],
    category: 'Supplies',
  },
  // Food & Groceries
  {
    patterns: ['kroger', 'safeway', 'publix', 'whole foods', 'trader joe', 'aldi', 'food lion', 'heb', 'wegmans', 'meijer', 'stop & shop', 'giant', 'sprouts', 'winco', 'winn-dixie', 'king soopers', 'smith\'s', 'fry\'s', 'ralphs'],
    category: 'Food & Groceries',
  },
  // Utilities
  {
    patterns: ['duke energy', 'at&t', 'comcast', 'xfinity', 'verizon', 't-mobile', 'sprint', 'entergy', 'dominion energy', 'pge', 'pg&e', 'national grid', 'con edison', 'coned', 'ameren', 'consumers energy', 'centerpoint', 'aep', 'eversource', 'southern company', 'georgia power', 'florida power', 'clearwater gas', 'piedmont natural gas', 'spectrum', 'cox communications', 'cox cable', 'directv', 'dish network'],
    category: 'Utilities',
  },
  // Insurance
  {
    patterns: ['state farm', 'geico', 'allstate', 'progressive', 'farmers', 'usaa', 'liberty mutual', 'travelers', 'nationwide', 'hartford'],
    category: 'Insurance',
  },
  // Transportation
  {
    patterns: ['chevron', 'shell', 'bp', 'exxon', 'mobil', 'valero', 'sunoco', 'marathon', 'speedway', 'circle k', 'wawa', 'gas station', 'uber', 'lyft', 'enterprise rent', 'hertz', 'avis'],
    category: 'Transportation',
  },
  // Medical & Health
  {
    patterns: ['cvs', 'walgreens', 'rite aid', 'pharmacy', 'urgent care', 'hospital', 'medical', 'clinic', 'dr ', 'doctor', 'health'],
    category: 'Medical & Health',
  },
  // Professional Services
  {
    patterns: ['law office', 'attorney', 'cpa', 'accountant', 'consulting', 'legal'],
    category: 'Professional Services',
  },
  // Subscriptions / Software
  {
    patterns: ['google', 'microsoft', 'adobe', 'dropbox', 'slack', 'zoom', 'quickbooks', 'intuit', 'github', 'aws', 'netlify', 'vercel'],
    category: 'Software & Subscriptions',
  },
];

/**
 * Attempt to auto-categorize a merchant name using default patterns.
 * Returns null if no confident match is found.
 */
export function autoCategorizeMerchant(merchantName: string): CategoryMatch | null {
  if (!merchantName) return null;

  const normalized = merchantName.toLowerCase().trim();

  for (const rule of DEFAULT_PATTERNS) {
    for (const pattern of rule.patterns) {
      if (normalized.includes(pattern.toLowerCase())) {
        return {
          categoryName: rule.category,
          confidence: 'high',
        };
      }
    }
  }

  return null;
}

/**
 * Given a Plaid transaction name, extract a cleaner merchant name.
 * Plaid names often have suffixes like "WALMART STORE #2345 DALLAS TX"
 */
export function extractMerchantName(plaidName: string): string {
  if (!plaidName) return '';

  // Remove trailing location/store info: "# 1234", "STORE #2345", "DALLAS TX", etc.
  let clean = plaidName
    .replace(/#\s*\d+/g, '') // Remove # followed by numbers
    .replace(/\s+\d{5}(-\d{4})?$/g, '') // Remove zip codes at end
    .replace(/\b[A-Z]{2}\b\s*$/g, '') // Remove 2-letter state at end
    .replace(/\s{2,}/g, ' ') // Collapse multiple spaces
    .trim();

  // Title case
  clean = clean
    .split(' ')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');

  return clean;
}

/**
 * Default category names to seed for new orgs.
 * Note: is_default maps to the schema's is_default column.
 */
export const DEFAULT_CATEGORIES = [
  { name: 'Repairs & Maintenance', color: '#F59E0B' },
  { name: 'Supplies', color: '#3B82F6' },
  { name: 'Food & Groceries', color: '#10B981' },
  { name: 'Utilities', color: '#8B5CF6' },
  { name: 'Insurance', color: '#EF4444' },
  { name: 'Transportation', color: '#F97316' },
  { name: 'Medical & Health', color: '#EC4899' },
  { name: 'Professional Services', color: '#6366F1' },
  { name: 'Software & Subscriptions', color: '#14B8A6' },
  { name: 'Other', color: '#6B7280' },
];
