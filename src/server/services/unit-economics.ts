export interface UnitEconomicsInputs {
  starting_customers?: number;
  churned_customers?: number;
  starting_mrr?: number;
  churned_mrr?: number;
  total_mrr?: number;
  active_customers?: number;
  gross_margin_percent?: number; // e.g. 0.80 for 80%
  sales_and_marketing_spend?: number;
  new_customers_acquired?: number;
}

export interface UnitEconomicsOutputs {
  logo_churn_rate?: number; // decimal (e.g. 0.05 for 5%)
  revenue_churn_rate?: number;
  average_customer_lifetime_months?: number;
  arpu_monthly?: number;
  ltv?: number;
  gross_margin_ltv?: number;
  cac?: number;
  ltv_to_cac_ratio?: number;
  payback_period_months?: number;
  missing_inputs: string[];
  notes: string[];
}

export function calculateUnitEconomics(inputs: UnitEconomicsInputs): UnitEconomicsOutputs {
  const missing: string[] = [];
  const notes: string[] = [];

  // Check required inputs for each calculation
  let logoChurnRate: number | undefined;
  if (inputs.starting_customers !== undefined && inputs.churned_customers !== undefined) {
    if (inputs.starting_customers <= 0) {
      notes.push('Starting customers must be greater than zero to compute logo churn.');
    } else {
      logoChurnRate = inputs.churned_customers / inputs.starting_customers;
    }
  } else {
    if (inputs.starting_customers === undefined) missing.push('starting_customers');
    if (inputs.churned_customers === undefined) missing.push('churned_customers');
  }

  let revenueChurnRate: number | undefined;
  if (inputs.starting_mrr !== undefined && inputs.churned_mrr !== undefined) {
    if (inputs.starting_mrr <= 0) {
      notes.push('Starting MRR must be greater than zero to compute revenue churn.');
    } else {
      revenueChurnRate = inputs.churned_mrr / inputs.starting_mrr;
    }
  } else {
    if (inputs.starting_mrr === undefined) missing.push('starting_mrr');
    if (inputs.churned_mrr === undefined) missing.push('churned_mrr');
  }

  let averageCustomerLifetimeMonths: number | undefined;
  if (logoChurnRate !== undefined) {
    if (logoChurnRate > 0) {
      averageCustomerLifetimeMonths = 1 / logoChurnRate;
    } else {
      notes.push('Logo churn is 0%; average customer lifetime cannot be bounded without non-zero churn.');
    }
  }

  let arpuMonthly: number | undefined;
  if (inputs.total_mrr !== undefined && inputs.active_customers !== undefined) {
    if (inputs.active_customers <= 0) {
      notes.push('Active customers must be greater than zero to compute ARPU.');
    } else {
      arpuMonthly = inputs.total_mrr / inputs.active_customers;
    }
  } else {
    if (inputs.total_mrr === undefined) missing.push('total_mrr');
    if (inputs.active_customers === undefined) missing.push('active_customers');
  }

  let ltv: number | undefined;
  if (arpuMonthly !== undefined && averageCustomerLifetimeMonths !== undefined) {
    ltv = arpuMonthly * averageCustomerLifetimeMonths;
  }

  let grossMarginLtv: number | undefined;
  if (ltv !== undefined && inputs.gross_margin_percent !== undefined) {
    grossMarginLtv = ltv * inputs.gross_margin_percent;
  } else if (inputs.gross_margin_percent === undefined) {
    missing.push('gross_margin_percent');
  }

  let cac: number | undefined;
  if (inputs.sales_and_marketing_spend !== undefined && inputs.new_customers_acquired !== undefined) {
    if (inputs.new_customers_acquired <= 0) {
      notes.push('New customers acquired must be greater than zero to compute CAC.');
    } else {
      cac = inputs.sales_and_marketing_spend / inputs.new_customers_acquired;
    }
  } else {
    if (inputs.sales_and_marketing_spend === undefined) missing.push('sales_and_marketing_spend');
    if (inputs.new_customers_acquired === undefined) missing.push('new_customers_acquired');
  }

  let ltvToCacRatio: number | undefined;
  const ltvForRatio = grossMarginLtv ?? ltv;
  if (ltvForRatio !== undefined && cac !== undefined) {
    if (cac > 0) {
      ltvToCacRatio = ltvForRatio / cac;
    } else {
      notes.push('CAC is zero; LTV/CAC ratio is infinite.');
    }
  }

  let paybackPeriodMonths: number | undefined;
  if (cac !== undefined && arpuMonthly !== undefined) {
    const margin = inputs.gross_margin_percent ?? 1.0;
    const monthlyGrossProfitPerUser = arpuMonthly * margin;
    if (monthlyGrossProfitPerUser > 0) {
      paybackPeriodMonths = cac / monthlyGrossProfitPerUser;
    }
  }

  // Deduplicate missing fields
  const uniqueMissing = Array.from(new Set(missing));

  return {
    logo_churn_rate: logoChurnRate !== undefined ? Math.round(logoChurnRate * 10000) / 10000 : undefined,
    revenue_churn_rate: revenueChurnRate !== undefined ? Math.round(revenueChurnRate * 10000) / 10000 : undefined,
    average_customer_lifetime_months: averageCustomerLifetimeMonths !== undefined ? Math.round(averageCustomerLifetimeMonths * 10) / 10 : undefined,
    arpu_monthly: arpuMonthly !== undefined ? Math.round(arpuMonthly * 100) / 100 : undefined,
    ltv: ltv !== undefined ? Math.round(ltv * 100) / 100 : undefined,
    gross_margin_ltv: grossMarginLtv !== undefined ? Math.round(grossMarginLtv * 100) / 100 : undefined,
    cac: cac !== undefined ? Math.round(cac * 100) / 100 : undefined,
    ltv_to_cac_ratio: ltvToCacRatio !== undefined ? Math.round(ltvToCacRatio * 100) / 100 : undefined,
    payback_period_months: paybackPeriodMonths !== undefined ? Math.round(paybackPeriodMonths * 10) / 10 : undefined,
    missing_inputs: uniqueMissing,
    notes
  };
}
