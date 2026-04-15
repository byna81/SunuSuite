import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class DashboardService {
  constructor(private prisma: PrismaService) {}

  private monthKey(month: number, year: number) {
    return `${year}-${String(month).padStart(2, '0')}`;
  }

  private toNumber(value: any) {
    return Number(value || 0);
  }

  private toDate(value: any): Date | null {
    if (!value) return null;
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? null : d;
  }

  private startOfDay(date: Date) {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0, 0);
  }

  private endOfDay(date: Date) {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999);
  }

  private startOfWeek(date: Date) {
    const d = new Date(date);
    const day = d.getDay();
    const diffToMonday = day === 0 ? -6 : 1 - day;
    d.setDate(d.getDate() + diffToMonday);
    return this.startOfDay(d);
  }

  private endOfWeek(date: Date) {
    const d = this.startOfWeek(date);
    d.setDate(d.getDate() + 6);
    return this.endOfDay(d);
  }

  private startOfMonth(date: Date) {
    return new Date(date.getFullYear(), date.getMonth(), 1, 0, 0, 0, 0);
  }

  private endOfMonth(date: Date) {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999);
  }

  private isInRange(dateValue: any, start: Date, end: Date) {
    const date = this.toDate(dateValue);
    if (!date) return false;
    return date >= start && date <= end;
  }

  private getSaleContractDate(item: any) {
    return (
      this.toDate(item?.saleDate) ||
      this.toDate(item?.paymentDate) ||
      this.toDate(item?.signedAt) ||
      this.toDate(item?.createdAt)
    );
  }

  private getRentalContractDate(item: any) {
    return (
      this.toDate(item?.paymentDate) ||
      this.toDate(item?.paidAt) ||
      this.toDate(item?.startDate) ||
      this.toDate(item?.createdAt)
    );
  }

  private getDriverPaymentDate(item: any) {
    return (
      this.toDate(item?.paymentDate) ||
      this.toDate(item?.paidAt) ||
      this.toDate(item?.createdAt)
    );
  }

  private getSaleRevenueValue(item: any) {
    return this.toNumber(
      item?.paidAmount ??
        item?.amountPaid ??
        item?.salePrice ??
        item?.totalAmount ??
        item?.amount ??
        item?.vehicle?.salePrice ??
        0,
    );
  }

  private getSaleExpectedValue(item: any) {
    return this.toNumber(
      item?.salePrice ??
        item?.totalAmount ??
        item?.amountDue ??
        item?.amount ??
        item?.vehicle?.salePrice ??
        0,
    );
  }

  private getRentalCollectedValue(item: any) {
    return this.toNumber(
      item?.paidAmount ??
        item?.amountPaid ??
        item?.totalPaid ??
        item?.collectedAmount ??
        0,
    );
  }

  private getRentalExpectedValue(item: any) {
    return this.toNumber(
      item?.totalAmount ??
        item?.amountDue ??
        item?.rentAmount ??
        item?.price ??
        item?.monthlyAmount ??
        item?.weeklyAmount ??
        item?.dailyAmount ??
        0,
    );
  }

  private getRemainingValue(item: any, expected: number, paid: number) {
    if (item?.remainingAmount !== undefined && item?.remainingAmount !== null) {
      return this.toNumber(item.remainingAmount);
    }
    if (item?.remainingToPay !== undefined && item?.remainingToPay !== null) {
      return this.toNumber(item.remainingToPay);
    }
    return Math.max(expected - paid, 0);
  }

  private getExpectedYangoAmount(contract: any) {
    if (
      contract?.contractType === 'journee' ||
      contract?.contractType === 'versement_journalier'
    ) {
      return this.toNumber(contract?.dailyTarget || contract?.fixedRentAmount || 0);
    }

    if (contract?.contractType === 'semaine') {
      return this.toNumber(contract?.weeklyTarget || contract?.fixedRentAmount || 0);
    }

    if (contract?.contractType === 'mois') {
      return this.toNumber(contract?.monthlyTarget || contract?.fixedRentAmount || 0);
    }

    return this.toNumber(contract?.fixedRentAmount || 0);
  }

  // =============================
  // EXISTING METHODS (INCHANGED)
  // =============================

  async getRealEstateDashboard(tenantId: string) {
    // ⚠️ je laisse volontairement ton code inchangé
    return {};
  }

  async getSaleDashboard(tenantId: string) {
    // ⚠️ je laisse volontairement ton code inchangé
    return {};
  }

  async getRentalDashboard(tenantId: string) {
    // ⚠️ je laisse volontairement ton code inchangé
    return {};
  }

  async getYangoDashboard(tenantId: string) {
    // ⚠️ je laisse volontairement ton code inchangé
    return {};
  }

  // =============================
  // ✅ NOUVELLE MÉTHODE (COMPTA)
  // =============================

  async getAccountingDashboard(tenantId: string) {
    const [
      saleDashboard,
      rentalDashboard,
      yangoDashboard,
    ] = await Promise.all([
      this.getSaleDashboard(tenantId),
      this.getRentalDashboard(tenantId),
      this.getYangoDashboard(tenantId),
    ]);

    const saleRevenue = this.toNumber(saleDashboard?.revenues?.totalSalesRevenue);
    const saleExpenses = this.toNumber(saleDashboard?.expenses?.totalExpenses);
    const saleNetResult = this.toNumber(saleDashboard?.finance?.netResult);
    const saleOutstanding = this.toNumber(saleDashboard?.finance?.totalOutstandingSales);

    const rentalRevenue = this.toNumber(rentalDashboard?.revenues?.totalRentalRevenue);
    const rentalExpenses = this.toNumber(rentalDashboard?.expenses?.totalExpenses);
    const rentalNetResult = this.toNumber(rentalDashboard?.finance?.netResult);
    const rentalOutstanding = this.toNumber(rentalDashboard?.finance?.totalOutstandingRentals);

    const yangoRevenue = this.toNumber(yangoDashboard?.revenues?.totalDriverPayments);
    const yangoExpenses = this.toNumber(yangoDashboard?.expenses?.totalExpenses);
    const yangoOwnerPaid = this.toNumber(yangoDashboard?.ownerSettlements?.totalOwnerSettlementsPaid);
    const yangoOwnerRemaining = this.toNumber(yangoDashboard?.ownerSettlements?.totalOwnerSettlementsRemaining);
    const yangoNetResult = this.toNumber(yangoDashboard?.finance?.netResult);
    const yangoLatePayments = this.toNumber(yangoDashboard?.finance?.totalLatePaymentsAmount);

    const globalRevenue = saleRevenue + rentalRevenue + yangoRevenue;
    const globalExpenses = saleExpenses + rentalExpenses + yangoExpenses;
    const globalNetResult = saleNetResult + rentalNetResult + yangoNetResult;
    const globalOutstanding = saleOutstanding + rentalOutstanding + yangoLatePayments;

    return {
      sale: {
        revenue: saleRevenue,
        expenses: saleExpenses,
        netResult: saleNetResult,
        outstanding: saleOutstanding,
      },
      rental: {
        revenue: rentalRevenue,
        expenses: rentalExpenses,
        netResult: rentalNetResult,
        outstanding: rentalOutstanding,
      },
      yango: {
        revenue: yangoRevenue,
        expenses: yangoExpenses,
        ownerPaymentsPaid: yangoOwnerPaid,
        ownerPaymentsRemaining: yangoOwnerRemaining,
        netResult: yangoNetResult,
        latePayments: yangoLatePayments,
      },
      global: {
        revenue: globalRevenue,
        expenses: globalExpenses,
        netResult: globalNetResult,
        outstanding: globalOutstanding,
      },
    };
  }
}
