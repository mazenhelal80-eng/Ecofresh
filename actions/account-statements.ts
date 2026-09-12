"use server";

import { prisma } from '@/lib/prisma';
import { getCurrentUser, can } from '@/lib/auth';
import { AccountingService, RecordTransactionParams } from '@/lib/accounting/accounting-service';
import { revalidateFinancialImpact } from '@/actions/financials';
import { revalidatePath } from 'next/cache';

export interface StatementParams {
  partyType?: string;
  partyId?: string;
  dateFrom?: string;
  dateTo?: string;
  movementType?: string;
  search?: string;
}

export interface StatementRowView {
  txnId: string;
  date: string;
  type: string;
  refDoc: string | null;
  relatedOperationNo: string | null;
  description: string | null;
  debit: number;
  credit: number;
  balanceBefore: number;
  balanceAfter: number;
  balance: number;
  accountName: string | null;
  paymentMethod: string;
  createdByName: string;
  status: string;
  isCancelled: boolean;
  sourceLink: string | null;
  amountCurrency?: number | null;
  currency?: string | null;
}

export interface RelatedOperationView {
  id: string;
  operationType: string;
  date: string;
  codeOrDoc: string;
  details: string;
  amountOrQty: string;
  status: string;
  viewLink: string;
}

export interface PaymentRecordView {
  txnId: string;
  date: string;
  type: string;
  direction: 'INFLOW' | 'OUTFLOW';
  amountEgp: number;
  amountCurrency?: number | null;
  currency: string;
  accountName: string;
  paymentMethod: string;
  refDoc: string | null;
  description: string | null;
  status: string;
  createdByName: string;
}

export interface TimelineEventView {
  id: string;
  date: string;
  title: string;
  subtitle: string;
  amount: number;
  type: string;
  status: string;
  badgeVariant: 'default' | 'success' | 'warning' | 'destructive' | 'secondary';
  icon: 'invoice' | 'payment' | 'shipment' | 'batch' | 'operation';
}

export interface StatisticsView {
  totalTransactions: number;
  activeTransactions: number;
  cancelledTransactions: number;
  totalDebit: number;
  totalCredit: number;
  averageTransactionAmount: number;
  largestTransactionAmount: number;
  typeBreakdown: { type: string; count: number; totalAmount: number }[];
  monthlyBreakdown: { month: string; debit: number; credit: number }[];
}

export interface AuditLogView {
  id: number;
  action: string;
  summary: string;
  entityType: string;
  entityId: string;
  performedBy: string;
  performedAt: string;
}

export async function getPartiesList() {
  try {
    const [suppliers, customers, contractors, employees, treasuryAccounts] = await Promise.all([
      prisma.supplier.findMany({
        select: { id: true, name: true, code: true, type: true, status: true },
        orderBy: { name: 'asc' },
      }),
      prisma.customer.findMany({
        select: { id: true, name: true, code: true, country: true, currency: true, status: true },
        orderBy: { name: 'asc' },
      }),
      prisma.contractor.findMany({
        select: { id: true, name: true, specialization: true, isActive: true },
        orderBy: { name: 'asc' },
      }),
      prisma.employee.findMany({
        select: { id: true, name: true, position: true, department: true, status: true },
        orderBy: { name: 'asc' },
      }),
      prisma.treasuryAccount.findMany({
        where: { isActive: true },
        select: { id: true, name: true, currency: true, balance: true, type: true },
        orderBy: { name: 'asc' },
      }),
    ]);

    return {
      success: true,
      suppliers: suppliers.map((s: any) => ({ id: s.id, name: s.name, code: s.code, category: s.type, status: s.status })),
      customers: customers.map((c: any) => ({ id: c.id, name: c.name, code: c.code, category: c.country, status: c.status })),
      contractors: contractors.map((k: any) => ({ id: k.id, name: k.name, code: k.id, category: k.specialization || 'مقاول تشغيل', status: k.isActive ? 'نشط' : 'معطل' })),
      employees: employees.map((e: any) => ({ id: e.id, name: e.name, code: e.id, category: `${e.position} - ${e.department}`, status: e.status })),
      treasuryAccounts: treasuryAccounts.map((t: any) => ({ id: t.id, name: t.name, code: t.id, category: `${t.type} (${t.currency})`, balance: Number(t.balance), currency: t.currency })),
    };
  } catch (error: any) {
    console.error('Failed to get parties list:', error);
    return {
      success: false,
      error: error.message,
      suppliers: [],
      customers: [],
      contractors: [],
      employees: [],
      treasuryAccounts: [],
    };
  }
}

export async function getAccountStatementReport(params: StatementParams) {
  try {
    const { partyType = 'SUPPLIERS', partyId, dateFrom, dateTo, movementType, search } = params;

    if (!partyId) {
      return {
        success: true,
        statement: null,
        message: 'يرجى اختيار الطرف لعرض كشف الحساب',
      };
    }

    // 1. Resolve Party Info
    let partyName = partyId;
    let partyCategory = 'طرف متعامل';
    let isCustomer = false;
    let isSupplier = false;
    let isContractor = false;
    let isEmployee = false;

    if (partyType.toUpperCase().includes('CUSTOMER') || partyType.includes('عملاء') || partyType.includes('عميل')) {
      isCustomer = true;
      const c = await prisma.customer.findUnique({ where: { id: partyId } });
      if (c) {
        partyName = c.name;
        partyCategory = `عميل تصدير (${c.country})`;
      }
    } else if (partyType.toUpperCase().includes('SUPPLIER') || partyType.includes('مورد')) {
      isSupplier = true;
      const s = await prisma.supplier.findUnique({ where: { id: partyId } });
      if (s) {
        partyName = s.name;
        partyCategory = `مورد معتمد (${s.type})`;
      }
    } else if (partyType.toUpperCase().includes('CONTRACTOR') || partyType.includes('مقاول')) {
      isContractor = true;
      const k = await prisma.contractor.findUnique({ where: { id: partyId } });
      if (k) {
        partyName = k.name;
        partyCategory = `مقاول عمالة (${k.specialization || 'فرز وتشغيل'})`;
      }
    } else if (partyType.toUpperCase().includes('EMPLOYEE') || partyType.includes('موظف')) {
      isEmployee = true;
      const e = await prisma.employee.findUnique({ where: { id: partyId } });
      if (e) {
        partyName = e.name;
        partyCategory = `موظف (${e.position})`;
      }
    }

    // 2. Compute Opening Balance (prior to dateFrom)
    let dateFromObj: Date | null = null;
    let dateToObj: Date | null = null;

    if (dateFrom) {
      dateFromObj = new Date(dateFrom);
      dateFromObj.setHours(0, 0, 0, 0);
    }
    if (dateTo) {
      dateToObj = new Date(dateTo);
      dateToObj.setHours(23, 59, 59, 999);
    }

    let openingBalance = 0;
    if (dateFromObj) {
      const priorTxns = await prisma.financialTransaction.findMany({
        where: {
          partyId,
          status: { not: 'ملغاة' },
          date: { lt: dateFromObj },
        },
        select: { debit: true, credit: true, amountEgp: true, type: true },
      });

      for (const t of priorTxns) {
        const d = Number(t.debit);
        const c = Number(t.credit);
        if (isCustomer) {
          openingBalance += d - c;
        } else {
          openingBalance += c - d;
        }
      }
    }

    // 3. Fetch Period Financial Transactions
    const periodWhere: any = {
      partyId,
    };
    if (dateFromObj || dateToObj) {
      periodWhere.date = {};
      if (dateFromObj) periodWhere.date.gte = dateFromObj;
      if (dateToObj) periodWhere.date.lte = dateToObj;
    }

    const allPeriodTxns = await prisma.financialTransaction.findMany({
      where: periodWhere,
      include: {
        account: true,
        createdBy: { select: { fullName: true } },
      },
      orderBy: [
        { date: 'asc' },
        { createdAt: 'asc' },
      ],
    });

    // 4. Build Running Statement Table rows with balanceBefore & balanceAfter
    let currentRunning = openingBalance;
    let totalPurchasesOrSales = 0;
    let totalPaidOrCollected = 0;
    let totalDebit = 0;
    let totalCredit = 0;

    const runningRows: StatementRowView[] = [];
    const paymentRows: PaymentRecordView[] = [];
    const timelineEvents: TimelineEventView[] = [];

    for (const t of allPeriodTxns) {
      const isCancelled = t.status === 'ملغاة';
      const d = Number(t.debit);
      const c = Number(t.credit);
      const amt = Number(t.amountEgp);

      const balanceBefore = currentRunning;
      if (!isCancelled) {
        if (isCustomer) {
          currentRunning += (d - c);
          totalPurchasesOrSales += d;
          totalPaidOrCollected += c;
        } else {
          currentRunning += (c - d);
          totalPurchasesOrSales += c;
          totalPaidOrCollected += d;
        }
        totalDebit += d;
        totalCredit += c;
      }
      const balanceAfter = currentRunning;

      // Source Link
      let sourceLink: string | null = null;
      let relatedOpNo = t.refDoc || null;
      if (t.refDoc) {
        if (t.refDoc.startsWith('SHP-')) sourceLink = `/shipments`;
        else if (t.refDoc.startsWith('LOT-')) sourceLink = `/inventory/raw/${t.refDoc}`;
        else if (t.refDoc.startsWith('DEAL-')) sourceLink = `/finished-purchases`;
        else if (t.refDoc.startsWith('PR-')) sourceLink = `/processing-operations`;
      }

      // Filter by search/movementType if requested
      let matchesSearch = true;
      if (search) {
        const s = search.toLowerCase();
        matchesSearch =
          t.txnId.toLowerCase().includes(s) ||
          (t.refDoc && t.refDoc.toLowerCase().includes(s)) ||
          (t.description && t.description.toLowerCase().includes(s)) ||
          t.type.toLowerCase().includes(s);
      }

      let matchesType = true;
      if (movementType && movementType !== 'ALL') {
        matchesType = t.type.includes(movementType);
      }

      const rowView: StatementRowView = {
        txnId: t.txnId,
        date: t.date.toISOString().split('T')[0],
        type: t.type,
        refDoc: t.refDoc,
        relatedOperationNo: relatedOpNo,
        description: t.description,
        debit: d,
        credit: c,
        balanceBefore,
        balanceAfter,
        balance: balanceAfter,
        accountName: t.accountName || t.account?.name || null,
        paymentMethod: t.paymentMethod || (t.accountId ? 'نقدي' : 'آجل'),
        createdByName: t.createdBy?.fullName || 'النظام المركزي',
        status: t.status,
        isCancelled,
        sourceLink,
        amountCurrency: t.amountCurrency ? Number(t.amountCurrency) : null,
        currency: t.currency || 'EGP',
      };

      if (matchesSearch && matchesType) {
        runningRows.push(rowView);
      }

      // Populate Payment Record if cash/bank was involved
      if (t.accountId || t.type.includes('سداد') || t.type.includes('تحصيل') || t.type.includes('صرف')) {
        const isInflow = AccountingService.isCashInflow(t.type);
        paymentRows.push({
          txnId: t.txnId,
          date: t.date.toISOString().split('T')[0],
          type: t.type,
          direction: isInflow ? 'INFLOW' : 'OUTFLOW',
          amountEgp: amt,
          amountCurrency: t.amountCurrency ? Number(t.amountCurrency) : null,
          currency: t.currency || 'EGP',
          accountName: t.accountName || t.account?.name || 'خزينة رئيسية',
          paymentMethod: t.paymentMethod || 'نقدي',
          refDoc: t.refDoc,
          description: t.description,
          status: t.status,
          createdByName: t.createdBy?.fullName || 'مسؤول الحسابات',
        });
      }

      // Populate Timeline Event
      let icon: TimelineEventView['icon'] = 'invoice';
      let badgeVariant: TimelineEventView['badgeVariant'] = 'default';

      if (t.type.includes('تحصيل')) {
        icon = 'payment';
        badgeVariant = 'success';
      } else if (t.type.includes('سداد')) {
        icon = 'payment';
        badgeVariant = 'secondary';
      } else if (t.refDoc?.startsWith('SHP-')) {
        icon = 'shipment';
        badgeVariant = 'default';
      } else if (t.refDoc?.startsWith('LOT-')) {
        icon = 'batch';
        badgeVariant = 'warning';
      } else if (t.refDoc?.startsWith('PR-')) {
        icon = 'operation';
        badgeVariant = 'secondary';
      }

      timelineEvents.push({
        id: t.txnId,
        date: t.date.toISOString().split('T')[0],
        title: t.type,
        subtitle: t.description || `مرجع: ${t.refDoc || t.txnId}`,
        amount: amt,
        type: t.type,
        status: t.status,
        badgeVariant,
        icon,
      });
    }

    // 5. Fetch Related Operational Business Entities (Tab 2)
    const relatedOperations: RelatedOperationView[] = [];

    if (isSupplier) {
      const [rawBatches, directDeals, packagingPurchases] = await Promise.all([
        prisma.rawBatch.findMany({
          where: { supplierId: partyId },
          select: { batchId: true, rawProduct: true, initialQty: true, totalPayableEgp: true, receivedDate: true, qcStatus: true },
          orderBy: { receivedDate: 'desc' },
          take: 30,
        }),
        prisma.directPurchaseDeal.findMany({
          where: { supplierId: partyId },
          select: { dealId: true, productName: true, qtyKg: true, totalCost: true, date: true, status: true },
          orderBy: { date: 'desc' },
          take: 30,
        }),
        prisma.packagingPurchase.findMany({
          where: { supplierId: partyId },
          select: { id: true, invoiceNo: true, qty: true, totalCost: true, createdAt: true, supply: { select: { name: true, unit: true } } },
          orderBy: { createdAt: 'desc' },
          take: 30,
        }),
      ]);

      rawBatches.forEach((b) => {
        relatedOperations.push({
          id: b.batchId,
          operationType: 'توريد خام زراعي',
          date: b.receivedDate.toISOString().split('T')[0],
          codeOrDoc: b.batchId,
          details: `${b.rawProduct} (${Number(b.initialQty).toLocaleString()} كجم)`,
          amountOrQty: `${Number(b.totalPayableEgp).toLocaleString()} ج.م`,
          status: b.qcStatus,
          viewLink: `/inventory/raw/${b.batchId}`,
        });
      });

      directDeals.forEach((d) => {
        relatedOperations.push({
          id: d.dealId,
          operationType: 'صفقة بضاعة جاهزة',
          date: d.date.toISOString().split('T')[0],
          codeOrDoc: d.dealId,
          details: `${d.productName} (${Number(d.qtyKg).toLocaleString()} كجم)`,
          amountOrQty: `${Number(d.totalCost).toLocaleString()} ج.م`,
          status: d.status,
          viewLink: `/finished-purchases`,
        });
      });

      packagingPurchases.forEach((p) => {
        relatedOperations.push({
          id: p.id,
          operationType: 'شراء مستلزمات وتعبئة',
          date: p.createdAt.toISOString().split('T')[0],
          codeOrDoc: p.invoiceNo || p.id,
          details: `${p.supply?.name || 'مستلزم'} (${Number(p.qty)} ${p.supply?.unit || 'قطعة'})`,
          amountOrQty: `${Number(p.totalCost).toLocaleString()} ج.م`,
          status: 'معتمد',
          viewLink: `/packaging-purchases`,
        });
      });
    } else if (isCustomer) {
      const [shipments, orders] = await Promise.all([
        prisma.shipment.findMany({
          where: { customerId: partyId },
          select: { shipmentId: true, productName: true, containerNo: true, shippedQtyKg: true, grossRevenueEgp: true, dispatchDate: true, status: true },
          orderBy: { createdAt: 'desc' },
          take: 30,
        }),
        prisma.clientOrder.findMany({
          where: { customerId: partyId },
          select: { orderId: true, productName: true, orderedQtyKg: true, orderDate: true, status: true },
          orderBy: { orderDate: 'desc' },
          take: 30,
        }),
      ]);

      shipments.forEach((s) => {
        relatedOperations.push({
          id: s.shipmentId,
          operationType: 'شحنة تصدير حاوية',
          date: s.dispatchDate ? s.dispatchDate.toISOString().split('T')[0] : '—',
          codeOrDoc: s.shipmentId,
          details: `${s.productName} (حاوية: ${s.containerNo})`,
          amountOrQty: `${Number(s.grossRevenueEgp).toLocaleString()} ج.م`,
          status: s.status,
          viewLink: `/shipments`,
        });
      });

      orders.forEach((o) => {
        relatedOperations.push({
          id: o.orderId,
          operationType: 'طلب تصدير تجاري',
          date: o.orderDate.toISOString().split('T')[0],
          codeOrDoc: o.orderId,
          details: `${o.productName} (${Number(o.orderedQtyKg).toLocaleString()} كجم)`,
          amountOrQty: `${Number(o.orderedQtyKg).toLocaleString()} كجم`,
          status: o.status,
          viewLink: `/client-orders`,
        });
      });
    } else if (isContractor) {
      const operations = await prisma.processingOperation.findMany({
        where: { contractorId: partyId },
        select: { id: true, rawProduct: true, finishedOutputKg: true, contractorCost: true, date: true, status: true },
        orderBy: { date: 'desc' },
        take: 30,
      });

      operations.forEach((op) => {
        relatedOperations.push({
          id: op.id,
          operationType: 'أمر تشغيل وفرز',
          date: op.date.toISOString().split('T')[0],
          codeOrDoc: op.id,
          details: `فرز وتعبئة ${op.rawProduct} (إنتاج: ${Number(op.finishedOutputKg).toLocaleString()} كجم)`,
          amountOrQty: `${Number(op.contractorCost).toLocaleString()} ج.م`,
          status: op.status,
          viewLink: `/processing-operations`,
        });
      });
    }

    // Sort related operations by date descending
    relatedOperations.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    // 6. Compute Statistics (Tab 5)
    const typeCountMap = new Map<string, { count: number; totalAmount: number }>();
    const monthMap = new Map<string, { debit: number; credit: number }>();
    let maxAmount = 0;

    for (const t of allPeriodTxns) {
      if (t.status === 'ملغاة') continue;
      const amt = Number(t.amountEgp);
      if (amt > maxAmount) maxAmount = amt;

      const cur = typeCountMap.get(t.type) || { count: 0, totalAmount: 0 };
      cur.count += 1;
      cur.totalAmount += amt;
      typeCountMap.set(t.type, cur);

      const m = t.date.toISOString().slice(0, 7); // YYYY-MM
      const curM = monthMap.get(m) || { debit: 0, credit: 0 };
      curM.debit += Number(t.debit);
      curM.credit += Number(t.credit);
      monthMap.set(m, curM);
    }

    const typeBreakdown = Array.from(typeCountMap.entries()).map(([type, val]) => ({
      type,
      count: val.count,
      totalAmount: val.totalAmount,
    }));

    const monthlyBreakdown = Array.from(monthMap.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([month, val]) => ({
        month,
        debit: val.debit,
        credit: val.credit,
      }));

    const activeTxnsCount = allPeriodTxns.filter((t) => t.status !== 'ملغاة').length;
    const statistics: StatisticsView = {
      totalTransactions: allPeriodTxns.length,
      activeTransactions: activeTxnsCount,
      cancelledTransactions: allPeriodTxns.length - activeTxnsCount,
      totalDebit,
      totalCredit,
      averageTransactionAmount: activeTxnsCount > 0 ? totalDebit / activeTxnsCount : 0,
      largestTransactionAmount: maxAmount,
      typeBreakdown,
      monthlyBreakdown,
    };

    // 7. Fetch Audit Logs for this party's activities (Tab 6)
    const partyTxnIds = allPeriodTxns.map((t) => t.txnId);
    const auditLogsRaw = await prisma.auditLog.findMany({
      where: {
        OR: [
          { entityId: { in: partyTxnIds.slice(0, 50) } },
          { summary: { contains: partyName } },
        ],
      },
      include: { user: { select: { fullName: true } } },
      orderBy: { performedAt: 'desc' },
      take: 30,
    });

    const auditLogs: AuditLogView[] = auditLogsRaw.map((log) => ({
      id: log.id,
      action: log.action,
      summary: log.summary,
      entityType: log.entityType,
      entityId: log.entityId,
      performedBy: log.user?.fullName || 'النظام الآلي',
      performedAt: log.performedAt.toISOString().replace('T', ' ').slice(0, 19),
    }));

    // Current Ending Balance
    const endingBalance = currentRunning;

    return {
      success: true,
      statement: {
        partyInfo: {
          partyId,
          partyName,
          partyCategory,
          isCustomer,
          isSupplier,
          isContractor,
          isEmployee,
        },
        period: {
          dateFrom: dateFrom || 'بداية التعامل',
          dateTo: dateTo || 'تاريخ اليوم',
        },
        summary: {
          openingBalance,
          totalPurchasesOrSales,
          totalPaidOrCollected,
          currentBalance: endingBalance,
          relatedOperationsCount: relatedOperations.length,
          totalDebit,
          totalCredit,
          movementsCount: runningRows.length,
        },
        tabs: {
          runningRows,
          relatedOperations,
          paymentRows,
          timelineEvents: timelineEvents.reverse(),
          statistics,
          auditLogs,
        },
      },
    };
  } catch (error: any) {
    console.error('Failed to generate account statement:', error);
    return {
      success: false,
      error: error.message || 'حدث خطأ أثناء إعداد كشف الحساب',
      statement: null,
    };
  }
}

export async function createStatementMovement(payload: {
  date: string;
  type: string;
  partyType: string;
  partyId: string;
  partyName: string;
  amount: number;
  accountId?: string | null;
  paymentMethod?: string;
  refDoc?: string | null;
  notes?: string | null;
}) {
  const user = await getCurrentUser();
  if (!user || !can(user.role, 'MANAGE_FINANCIALS')) {
    return { success: false, error: 'غير مصرح لك بتسجيل حركات مالية' };
  }

  if (payload.amount <= 0) {
    return { success: false, error: 'مبلغ الحركة يجب أن يكون أكبر من الصفر' };
  }

  try {
    const res = await AccountingService.recordTransaction({
      date: payload.date ? new Date(payload.date) : new Date(),
      type: payload.type,
      partyType: payload.partyType,
      partyId: payload.partyId,
      partyName: payload.partyName,
      amountEgp: payload.amount,
      accountId: payload.accountId || null,
      paymentMethod: payload.paymentMethod || (payload.accountId ? 'CASH' : 'CREDIT'),
      relatedEntityType: 'PAYMENT_VOUCHER',
      relatedEntityId: payload.refDoc || null,
      refDoc: payload.refDoc || 'سند مالي مباشر',
      description: payload.notes || `${payload.type} - الطرف: ${payload.partyName}`,
      createdById: user.id,
    });

    await revalidateFinancialImpact(payload.partyType, payload.partyId);
    revalidatePath('/financials/statements');

    return {
      success: true,
      message: `تم بنجاح قيد الحركة ${res.txnId} وتحديث رصيد الحساب.`,
      data: res,
    };
  } catch (error: any) {
    console.error('Failed to create statement movement:', error);
    return {
      success: false,
      error: error.message || 'حدث خطأ أثناء قيد الحركة المالية',
    };
  }
}

export async function simulateMovementImpact(params: {
  partyId: string;
  partyType: string;
  amount: number;
  accountId?: string | null;
  movementType?: string;
}) {
  try {
    const sim = await AccountingService.simulateFinancialImpact(params);
    return { success: true, data: sim };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
