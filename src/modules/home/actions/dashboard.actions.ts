"use server";

import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { DashboardDao, type DashboardStats } from "../data/dashboard.dao";

export interface DashboardResult {
  success: boolean;
  data?: DashboardStats;
  error?: string;
}

export async function getDashboardData(): Promise<DashboardResult> {
  try {
    // Get authenticated user
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return {
        success: false,
        error: "Authentication required"
      };
    }

    const userId = session.user.id;

    // Use DAO to get dashboard data
    const dashboardData = await DashboardDao.getDashboardDataByUser(userId);

    return {
      success: true,
      data: dashboardData
    };

  } catch (error) {
    console.error("Error fetching dashboard data:", error);

    return {
      success: false,
      error: error instanceof Error ? error.message : "An unexpected error occurred"
    };
  }
}