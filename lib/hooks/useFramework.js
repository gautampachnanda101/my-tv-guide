/**
 * @fileoverview Example React hooks for framework integration
 */

'use client';

import { useState, useEffect, useCallback } from 'react';

/**
 * Custom hook to fetch guide data with framework
 * @param {string} region - Region code
 * @param {Object} options - Fetch options
 * @returns {Object} Guide data and loading state
 */
export function useGuideData(region = 'uk', options = {}) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const params = new URLSearchParams({
        region,
        ...(options.query && { query: options.query }),
        ...(options.date && { date: options.date.toISOString() })
      });
      
      const response = await fetch(`/api/guide-v2?${params}`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch: ${response.statusText}`);
      }
      
      const json = await response.json();
      setData(json);
      
    } catch (err) {
      console.error('[useGuideData] Error:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [region, options.query, options.date]);
  
  useEffect(() => {
    fetchData();
  }, [fetchData]);
  
  return { data, loading, error, refetch: fetchData };
}

/**
 * Custom hook to fetch framework stats
 * @returns {Object} Framework stats and loading state
 */
export function useFrameworkStats() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  useEffect(() => {
    async function fetchStats() {
      try {
        const response = await fetch('/api/framework-stats');
        
        if (!response.ok) {
          throw new Error(`Failed to fetch: ${response.statusText}`);
        }
        
        const json = await response.json();
        setStats(json);
        
      } catch (err) {
        console.error('[useFrameworkStats] Error:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    
    fetchStats();
  }, []);
  
  return { stats, loading, error };
}

/**
 * Custom hook for region selection
 * @param {string} defaultRegion - Default region code
 * @returns {Object} Region state and setter
 */
export function useRegion(defaultRegion = 'uk') {
  const [region, setRegion] = useState(defaultRegion);
  const [supportedRegions, setSupportedRegions] = useState([]);
  
  useEffect(() => {
    async function fetchRegions() {
      try {
        const response = await fetch('/api/framework-stats');
        const stats = await response.json();
        
        const regions = Array.from(
          new Set(stats.providers.map(p => p.region))
        );
        
        setSupportedRegions(regions);
      } catch (err) {
        console.error('[useRegion] Error:', err);
      }
    }
    
    fetchRegions();
  }, []);
  
  return {
    region,
    setRegion,
    supportedRegions,
    isSupported: (code) => supportedRegions.includes(code)
  };
}

/**
 * Custom hook for filtered guide data
 * @param {string} region - Region code
 * @param {Object} filters - Filter options
 * @returns {Object} Filtered data and controls
 */
export function useFilteredGuide(region = 'uk', initialFilters = {}) {
  const [filters, setFilters] = useState(initialFilters);
  const { data, loading, error, refetch } = useGuideData(region, filters);
  
  const updateFilter = useCallback((key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  }, []);
  
  const clearFilters = useCallback(() => {
    setFilters({});
  }, []);
  
  return {
    data,
    loading,
    error,
    refetch,
    filters,
    updateFilter,
    clearFilters
  };
}
