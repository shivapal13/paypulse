export enum PlanTier {
  BASIC = 'BASIC',
  PRO = 'PRO',
  ENTERPRISE = 'ENTERPRISE',
}

export const PLAN_PRICES: Record<PlanTier, number> = {
  [PlanTier.BASIC]: 10,
  [PlanTier.PRO]: 30,
  [PlanTier.ENTERPRISE]: 100,
};
