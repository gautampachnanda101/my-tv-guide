/**
 * @fileoverview Example UI components for framework integration
 */

'use client';

import { useFrameworkStats, useRegion } from '../hooks/useFramework';

/**
 * Framework status indicator component
 */
export function FrameworkStatus() {
  const { stats, loading, error } = useFrameworkStats();
  
  if (loading) {
    return <div className="text-sm text-gray-500">Loading framework...</div>;
  }
  
  if (error) {
    return <div className="text-sm text-red-500">Framework error: {error}</div>;
  }
  
  if (!stats) return null;
  
  return (
    <div className="bg-gray-50 rounded-lg p-4 text-sm">
      <h3 className="font-semibold mb-2">Framework Status</h3>
      <div className="space-y-1 text-gray-700">
        <div>Plugins: {stats.framework.plugins.loaded}/{stats.framework.plugins.totalPlugins} loaded</div>
        <div>Providers: {stats.framework.providers.enabled}/{stats.framework.providers.total} enabled</div>
        <div>Regions: {stats.framework.regions.totalRegions} supported</div>
      </div>
    </div>
  );
}

/**
 * Region selector component
 */
export function RegionSelector({ onChange }) {
  const { region, setRegion, supportedRegions } = useRegion();
  
  const handleChange = (e) => {
    const newRegion = e.target.value;
    setRegion(newRegion);
    if (onChange) onChange(newRegion);
  };
  
  if (supportedRegions.length === 0) return null;
  
  return (
    <div className="flex items-center gap-2">
      <label htmlFor="region-select" className="text-sm font-medium">
        Region:
      </label>
      <select
        id="region-select"
        value={region}
        onChange={handleChange}
        className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
      >
        {supportedRegions.map(code => (
          <option key={code} value={code}>
            {code.toUpperCase()}
          </option>
        ))}
      </select>
    </div>
  );
}

/**
 * Provider status list component
 */
export function ProviderStatusList() {
  const { stats, loading } = useFrameworkStats();
  
  if (loading) return <div>Loading providers...</div>;
  if (!stats) return null;
  
  const providersByRegion = stats.providers.reduce((acc, provider) => {
    if (!acc[provider.region]) acc[provider.region] = [];
    acc[provider.region].push(provider);
    return acc;
  }, {});
  
  return (
    <div className="space-y-6">
      {Object.entries(providersByRegion).map(([region, providers]) => (
        <div key={region} className="border border-gray-200 rounded-lg p-4">
          <h3 className="font-semibold text-lg mb-3 uppercase">{region}</h3>
          <div className="space-y-2">
            {providers.map(provider => (
              <div
                key={provider.id}
                className="flex items-center justify-between p-3 bg-gray-50 rounded"
              >
                <div>
                  <div className="font-medium">{provider.name}</div>
                  <div className="text-sm text-gray-500">
                    Type: {provider.type} | Priority: {provider.priority}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={`px-2 py-1 text-xs rounded ${
                      provider.enabled
                        ? 'bg-green-100 text-green-700'
                        : 'bg-gray-100 text-gray-500'
                    }`}
                  >
                    {provider.enabled ? 'Enabled' : 'Disabled'}
                  </span>
                  {provider.hasHealthCheck && (
                    <span className="text-xs text-blue-600">❤️</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * Provider warnings component
 */
export function ProviderWarnings({ warnings = [] }) {
  if (!warnings || warnings.length === 0) return null;
  
  return (
    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
      <h4 className="font-semibold text-yellow-800 mb-2">Provider Warnings</h4>
      <ul className="space-y-1 text-sm text-yellow-700">
        {warnings.map((warning, i) => (
          <li key={i}>{warning}</li>
        ))}
      </ul>
    </div>
  );
}
