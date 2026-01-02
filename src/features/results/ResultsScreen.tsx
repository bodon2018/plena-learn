"use client";

import { useResults } from "./hooks/useResults";
import RunMetricCard from "./components/RunMetricCard";
import SmartResultCard from "./components/SmartResultCard";
import PlotsCard from "./components/PlotsCard";

/**
 * Results and Visualizations screen.
 * 
 * Features:
 * - Select a metric definition and CSV file
 * - Run the metric with animated progress indicator
 * - View numeric results with smart formatting
 * - Display generated visualizations/plots
 */
export default function ResultsScreen() {
  const results = useResults();

  const hasRun = Boolean(results.runJob);
  const isRunning = results.isRunning || (results.latestRun?.status === "running" || results.latestRun?.status === "queued");

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-heading-1 text-ink">Results</h1>
        <p className="text-body text-mute mt-1">
          Run metrics on your data and visualize the results.
        </p>
      </div>

      {/* Run metric controls */}
      <RunMetricCard
        metrics={results.definitions}
        metricsLoading={results.metricsLoading}
        metricsError={results.metricsError}
        onRefreshMetrics={results.refreshMetrics}
        selectedMetricId={results.selectedMetricJobId}
        onSelectMetric={results.setSelectedMetricJobId}
        selectedMetric={results.selectedMetric}
        csvs={results.csvs}
        csvsLoading={results.csvsLoading}
        csvsError={results.csvsError}
        onRefreshCsvs={results.refreshCsvs}
        selectedCsvPath={results.selectedCsvPath}
        onSelectCsv={results.setSelectedCsvPath}
        isRunning={results.isRunning}
        runError={results.runError}
        onRun={results.runMetric}
        onRefreshRun={results.refreshRun}
        latestRun={results.latestRun}
        statusMessage={results.statusMessage}
        hasRunJob={hasRun}
      />

      {/* Smart results display */}
      <SmartResultCard
        hasRun={hasRun}
        isRunning={isRunning}
        isSuccess={results.isRunSuccess}
        isFailed={results.isRunFailed}
        result={results.numericResult}
        disclaimer={results.dataDisclaimer}
        stdout={results.latestRun?.stdout}
      />

      {/* Plots */}
      <PlotsCard
        hasRun={hasRun}
        isRunning={isRunning}
        isSuccess={results.isRunSuccess}
        isFailed={results.isRunFailed}
        plots={results.plots}
      />
    </div>
  );
}