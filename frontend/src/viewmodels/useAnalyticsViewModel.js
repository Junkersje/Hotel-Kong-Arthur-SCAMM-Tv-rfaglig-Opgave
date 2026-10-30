/**
 * MVVM: ViewModel Layer - useAnalyticsViewModel
 * Håndterer datahentning og formatering af ledelsens hovednøgletal (KPI'er).
 */

import { useState, useEffect, useCallback } from 'react';
import { apiGet } from '../services/api.js';

export function useAnalyticsViewModel() {
  const [summary, setSummary] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchSummary = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await apiGet('/analytics/summary');
      setSummary(data);
    } catch (err) {
      setError(err.message || 'Kunne ikke hente analysedata');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSummary();
  }, [fetchSummary]);

  return {
    summary,
    isLoading,
    error,
    refreshAnalytics: fetchSummary
  };
}
