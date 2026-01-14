// Fee configuration
export const COMMISSION_CONSTANTS = {
  // Referral program percentage
  referral: 100, // 100%

  // Affiliate commission percentages
  direct: 8, // 8% for level 1 (direct)
  indirect: 2, // 2% for level 2+ (indirect)

  // Maximum depth for affiliate commission distribution
  AFFILIATE_LEVEL_DEPTH: 2,
  levels: {
    "1": 15,
    "2": 5,
  }
} as const;
