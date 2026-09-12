import { prisma } from '@/lib/prisma';

export async function getShipmentsProfitabilityReport() {
  try {
    const shipments = await prisma.shipment.findMany({
      include: { customer: true, order: true },
      orderBy: { dispatchDate: 'desc' },
    });

    const totalRevenue = shipments.reduce((s, sh) => s + Number(sh.grossRevenueEgp), 0);
    const totalCost = shipments.reduce((s, sh) => s + Number(sh.totalShipmentCostEgp), 0);
    const totalProfit = shipments.reduce((s, sh) => s + Number(sh.netProfitEgp), 0);
    const averageMargin = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;

    return {
      summary: {
        totalRevenue,
        totalCost,
        totalProfit,
        averageMargin,
        shipmentsCount: shipments.length,
      },
      shipmentsList: shipments.map((sh) => ({
        shipmentId: sh.shipmentId,
        customerName: sh.customer?.name || 'عميل غير محدد',
        containerNo: sh.containerNo,
        shippedQtyKg: Number(sh.shippedQtyKg),
        sellingPriceEur: Number(sh.sellingPriceEur),
        grossRevenueEgp: Number(sh.grossRevenueEgp),
        totalCostEgp: Number(sh.totalShipmentCostEgp),
        netProfitEgp: Number(sh.netProfitEgp),
        marginPercent: Number(sh.marginPercent),
        dispatchDate: sh.dispatchDate,
      })),
    };
  } catch (error) {
    console.error('Failed to fetch shipments profitability report:', error);
    return {
      summary: { totalRevenue: 0, totalCost: 0, totalProfit: 0, averageMargin: 0, shipmentsCount: 0 },
      shipmentsList: [],
    };
  }
}

export async function getStationsPerformanceReport() {
  try {
    const stations = await prisma.station.findMany({
      include: {
        operations: true,
        rawBatches: true,
        finishedGoodsBatches: true,
      },
    });

    return stations.map((st) => {
      const totalRawInputKg = st.operations.reduce(
        (sum, op) => sum + Number(op.rawInputKg),
        0
      );
      const totalFinishedOutputKg = st.operations.reduce(
        (sum, op) => sum + Number(op.finishedOutputKg),
        0
      );
      const totalRawWasteKg = st.operations.reduce(
        (sum, op) => sum + Number(op.rawWasteKg),
        0
      );
      const totalGrandCost = st.operations.reduce(
        (sum, op) => sum + Number(op.grandTotalCost),
        0
      );

      const averageYieldPct =
        totalRawInputKg > 0 ? (totalFinishedOutputKg / totalRawInputKg) * 100 : 80;
      const averageWastePct =
        totalRawInputKg > 0 ? (totalRawWasteKg / totalRawInputKg) * 100 : 20;
      const averageCostPerKg =
        totalFinishedOutputKg > 0 ? totalGrandCost / totalFinishedOutputKg : 0;

      return {
        id: st.id,
        name: st.name,
        location: st.location,
        coldStorageCapacityKg: Number(st.coldStorageCapacityKg),
        electricityRatePerKg: Number(st.electricityRatePerKg),
        operationsCount: st.operations.length,
        totalRawInputKg,
        totalFinishedOutputKg,
        totalRawWasteKg,
        averageYieldPct,
        averageWastePct,
        averageCostPerKg,
      };
    });
  } catch (error) {
    console.error('Failed to fetch stations performance report:', error);
    return [];
  }
}

export async function getSuppliersPerformanceReport() {
  try {
    const suppliers = await prisma.supplier.findMany({
      include: {
        rawBatches: true,
        deals: true,
      },
    });

    return suppliers.map((sup) => {
      const totalRawQty = sup.rawBatches.reduce(
        (sum, b) => sum + Number(b.grossQtyKg),
        0
      );
      const totalRawPayable = sup.rawBatches.reduce(
        (sum, b) => sum + Number(b.totalPayableEgp),
        0
      );
      const approvedCount = sup.rawBatches.filter(
        (b) => b.qcStatus === 'APPROVED'
      ).length;
      const pendingCount = sup.rawBatches.filter(
        (b) => b.qcStatus === 'PENDING'
      ).length;
      const rejectedCount = sup.rawBatches.filter(
        (b) => b.qcStatus === 'REJECTED'
      ).length;

      const activeDeals = sup.deals.filter((d) => d.status !== 'ملغاة');
      const dealsQty = activeDeals.reduce((sum, d) => sum + Number(d.qtyKg), 0);
      const dealsCost = activeDeals.reduce((sum, d) => sum + Number(d.totalCost), 0);

      const totalQtySupplied = totalRawQty + dealsQty;
      const totalVolumeEgp = totalRawPayable + dealsCost;
      const approvalRatePct =
        sup.rawBatches.length > 0
          ? (approvedCount / sup.rawBatches.length) * 100
          : 100;

      return {
        id: sup.id,
        code: sup.code,
        name: sup.name,
        type: sup.type,
        status: sup.status,
        batchesCount: sup.rawBatches.length,
        approvedCount,
        pendingCount,
        rejectedCount,
        totalQtySupplied,
        totalVolumeEgp,
        approvalRatePct,
      };
    });
  } catch (error) {
    console.error('Failed to fetch suppliers performance report:', error);
    return [];
  }
}

export async function getAragingReport() {
  try {
    const [customers, suppliers, contractors, transactions] = await Promise.all([
      prisma.customer.findMany({
        include: {
          shipments: {
            where: { status: { not: 'CANCELLED' } },
            select: { dispatchDate: true, grossRevenueEgp: true },
          },
        },
      }),
      prisma.supplier.findMany({
        select: { id: true, code: true, name: true, type: true },
      }),
      prisma.contractor.findMany({
        select: { id: true, name: true, specialization: true },
      }),
      prisma.financialTransaction.findMany({
        where: { status: { not: 'ملغاة' } },
        select: {
          txnId: true,
          date: true,
          type: true,
          partyType: true,
          partyId: true,
          partyName: true,
          amountEgp: true,
        },
        orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
      }),
    ]);

    const buckets = {
      bucket0to30: 0,
      bucket31to60: 0,
      bucket60plus: 0,
    };

    // Helper for relative date
    const formatRelDate = (date: Date | null | undefined): string => {
      if (!date) return '—';
      const now = new Date();
      const d = new Date(date);
      const diffDays = Math.floor((now.getTime() - d.getTime()) / (1000 * 3600 * 24));
      if (diffDays === 0) return 'اليوم';
      if (diffDays === 1) return 'أمس';
      if (diffDays === 2) return 'منذ يومين';
      if (diffDays <= 10) return `منذ ${diffDays} أيام`;
      return d.toLocaleDateString('ar-EG', { month: 'short', day: 'numeric' });
    };

    // 1. Process Customer (AR) Aging
    const customerRows = customers.map((cust) => {
      const custTxns = transactions.filter((t) => t.partyId === cust.id);

      let totalDue = 0;
      let totalCollected = 0;
      let lastMovementDate: Date | null = null;

      custTxns.forEach((txn) => {
        const amount = Number(txn.amountEgp);
        if (!lastMovementDate || new Date(txn.date) > lastMovementDate) {
          lastMovementDate = new Date(txn.date);
        }

        const isCollection = txn.type.includes('تحصيل') || txn.type.includes('وارد') || txn.type.includes('Inflow');
        if (isCollection) {
          totalCollected += amount;
        } else {
          totalDue += amount;
        }
      });

      // Fallback to shipments if no transactions yet
      if (custTxns.length === 0 && cust.shipments.length > 0) {
        totalDue = cust.shipments.reduce((sum, s) => sum + Number(s.grossRevenueEgp), 0);
        const latestShipment = cust.shipments.reduce((latest, s) => {
          if (!s.dispatchDate) return latest;
          return !latest || new Date(s.dispatchDate) > latest ? new Date(s.dispatchDate) : latest;
        }, null as Date | null);
        lastMovementDate = latestShipment;
      }

      const outstandingBalance = Math.max(0, totalDue - totalCollected);

      let bucket: '0-30' | '31-60' | '60+' = '0-30';
      if (outstandingBalance > 0 && cust.shipments.length > 0) {
        const oldestShipmentDate = new Date(
          Math.min(
            ...cust.shipments.map((s) => (s.dispatchDate ? new Date(s.dispatchDate).getTime() : Date.now()))
          )
        );
        const diffDays = Math.floor(
          (Date.now() - oldestShipmentDate.getTime()) / (1000 * 3600 * 24)
        );

        if (diffDays > 60) {
          bucket = '60+';
          buckets.bucket60plus += outstandingBalance;
        } else if (diffDays > 30) {
          bucket = '31-60';
          buckets.bucket31to60 += outstandingBalance;
        } else {
          bucket = '0-30';
          buckets.bucket0to30 += outstandingBalance;
        }
      } else if (outstandingBalance > 0) {
        bucket = '0-30';
        buckets.bucket0to30 += outstandingBalance;
      }

      return {
        customerId: cust.id,
        customerName: cust.name,
        country: cust.country,
        creditLimit: Number(cust.creditLimit || 0),
        totalDue,
        totalCollected,
        totalDebit: totalDue, // backwards compat
        totalCredit: totalCollected, // backwards compat
        outstandingBalance,
        bucket,
        lastMovementDate,
        lastMovementRelative: formatRelDate(lastMovementDate),
        hasBalance: outstandingBalance > 0,
      };
    });

    // 2. Process Supplier & Contractor (AP) Aging
    const supplierRows = suppliers.map((sup) => {
      const supTxns = transactions.filter((t) => t.partyId === sup.id);

      let totalDue = 0;
      let totalPaid = 0;
      let lastMovementDate: Date | null = null;

      supTxns.forEach((txn) => {
        const amount = Number(txn.amountEgp);
        if (!lastMovementDate || new Date(txn.date) > lastMovementDate) {
          lastMovementDate = new Date(txn.date);
        }

        const isPayment = txn.type.includes('سداد') || txn.type.includes('منصرف') || txn.type.includes('Outflow');
        if (isPayment) {
          totalPaid += amount;
        } else {
          totalDue += amount;
        }
      });

      const outstandingBalance = Math.max(0, totalDue - totalPaid);

      return {
        partyId: sup.id,
        partyName: sup.name,
        partyType: sup.type || 'مورد معتمد',
        category: 'SUPPLIER' as const,
        totalDue,
        totalPaid,
        outstandingBalance,
        lastMovementDate,
        lastMovementRelative: formatRelDate(lastMovementDate),
        hasBalance: outstandingBalance > 0,
      };
    });

    const contractorRows = contractors.map((ctr) => {
      const ctrTxns = transactions.filter((t) => t.partyId === ctr.id);

      let totalDue = 0;
      let totalPaid = 0;
      let lastMovementDate: Date | null = null;

      ctrTxns.forEach((txn) => {
        const amount = Number(txn.amountEgp);
        if (!lastMovementDate || new Date(txn.date) > lastMovementDate) {
          lastMovementDate = new Date(txn.date);
        }

        const isPayment = txn.type.includes('سداد') || txn.type.includes('منصرف') || txn.type.includes('Outflow');
        if (isPayment) {
          totalPaid += amount;
        } else {
          totalDue += amount;
        }
      });

      const outstandingBalance = Math.max(0, totalDue - totalPaid);

      return {
        partyId: ctr.id,
        partyName: ctr.name,
        partyType: 'مقاول عمالة وتشغيل',
        category: 'CONTRACTOR' as const,
        totalDue,
        totalPaid,
        outstandingBalance,
        lastMovementDate,
        lastMovementRelative: formatRelDate(lastMovementDate),
        hasBalance: outstandingBalance > 0,
      };
    });

    const apPayables = [...supplierRows, ...contractorRows];
    const totalArOutstanding =
      buckets.bucket0to30 + buckets.bucket31to60 + buckets.bucket60plus;
    const totalApOutstanding = apPayables.reduce((sum, p) => sum + p.outstandingBalance, 0);

    return {
      buckets: {
        ...buckets,
        totalArOutstanding,
        totalApOutstanding,
      },
      customers: customerRows,
      payables: apPayables,
    };
  } catch (error) {
    console.error('Failed to fetch AR/AP aging report:', error);
    return {
      buckets: { bucket0to30: 0, bucket31to60: 0, bucket60plus: 0, totalArOutstanding: 0, totalApOutstanding: 0 },
      customers: [],
      payables: [],
    };
  }
}
