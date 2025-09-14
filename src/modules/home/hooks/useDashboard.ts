"use client";

import { useState, useEffect } from "react";
import { getDashboardData } from "../actions/dashboard.actions";
import type { DashboardStats } from "../data/dashboard.dao";

export const useDashboard = () => {
  const [data, setData] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadDashboardData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const result = await getDashboardData();
        
        if (result.success && result.data) {
          setData(result.data);
        } else {
          setError(result.error || "Failed to load dashboard data");
        }
      } catch (err) {
        console.error("Error loading dashboard:", err);
        setError("An unexpected error occurred");
      } finally {
        setLoading(false);
      }
    };

    loadDashboardData();
  }, []);

  return { data, loading, error };
};