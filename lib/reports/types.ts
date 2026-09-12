import { ReportPeriod } from './date-utils';

export interface ReportFilterParams {
  period?: ReportPeriod | string | null;
  startDate?: string | null;
  endDate?: string | null;
  stationId?: string | null;
}

export interface ActivePeriodInfo {
  startDateStr: string;
  endDateStr: string;
  label: string;
  period: ReportPeriod;
  selectedStationId: string;
  selectedStationName: string;
}

// 1. Executive Summary
export interface ExecutiveReportData {
  production: {
    rawReceivedKg: number;
    rawProcessedKg: number;
    finishedProducedKg: number;
    operationsCount: number;
    avgYieldPct: number;
  };
  waste: {
    wasteKg: number;
    wasteCostEgp: number;
    wasteRatePct: number;
  };
  shipments: {
    count: number;
    shippedQtyKg: number;
    revenueEgp: number;
    totalCostEgp: number;
    netProfitEgp: number;
    avgMarginPct: number;
  };
  financials: {
    cashInflowEgp: number;
    cashOutflowEgp: number;
    netCashMovementEgp: number;
    totalExpensesEgp: number;
    totalCollectionsEgp: number;
    totalPaymentsEgp: number;
    totalArOutstandingEgp: number;
    totalApOutstandingEgp: number;
  };
  comparison: {
    productionKgChangePct: number;
    wasteKgChangePct: number;
    revenueChangePct: number;
    profitChangePct: number;
  };
}

// 2. Production
export interface StationProductionMetric {
  stationId: string;
  stationName: string;
  rawInputKg: number;
  finishedOutputKg: number;
  wasteKg: number;
  yieldPct: number;
  operationsCount: number;
  totalCostEgp: number;
  costPerKg: number;
}

export interface ProductProductionMetric {
  productName: string;
  outputKg: number;
  operationsCount: number;
  totalCostEgp: number;
  avgCostPerKg: number;
}

export interface ProductionReportData {
  totalRawReceivedKg: number;
  totalRawProcessedKg: number;
  totalFinishedProducedKg: number;
  overallYieldPct: number;
  totalWasteKg: number;
  operationsCount: number;
  totalProductionCostEgp: number;
  avgCostPerKg: number;
  stationBreakdown: StationProductionMetric[];
  productBreakdown: ProductProductionMetric[];
  trend: Array<{ dateLabel: string; outputKg: number; inputKg: number }>;
}

// 3. Inventory
export interface InventoryCategorySummary {
  category: 'RAW' | 'FINISHED' | 'SUPPLIES';
  nameAr: string;
  openingQty: number;
  inflowQty: number;
  outflowQty: number;
  closingQty: number;
  unit: string;
  movementsCount: number;
}

export interface InventoryReportData {
  categories: InventoryCategorySummary[];
  recentMovements: Array<{
    movementNo: string;
    date: string;
    movementType: string;
    itemType: string;
    productOrBatch: string;
    qty: number;
    unit: string;
    stationName: string;
  }>;
}

// 4. Procurement
export interface SupplierProcurementMetric {
  supplierId: string;
  supplierName: string;
  supplierType: string;
  batchesCount: number;
  totalQtyKg: number;
  totalSpendEgp: number;
  avgPricePerKg: number;
  shareOfSpendPct: number;
}

export interface ProcurementReportData {
  totalRawSpendEgp: number;
  totalRawQtyKg: number;
  avgRawPricePerKg: number;
  totalSuppliesSpendEgp: number;
  totalPurchasesSpendEgp: number;
  suppliers: SupplierProcurementMetric[];
  topSupplierByVolume: { name: string; qtyKg: number } | null;
  topSupplierBySpend: { name: string; spendEgp: number } | null;
}

// 5. Sales & Export
export interface CustomerSalesMetric {
  customerId: string;
  customerName: string;
  country: string;
  shipmentsCount: number;
  totalQtyKg: number;
  totalRevenueEgp: number;
  totalProfitEgp: number;
  avgMarginPct: number;
}

export interface SalesReportData {
  shipmentsCount: number;
  totalShippedKg: number;
  totalRevenueEgp: number;
  totalRevenueEur: number;
  totalProfitEgp: number;
  avgMarginPct: number;
  customers: CustomerSalesMetric[];
  countriesBreakdown: Array<{ country: string; qtyKg: number; revenueEgp: number; shipmentsCount: number }>;
  productsBreakdown: Array<{ productName: string; qtyKg: number; revenueEgp: number }>;
}

// 6. Financial
export interface TreasuryCurrencyBalance {
  currency: string;
  accountsCount: number;
  totalBalance: number;
  inflow: number;
  outflow: number;
  netMovement: number;
  accounts: Array<{ id: string; name: string; type: string; balance: number }>;
}

export interface FinancialReportData {
  receivables: {
    totalBilledEgp: number;
    collectedEgp: number;
    remainingEgp: number;
  };
  payables: {
    totalObligationsEgp: number;
    paidEgp: number;
    remainingEgp: number;
  };
  cashFlow: {
    inflowEgp: number;
    outflowEgp: number;
    netCashEgp: number;
  };
  expenses: {
    totalExpensesEgp: number;
    categories: Array<{ name: string; amountEgp: number }>;
  };
  treasuryByCurrency: TreasuryCurrencyBalance[];
}

// 7. Station Benchmark
export interface StationPerformanceItem {
  stationId: string;
  stationName: string;
  location: string;
  rawReceivedKg: number;
  rawProcessedKg: number;
  finishedProducedKg: number;
  wasteKg: number;
  wasteRatePct: number;
  yieldPct: number;
  costPerKg: number;
  operationsCount: number;
  currentFinishedStockKg: number;
  currentRawStockKg: number;
  benchmarkStatus: 'EXCELLENT' | 'NORMAL' | 'CRITICAL';
  benchmarkReason: string;
}

// 8. Management Insights
export interface ManagementInsight {
  id: string;
  category: 'WASTE' | 'PROCUREMENT' | 'PRODUCTION' | 'FINANCIAL' | 'INVENTORY' | 'SUPPLIER';
  title: string;
  description: string;
  severity: 'INFO' | 'WARNING' | 'ALERT';
  metricHighlight?: string;
  actionRecommendation?: string;
}

// 9. Monthly Trends (for Annual/Yearly Analysis)
export interface MonthlyTrendMetric {
  monthIndex: number;
  monthName: string;
  year: number;
  rawReceivedKg: number;
  rawProcessedKg: number;
  finishedProducedKg: number;
  wasteKg: number;
  wasteRatePct: number;
  operationsCount: number;
  shippedQtyKg: number;
  revenueEgp: number;
  revenueEur: number;
  cashInflowEgp: number;
  cashOutflowEgp: number;
  netCashEgp: number;
  totalExpensesEgp: number;
  hasActivity: boolean;
}

// 10. Metric Comparison Structure
export interface MetricComparisonItem {
  metricKey: string;
  nameAr: string;
  currentValue: number;
  previousValue: number;
  diff: number;
  pctChange: number;
  direction: 'UP' | 'DOWN' | 'EQUAL';
  unit: string;
  formatType: 'number' | 'currency' | 'percent';
  isPositiveForBusiness: boolean;
}

// 11. Station Rankings Structure
export interface StationRankings {
  highestProductionStation: { name: string; value: number; unit: string } | null;
  highestYieldStation: { name: string; value: number; unit: string } | null;
  highestWasteStation: { name: string; value: number; unit: string } | null;
  lowestCostStation: { name: string; value: number; unit: string } | null;
  highestSpendStation: { name: string; value: number; unit: string } | null;
}

// 12. Narrative Alert Structure
export interface NarrativeAlert {
  id: string;
  type: 'WASTE' | 'PRODUCTION' | 'FINANCIAL' | 'INVENTORY' | 'STATION' | 'SUPPLIER';
  severity: 'CRITICAL' | 'WARNING' | 'INFO';
  title: string;
  description: string;
  metricName: string;
  currentValue: string;
  previousValue?: string;
  changeValue?: string;
  actionRecommendation: string;
}

// 13. Complete Narrative Management Report
export interface NarrativeReportData {
  periodType: 'weekly' | 'monthly' | 'yearly' | 'custom';
  periodLabel: string;
  startDateStr: string;
  endDateStr: string;
  stationId: string;
  stationName: string;
  isStationFiltered: boolean;
  hasData: boolean;
  dataAvailability: 'FULL' | 'PARTIAL' | 'EMPTY';
  generatedAt: string;

  // Written Narrative Sections
  executiveSummary: string;
  operationalNarrative: string;
  financialNarrative: string;
  comparisonNarrative: string;
  stationNarrative: string;
  monthlyTrendsNarrative?: string;

  // Structured Lists
  keyObservations: string[];
  alerts: NarrativeAlert[];
  recommendations: string[];
  comparisons: MetricComparisonItem[];
  stationRankings: StationRankings;
  monthlyTrends: MonthlyTrendMetric[];

  // Underlying Raw Hub Data
  rawHubData: CompleteReportHubData;
}

// Comprehensive Report Hub Data
export interface CompleteReportHubData {
  activePeriod: ActivePeriodInfo;
  executive: ExecutiveReportData;
  production: ProductionReportData;
  waste: any; // Task 9 result
  inventory: InventoryReportData;
  procurement: ProcurementReportData;
  sales: SalesReportData;
  financial: FinancialReportData;
  stations: StationPerformanceItem[];
  insights: ManagementInsight[];
  monthlyTrends?: MonthlyTrendMetric[];
}
