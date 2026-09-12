/**
 * lib/reports/narrative-engine.ts
 *
 * Central Deterministic Narrative Generation Engine for EcoFresh ERP.
 * Generates natural Arabic executive management reports for:
 * 1. Weekly Reports (التقرير الأسبوعي)
 * 2. Monthly Reports (التقرير الشهري)
 * 3. Yearly Reports (التقرير السنوي)
 * 4. Custom Period Reports (تقارير الفترات المخصصة)
 *
 * Core Architecture Rules:
 * - 100% Deterministic: All numerical facts come strictly from pre-computed ERP metrics.
 * - Multi-Currency Safety: EGP, EUR, USD are kept strictly separated.
 * - Station-Scope Aware: Reflects single-station filters accurately.
 * - Objective Facts: States WHAT happened without fabricating causal claims (WHY).
 * - Zero/Null Safe: Never outputs NaN%, Infinity%, or undefined.
 * - Conservative Recommendations: Actionable management suggestions based on observed facts.
 */

import { formatCurrency } from '@/lib/currency';
import {
  CompleteReportHubData,
  NarrativeReportData,
  NarrativeAlert,
  MetricComparisonItem,
  StationRankings,
  MonthlyTrendMetric,
} from './types';

export function generateNarrativeReport(hubData: CompleteReportHubData): NarrativeReportData {
  const {
    activePeriod,
    executive,
    production,
    waste,
    inventory,
    procurement,
    sales,
    financial,
    stations,
    insights,
    monthlyTrends = [],
  } = hubData;

  const isStationFiltered = activePeriod.selectedStationId !== 'all';
  const stationScopeName = isStationFiltered ? activePeriod.selectedStationName : 'كافة المحطات التابعة للشركة';
  const periodType = activePeriod.period;
  const periodLabel = activePeriod.label;

  // -------------------------------------------------------------
  // 1. DATA AVAILABILITY ASSESSMENT
  // -------------------------------------------------------------
  const totalOps = production.operationsCount;
  const totalRawRec = production.totalRawReceivedKg;
  const totalFgProduced = production.totalFinishedProducedKg;
  const totalShipmentsCount = sales.shipmentsCount;
  const totalCashIn = financial.cashFlow.inflowEgp;
  const totalCashOut = financial.cashFlow.outflowEgp;

  const hasOperationalData = totalOps > 0 || totalRawRec > 0 || totalFgProduced > 0;
  const hasSalesData = totalShipmentsCount > 0;
  const hasFinancialData = totalCashIn > 0 || totalCashOut > 0 || financial.payables.paidEgp > 0;
  const hasData = hasOperationalData || hasSalesData || hasFinancialData;

  let dataAvailability: 'FULL' | 'PARTIAL' | 'EMPTY' = 'EMPTY';
  if (hasOperationalData && hasSalesData && hasFinancialData) {
    dataAvailability = 'FULL';
  } else if (hasData) {
    dataAvailability = 'PARTIAL';
  }

  // Helper formatters
  const fmtKg = (kg: number) => `${Math.round(kg).toLocaleString('en-US')} كجم`;
  const fmtTon = (kg: number) => `${(kg / 1000).toFixed(2)} طن`;
  const fmtEgp = (amt: number) => formatCurrency(amt);
  const fmtEur = (amt: number) => `€${Math.round(amt).toLocaleString('en-US')}`;
  const fmtPct = (pct: number) => `${pct.toFixed(1)}%`;

  // -------------------------------------------------------------
  // 2. PERIOD COMPARISON METRICS (Deterministic)
  // -------------------------------------------------------------
  const comparisons: MetricComparisonItem[] = [
    {
      metricKey: 'production',
      nameAr: 'المنتج التام المصنع',
      currentValue: production.totalFinishedProducedKg,
      previousValue: Math.round(
        production.totalFinishedProducedKg / (1 + (executive.comparison.productionKgChangePct || 0) / 100)
      ),
      diff: Math.round(
        production.totalFinishedProducedKg -
          production.totalFinishedProducedKg / (1 + (executive.comparison.productionKgChangePct || 0) / 100)
      ),
      pctChange: executive.comparison.productionKgChangePct || 0,
      direction:
        (executive.comparison.productionKgChangePct || 0) > 0
          ? 'UP'
          : (executive.comparison.productionKgChangePct || 0) < 0
          ? 'DOWN'
          : 'EQUAL',
      unit: 'كجم',
      formatType: 'number',
      isPositiveForBusiness: true,
    },
    {
      metricKey: 'waste',
      nameAr: 'فاقد وهالك التشغيل',
      currentValue: waste.totalRawWasteKg || 0,
      previousValue: waste.comparison?.prevWasteKg || 0,
      diff: waste.comparison?.qtyDiff || 0,
      pctChange: waste.comparison?.qtyPctChange || 0,
      direction: waste.comparison?.qtyDirection || 'EQUAL',
      unit: 'كجم',
      formatType: 'number',
      isPositiveForBusiness: false,
    },
    {
      metricKey: 'revenue',
      nameAr: 'إيرادات التصدير (EGP)',
      currentValue: sales.totalRevenueEgp,
      previousValue: Math.round(
        sales.totalRevenueEgp / (1 + (executive.comparison.revenueChangePct || 0) / 100)
      ),
      diff: Math.round(
        sales.totalRevenueEgp - sales.totalRevenueEgp / (1 + (executive.comparison.revenueChangePct || 0) / 100)
      ),
      pctChange: executive.comparison.revenueChangePct || 0,
      direction:
        (executive.comparison.revenueChangePct || 0) > 0
          ? 'UP'
          : (executive.comparison.revenueChangePct || 0) < 0
          ? 'DOWN'
          : 'EQUAL',
      unit: 'ج.م',
      formatType: 'currency',
      isPositiveForBusiness: true,
    },
    {
      metricKey: 'profit',
      nameAr: 'صافي أرباح الشحنات (EGP)',
      currentValue: sales.totalProfitEgp,
      previousValue: Math.round(
        sales.totalProfitEgp / (1 + (executive.comparison.profitChangePct || 0) / 100)
      ),
      diff: Math.round(
        sales.totalProfitEgp - sales.totalProfitEgp / (1 + (executive.comparison.profitChangePct || 0) / 100)
      ),
      pctChange: executive.comparison.profitChangePct || 0,
      direction:
        (executive.comparison.profitChangePct || 0) > 0
          ? 'UP'
          : (executive.comparison.profitChangePct || 0) < 0
          ? 'DOWN'
          : 'EQUAL',
      unit: 'ج.م',
      formatType: 'currency',
      isPositiveForBusiness: true,
    },
  ];

  // -------------------------------------------------------------
  // 3. STATION RANKINGS (Deterministic)
  // -------------------------------------------------------------
  let stationRankings: StationRankings = {
    highestProductionStation: null,
    highestYieldStation: null,
    highestWasteStation: null,
    lowestCostStation: null,
    highestSpendStation: null,
  };

  if (stations.length > 0) {
    const activeStationsWithProd = stations.filter((s) => s.finishedProducedKg > 0);
    const activeStationsWithInput = stations.filter((s) => s.rawProcessedKg > 0);

    if (activeStationsWithProd.length > 0) {
      const highestProd = [...activeStationsWithProd].sort((a, b) => b.finishedProducedKg - a.finishedProducedKg)[0];
      stationRankings.highestProductionStation = {
        name: highestProd.stationName,
        value: highestProd.finishedProducedKg,
        unit: 'كجم',
      };

      const lowestCost = [...activeStationsWithProd].filter((s) => s.costPerKg > 0).sort((a, b) => a.costPerKg - b.costPerKg)[0];
      if (lowestCost) {
        stationRankings.lowestCostStation = {
          name: lowestCost.stationName,
          value: lowestCost.costPerKg,
          unit: 'ج.م/كجم',
        };
      }
    }

    if (activeStationsWithInput.length > 0) {
      const highestYield = [...activeStationsWithInput].sort((a, b) => b.yieldPct - a.yieldPct)[0];
      stationRankings.highestYieldStation = {
        name: highestYield.stationName,
        value: highestYield.yieldPct,
        unit: '%',
      };

      const highestWaste = [...activeStationsWithInput].sort((a, b) => b.wasteRatePct - a.wasteRatePct)[0];
      stationRankings.highestWasteStation = {
        name: highestWaste.stationName,
        value: highestWaste.wasteRatePct,
        unit: '%',
      };
    }
  }

  // -------------------------------------------------------------
  // 4. ALERTS & OBSERVATIONS ENGINE
  // -------------------------------------------------------------
  const alerts: NarrativeAlert[] = [];
  const keyObservations: string[] = [];
  const recommendations: string[] = [];

  // Waste Standard Alert (Standard baseline: 20%)
  const standardWasteLimit = waste.standardWastePct || 20.0;
  if (waste.overallWastePct > standardWasteLimit && production.totalRawProcessedKg > 0) {
    alerts.push({
      id: 'ALT-WASTE-01',
      type: 'WASTE',
      severity: 'CRITICAL',
      title: 'تجاوز نسبة الهالك للحد المعياري',
      description: `بلغت نسبة الهالك الإجمالية ${fmtPct(waste.overallWastePct)} متجاوزة الحد المعياري المستهدف (${fmtPct(standardWasteLimit)})، بإجمالي فاقد قدره ${fmtKg(waste.totalRawWasteKg)} وقيمة خسائر تقديرية ${fmtEgp(waste.grandTotalWasteLoss)}.`,
      metricName: 'نسبة الهالك',
      currentValue: fmtPct(waste.overallWastePct),
      previousValue: waste.comparison?.prevWastePct ? fmtPct(waste.comparison.prevWastePct) : undefined,
      changeValue: waste.comparison?.qtyPctChange ? `${waste.comparison.qtyPctChange > 0 ? '+' : ''}${waste.comparison.qtyPctChange}%` : undefined,
      actionRecommendation: 'مراجعة إجراءات فحص الجودة (QC) عند استلام دفعات الفراولة وتدقيق كفاءة سيور الفرز اليدوي.',
    });
    keyObservations.push(`سجلت نسبة الهالك والفاقد ${fmtPct(waste.overallWastePct)} وهي أعلى من المعدل المعياري (${fmtPct(standardWasteLimit)}).`);
    recommendations.push(`إجراء تدقيق رقابي على معايير الفرز في المحطات لتقليل نسبة الهالك إلى الحد المعياري المستهدف (${fmtPct(standardWasteLimit)}).`);
  } else if (production.totalRawProcessedKg > 0) {
    keyObservations.push(`نسبة هالك الفرز والتشغيل مستقرة عند ${fmtPct(waste.overallWastePct)} وضمن الحدود المعيارية المقبولة.`);
  }

  // Production Change Alert/Observation
  if (executive.comparison.productionKgChangePct > 15) {
    alerts.push({
      id: 'ALT-PROD-01',
      type: 'PRODUCTION',
      severity: 'INFO',
      title: 'نمو ملحوظ في حجم الإنتاج التام',
      description: `ارتفع الإنتاج التام المصنع بنسبة +${executive.comparison.productionKgChangePct}% مقارنة بالفترة السابقة، حيث بلغ إجمالي المنتج التام ${fmtKg(production.totalFinishedProducedKg)}.`,
      metricName: 'حجم الإنتاج',
      currentValue: fmtKg(production.totalFinishedProducedKg),
      changeValue: `+${executive.comparison.productionKgChangePct}%`,
      actionRecommendation: 'التنسيق المستمر مع إدارة المبيعات والتصدير لجدولة الحاويات وتفادي امتلاء الطاقة الاستيعابية لثلاجات التجميد.',
    });
    keyObservations.push(`ارتفاع الإنتاج التام بنسبة +${executive.comparison.productionKgChangePct}% بإجمالي ${fmtTon(production.totalFinishedProducedKg)}.`);
  } else if (executive.comparison.productionKgChangePct < -15 && production.totalFinishedProducedKg > 0) {
    alerts.push({
      id: 'ALT-PROD-02',
      type: 'PRODUCTION',
      severity: 'WARNING',
      title: 'انخفاض في حجم الإنتاج مقارنة بالفترة السابقة',
      description: `سجل الإنتاج التام تراجعاً بنسبة ${executive.comparison.productionKgChangePct}% مقارنة بالفترة السابقة بإجمالي إنتاج ${fmtKg(production.totalFinishedProducedKg)}.`,
      metricName: 'حجم الإنتاج',
      currentValue: fmtKg(production.totalFinishedProducedKg),
      changeValue: `${executive.comparison.productionKgChangePct}%`,
      actionRecommendation: 'مراجعة وتيرة توريد المواد الخام وجدول تشغيل المحطات لتعويض معدلات الإنتاج.',
    });
    keyObservations.push(`انخفاض وتيرة الإنتاج بنسبة ${executive.comparison.productionKgChangePct}% مقارنة بالفترة السابقة.`);
    recommendations.push('متابعة خطط توريد الخام من المزارع لضمان استمرارية تشغيل خطوط الإنتاج بالطاقة المخططة.');
  }

  // Critical Station Alert
  const problematicStation = stations.find((s) => s.benchmarkStatus === 'CRITICAL');
  if (problematicStation) {
    alerts.push({
      id: 'ALT-STN-01',
      type: 'STATION',
      severity: 'WARNING',
      title: `ارتفاع ملحوظ في فاقد محطة (${problematicStation.stationName})`,
      description: `سجلت محطة ${problematicStation.stationName} نسبة هالك ${fmtPct(problematicStation.wasteRatePct)} بإجمالي فاقد ${fmtKg(problematicStation.wasteKg)}، مع تكلفة تشغيل قدرها ${problematicStation.costPerKg} ج.م/كجم.`,
      metricName: `هالك ${problematicStation.stationName}`,
      currentValue: fmtPct(problematicStation.wasteRatePct),
      actionRecommendation: `إيفاد فريق مراقبة جودة إلى ${problematicStation.stationName} لمعاينة خطوط الفرز والتأكد من كفاءة العمالة.`,
    });
    recommendations.push(`إجراء مراجعة تشغيلية عاجلة لمحطة (${problematicStation.stationName}) لضبط نسبة الفاقد وتخفيض تكلفة الكيلوجرام.`);
  }

  // Supplier Concentration Alert (35% threshold)
  if (procurement.suppliers.length > 0) {
    const topSupplier = [...procurement.suppliers].sort((a, b) => b.shareOfSpendPct - a.shareOfSpendPct)[0];
    if (topSupplier && topSupplier.shareOfSpendPct >= 35) {
      alerts.push({
        id: 'ALT-SUPP-01',
        type: 'SUPPLIER',
        severity: 'INFO',
        title: `تركز توريدات الخام لدى (${topSupplier.supplierName})`,
        description: `يمثل المورد ${topSupplier.supplierName} ما نسبته ${fmtPct(topSupplier.shareOfSpendPct)} من إجمالي مدفوعات المواد الخام خلال الفترة بقيمة ${fmtEgp(topSupplier.totalSpendEgp)}.`,
        metricName: 'نسبة تركز المورد',
        currentValue: fmtPct(topSupplier.shareOfSpendPct),
        actionRecommendation: 'توسيع قاعدة الموردين والمزارع المعتمدة لتوزيع مخاطر الإمداد واستقرار الأسعار.',
      });
      keyObservations.push(`استحواذ المورد (${topSupplier.supplierName}) على ${fmtPct(topSupplier.shareOfSpendPct)} من إجمالي قيمة مشتريات الخام.`);
      recommendations.push('تنويع شبكة المزارع والموردين لتفادي مخاطر الاعتمادية وتقلبات تسعير المواد الخام.');
    }
  }

  // Financial AR / Liquidity Alerts
  const remainingAr = financial.receivables.remainingEgp;
  if (remainingAr > 500000) {
    alerts.push({
      id: 'ALT-FIN-01',
      type: 'FINANCIAL',
      severity: 'WARNING',
      title: 'مستحقات تصدير قائمة لدى العملاء (AR)',
      description: `يبلغ رصيد الذمم المدينة المستحقة على عملاء التصدير ${fmtEgp(remainingAr)} مقابل إجمالي فواتير تصدير بقيمة ${fmtEgp(financial.receivables.totalBilledEgp)}.`,
      metricName: 'الذمم المدينة القائمة',
      currentValue: fmtEgp(remainingAr),
      actionRecommendation: 'التواصل مع وكلاء التصدير والعملاء لمتابعة استحقاق الحوالات وتسريع وتيرة التدفق النقدي.',
    });
    keyObservations.push(`رصيد مستحقات العملاء القائمة يبلغ ${fmtEgp(remainingAr)} مع سداد وتحصيل ${fmtEgp(financial.receivables.collectedEgp)}.`);
    recommendations.push('متابعة خطط التحصيل للعملاء ذوي الآجال الممتدة لتعزيز السيولة النقدية المتاحة.');
  }

  // Cash Flow Net Movement Observation
  if (financial.cashFlow.inflowEgp > 0 || financial.cashFlow.outflowEgp > 0) {
    const netCash = financial.cashFlow.netCashEgp;
    keyObservations.push(
      `حركة السيولة بالجنيه المصري سجلت مقبوضات بقيمة ${fmtEgp(financial.cashFlow.inflowEgp)} مقابل مدفوعات بقيمة ${fmtEgp(financial.cashFlow.outflowEgp)} (صافي التدفق: ${fmtEgp(netCash)}).`
    );
  }

  // Export Sales Observation
  if (sales.shipmentsCount > 0) {
    keyObservations.push(
      `تم تنفيذ وتصدير ${sales.shipmentsCount} شحنات بإجمالي ${fmtTon(sales.totalShippedKg)} وبإيراد ${fmtEgp(sales.totalRevenueEgp)}${sales.totalRevenueEur > 0 ? ` (€${Math.round(sales.totalRevenueEur).toLocaleString('en-US')})` : ''} وبمتوسط هامش ربح ${fmtPct(sales.avgMarginPct)}.`
    );
  }

  // Default Observation & Recommendation if list is empty
  if (keyObservations.length === 0) {
    keyObservations.push('لم تُسجل أي حركات تشغيلية أو مالية غير اعتيادية خلال الفترة المحددة.');
  }
  if (recommendations.length === 0) {
    recommendations.push('الاستمرار في تطبيق معايير الجودة الحالية ومتابعة برامج الصيانة الدورية لمحطات التبريد.');
  }

  // -------------------------------------------------------------
  // 5. NARRATIVE TEXT GENERATION (Articulate, Professional Arabic)
  // -------------------------------------------------------------
  // Section 1: Executive Summary
  let executiveSummary = '';
  if (!hasData) {
    executiveSummary = `لا تتوفر بيانات تشغيلية أو مالية كافية مسجلة في النظام لـ (${stationScopeName}) خلال الفترة المحددة (${periodLabel}) لإعداد تقرير إداري تفصيلي.`;
  } else {
    const scopePrefix = isStationFiltered ? `بخصوص محطة (${activePeriod.selectedStationName})، ` : 'على مستوى محطات ومرافق الشركة، ';
    executiveSummary = `${scopePrefix}شهدت الفترة الممتدة (${periodLabel}) نشاطاً في العمليات، حيث تم استلام ${fmtTon(production.totalRawReceivedKg)} من المواد الخام الزراعية، وتشغيل ${fmtTon(production.totalRawProcessedKg)} عبر ${production.operationsCount} أوامر تشغيل، مما نتج عنه إنتاج ${fmtTon(production.totalFinishedProducedKg)} من الفراولة المجمدة الصالحة للتصدير بمتوسط نسبة تصافي بلغت ${fmtPct(production.overallYieldPct)}. `;

    if (sales.shipmentsCount > 0) {
      executiveSummary += `وعلى صعيد الصادرات، نُفذت ${sales.shipmentsCount} شحنات تصدير بحمولة إجمالية بلغت ${fmtTon(sales.totalShippedKg)}، محققة إيرادات بقيمة ${fmtEgp(sales.totalRevenueEgp)}${sales.totalRevenueEur > 0 ? ` (ما يعادل ${fmtEur(sales.totalRevenueEur)})` : ''} وصافي أرباح ${fmtEgp(sales.totalProfitEgp)}. `;
    } else {
      executiveSummary += `ولم يتم تسجيل خروج شحنات تصدير جديدة خلال هذه الفترة المحددة. `;
    }

    if (financial.cashFlow.inflowEgp > 0 || financial.cashFlow.outflowEgp > 0) {
      executiveSummary += `وسجلت التدفقات النقدية بالجنيه مقبوضات إجمالية بقيمة ${fmtEgp(financial.cashFlow.inflowEgp)} مقابل مدفوعات تشغيل والتزامات بقيمة ${fmtEgp(financial.cashFlow.outflowEgp)}.`;
    }
  }

  // Section 2: Operational Performance
  let operationalNarrative = '';
  if (!hasOperationalData) {
    operationalNarrative = 'لم يتم تسجيل أوامر تشغيل أو توريدات مواد خام خلال الفترة المحددة.';
  } else {
    operationalNarrative = `بلغ إجمالي كميات الخام المستلمة ${fmtTon(production.totalRawReceivedKg)}، تم توجيه ${fmtTon(production.totalRawProcessedKg)} منها إلى خطوط الفرز والمعالجة عبر ${production.operationsCount} عملية تدوير وفرز. أسفرت العمليات عن استخلاص ${fmtTon(production.totalFinishedProducedKg)} من المنتج التام المجمد، مسجلة متوسط نسبة استخلاص وتصافي (Yield) بلغت ${fmtPct(production.overallYieldPct)}، وبمتوسط تكلفة إنتاج بلغ ${production.avgCostPerKg.toFixed(2)} ج.م لكل كيلوجرام منتج تام.\n\n`;

    operationalNarrative += `وفيما يخص الفاقد، فقد سجلت عمليات الفرز والتشغيل هالكاً إجمالياً قدره ${fmtKg(waste.totalRawWasteKg)} (بنسبة ${fmtPct(waste.overallWastePct)} من إجمالي الخام المسحوب)، وبلغت التكلفة الإجمالية المقدرة لهذا الفاقد ${fmtEgp(waste.grandTotalWasteLoss)}. `;

    if (waste.overallWastePct <= standardWasteLimit) {
      operationalNarrative += `وتقع هذه النسبة ضمن النطاق المعياري المقبول للشركة (${fmtPct(standardWasteLimit)}).\n\n`;
    } else {
      operationalNarrative += `وتتجاوز هذه النسبة الحد المعياري المستهدف (${fmtPct(standardWasteLimit)}) بفارق ${(waste.overallWastePct - standardWasteLimit).toFixed(1)} نقطة مئوية، مما يستوجب المتابعة.\n\n`;
    }

    operationalNarrative += `أما بالنسبة لحالة المخزون الحالي، فيبلغ رصيد المنتج التام المجمد المتاح في الثلاجات ${fmtTon(inventory.categories.find((c) => c.category === 'FINISHED')?.closingQty || 0)}، بينما يبلغ رصيد المواد الخام المتبقية في غرف التبريد الأولي ${fmtTon(inventory.categories.find((c) => c.category === 'RAW')?.closingQty || 0)}.`;
  }

  // Section 3: Financial Performance (Strict Multi-Currency Separation)
  let financialNarrative = '';
  if (!hasFinancialData) {
    financialNarrative = 'لا تتوفر حركات دفع أو تحصيل مالية مسجلة خلال الفترة المحددة.';
  } else {
    financialNarrative = `شهدت حركة الخزينة والسيولة النقدية بالجنيه المصري (EGP) تدفقات واردة بلغت ${fmtEgp(financial.cashFlow.inflowEgp)} وتدفقات صادرة بلغت ${fmtEgp(financial.cashFlow.outflowEgp)}، بصافي حركة نقدية بلغ ${fmtEgp(financial.cashFlow.netCashEgp)}.\n\n`;

    financialNarrative += `وعلى مستوى الذمم، يبلغ إجمالي فواتير التصدير الصادرة ${fmtEgp(financial.receivables.totalBilledEgp)}، تم تحصيل ${fmtEgp(financial.receivables.collectedEgp)} منها، مما يترك رصيد ذمم مدينة قائمة (AR) بقيمة ${fmtEgp(financial.receivables.remainingEgp)}. وفي المقابل، بلغت الالتزامات المستحقة للموردين ومقاولي التشغيل ${fmtEgp(financial.payables.totalObligationsEgp)}، سُدد منها ${fmtEgp(financial.payables.paidEgp)}، ويتبقى رصيد التزامات قائمة (AP) بقيمة ${fmtEgp(financial.payables.remainingEgp)}.\n\n`;

    // Multi-currency accounts overview
    const foreignCurrencies = financial.treasuryByCurrency.filter((c) => c.currency !== 'EGP');
    if (foreignCurrencies.length > 0) {
      financialNarrative += `أرصدة الحسابات بالعملات الأجنبية: `;
      const currSummaries = foreignCurrencies.map((c) => {
        const symbol = c.currency === 'EUR' ? '€' : c.currency === 'USD' ? '$' : c.currency;
        return `${symbol}${c.totalBalance.toLocaleString('en-US')} (${c.currency}) موزعة على ${c.accountsCount} حسابات`;
      });
      financialNarrative += `${currSummaries.join('، ')}.`;
    }
  }

  // Section 4: Period Comparisons Narrative
  let comparisonNarrative = '';
  if (!hasData) {
    comparisonNarrative = 'لا تتوفر بيانات سابقة كافية لإجراء مقارنة دورية دقيقة.';
  } else {
    const prodChange = executive.comparison.productionKgChangePct || 0;
    const revChange = executive.comparison.revenueChangePct || 0;
    const profitChange = executive.comparison.profitChangePct || 0;
    const wasteChange = waste.comparison?.qtyPctChange || 0;

    comparisonNarrative = `بمقارنة نتائج هذه الفترة مع الفترة المماثلة السابقة:\n`;

    if (prodChange !== 0) {
      comparisonNarrative += `• الإنتاج التام: ${prodChange > 0 ? 'ارتفع' : 'انخفض'} بنسبة ${Math.abs(prodChange)}% (${prodChange > 0 ? '+' : ''}${fmtTon(comparisons[0].diff)}).\n`;
    } else {
      comparisonNarrative += `• الإنتاج التام: استقر عند نفس مستويات الفترة السابقة.\n`;
    }

    if (wasteChange !== 0) {
      comparisonNarrative += `• فاقد التشغيل (الهالك): ${wasteChange > 0 ? 'ارتفع' : 'انخفض'} بنسبة ${Math.abs(wasteChange)}% مقارنة بالفترة السابقة.\n`;
    } else {
      comparisonNarrative += `• فاقد التشغيل (الهالك): حافظ على نفس مستوياته السابقة.\n`;
    }

    if (revChange !== 0) {
      comparisonNarrative += `• إيرادات الصادرات: ${revChange > 0 ? 'ارتفعت' : 'تراجعت'} بنسبة ${Math.abs(revChange)}% (${revChange > 0 ? '+' : ''}${fmtEgp(comparisons[2].diff)}).\n`;
    }

    if (profitChange !== 0) {
      comparisonNarrative += `• صافي الأرباح: ${profitChange > 0 ? 'سجل نمواً' : 'تراجع'} بنسبة ${Math.abs(profitChange)}% مقارنة بالفترة السابقة.`;
    }
  }

  // Section 5: Station Performance Narrative
  let stationNarrative = '';
  if (isStationFiltered) {
    const currSt = stations.find((s) => s.stationId === activePeriod.selectedStationId);
    if (currSt) {
      stationNarrative = `محطة (${currSt.stationName}) - الموقع: ${currSt.location}:\n`;
      stationNarrative += `• إجمالي الخام المستلم: ${fmtKg(currSt.rawReceivedKg)} | الخام المعالج: ${fmtKg(currSt.rawProcessedKg)}\n`;
      stationNarrative += `• الإنتاج التام المصنع: ${fmtKg(currSt.finishedProducedKg)} | نسبة التصافي: ${fmtPct(currSt.yieldPct)}\n`;
      stationNarrative += `• الفاقد والهالك: ${fmtKg(currSt.wasteKg)} (${fmtPct(currSt.wasteRatePct)}) | تكلفة الكيلوجرام: ${currSt.costPerKg} ج.م/كجم\n`;
      stationNarrative += `• تقييم الأداء: ${currSt.benchmarkReason}`;
    } else {
      stationNarrative = `بيانات محطة (${activePeriod.selectedStationName}) غير متوفرة بشكل تفصيلي في هذه الفترة.`;
    }
  } else if (stations.length > 0) {
    const activeStations = stations.filter((s) => s.rawProcessedKg > 0 || s.finishedProducedKg > 0);
    stationNarrative = `تم تشغيل ${activeStations.length} محطات خلال هذه الفترة من إجمالي ${stations.length} محطات مسجلة.\n\n`;

    if (stationRankings.highestProductionStation) {
      stationNarrative += `• الأعلى إنتاجاً: كانت محطة (${stationRankings.highestProductionStation.name}) هي الأعلى إنتاجاً بإجمالي ${fmtTon(stationRankings.highestProductionStation.value)}.\n`;
    }
    if (stationRankings.highestYieldStation) {
      stationNarrative += `• الأعلى في نسبة التصافي: حققت محطة (${stationRankings.highestYieldStation.name}) أعلى كفاءة استخلاص بنسبة ${fmtPct(stationRankings.highestYieldStation.value)}.\n`;
    }
    if (stationRankings.highestWasteStation) {
      stationNarrative += `• الأعلى في نسبة الهالك: سجلت محطة (${stationRankings.highestWasteStation.name}) أعلى نسبة فاقد بلغت ${fmtPct(stationRankings.highestWasteStation.value)}.\n`;
    }
    if (stationRankings.lowestCostStation) {
      stationNarrative += `• الأقل في تكلفة التشغيل: حققت محطة (${stationRankings.lowestCostStation.name}) أقل تكلفة تشغيل بواقع ${stationRankings.lowestCostStation.value} ج.م لكل كجم منتج تام.`;
    }
  } else {
    stationNarrative = 'لا توجد محطات مسجلة نشطة خلال الفترة.';
  }

  // Section 6: Monthly Trends Narrative (For Annual/Yearly Analysis)
  let monthlyTrendsNarrative: string | undefined = undefined;
  if (periodType === 'yearly' && monthlyTrends.length > 0) {
    const activeMonths = monthlyTrends.filter((m) => m.hasActivity);
    if (activeMonths.length > 0) {
      const highestProdMonth = [...activeMonths].sort((a, b) => b.finishedProducedKg - a.finishedProducedKg)[0];
      const lowestProdMonth = [...activeMonths].filter((m) => m.finishedProducedKg > 0).sort((a, b) => a.finishedProducedKg - b.finishedProducedKg)[0];
      const highestSalesMonth = [...activeMonths].sort((a, b) => b.revenueEgp - a.revenueEgp)[0];
      const highestWasteMonth = [...activeMonths].filter((m) => m.rawProcessedKg > 0).sort((a, b) => b.wasteRatePct - a.wasteRatePct)[0];

      monthlyTrendsNarrative = `تحليل الاتجاه الشهري على مدار العام (${activePeriod.startDateStr.substring(0, 4)}):\n`;
      monthlyTrendsNarrative += `سجلت العمليات نشاطاً فعلياً في ${activeMonths.length} شهراً خلال العام. `;
      if (highestProdMonth && highestProdMonth.finishedProducedKg > 0) {
        monthlyTrendsNarrative += `وكان شهر (${highestProdMonth.monthName}) هو الأعلى إنتاجاً بإجمالي ${fmtTon(highestProdMonth.finishedProducedKg)}، `;
      }
      if (lowestProdMonth && lowestProdMonth !== highestProdMonth) {
        monthlyTrendsNarrative += `بينما سجل شهر (${lowestProdMonth.monthName}) أقل وتيرة إنتاج بإجمالي ${fmtTon(lowestProdMonth.finishedProducedKg)}. `;
      }
      if (highestSalesMonth && highestSalesMonth.revenueEgp > 0) {
        monthlyTrendsNarrative += `وعلى مستوى التصدير، كان شهر (${highestSalesMonth.monthName}) هو الأعلى في الإيرادات المحققة بقيمة ${fmtEgp(highestSalesMonth.revenueEgp)}. `;
      }
      if (highestWasteMonth && highestWasteMonth.wasteRatePct > 0) {
        monthlyTrendsNarrative += `وسجل شهر (${highestWasteMonth.monthName}) أعلى نسبة هالك خلال العام بنسبة ${fmtPct(highestWasteMonth.wasteRatePct)}.`;
      }
    } else {
      monthlyTrendsNarrative = `لا توجد حركات مسجلة عبر شهور العام (${activePeriod.startDateStr.substring(0, 4)}).`;
    }
  }

  return {
    periodType,
    periodLabel,
    startDateStr: activePeriod.startDateStr,
    endDateStr: activePeriod.endDateStr,
    stationId: activePeriod.selectedStationId,
    stationName: activePeriod.selectedStationName,
    isStationFiltered,
    hasData,
    dataAvailability,
    generatedAt: new Date().toLocaleDateString('ar-EG', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }),
    executiveSummary,
    operationalNarrative,
    financialNarrative,
    comparisonNarrative,
    stationNarrative,
    monthlyTrendsNarrative,
    keyObservations,
    alerts,
    recommendations,
    comparisons,
    stationRankings,
    monthlyTrends,
    rawHubData: hubData,
  };
}
