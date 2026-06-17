import type {
  SessionReport,
  MonthlyReportSummary,
} from "@/lib/types";
import { apiClient } from "@/lib/api-client";

export async function getSessionReports(date: string): Promise<SessionReport[]> {
  return apiClient.get<SessionReport[]>(`/reports?date=${date}`);
}

export async function getMonthlyReport(month: number, year: number): Promise<MonthlyReportSummary> {
  return apiClient.get<MonthlyReportSummary>(`/reports/monthly?month=${month}&year=${year}`);
}
