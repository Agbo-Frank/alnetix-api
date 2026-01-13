// Fee configuration
export const COMMISSION_CONSTANTS = {
  // Referral program percentage
  referral: 100, // 100%

  // Affiliate commission percentages
  direct: 8, // 8% for level 1 (direct)
  indirect: 2, // 2% for level 2+ (indirect)

  // Maximum depth for affiliate commission distribution
  AFFILIATE_LEVEL_DEPTH: 6,

  // Kickback percentages (for future use)
  kickback: {
    basic: 10, // 10%
    plus: 20, // 20%
    pro: 50, // 50%
    proplus: 100, // 100%
  },
} as const;
