"use client";

import { useDataSources } from "./hooks/useDataSources";
import UploadCard from "./components/UploadCard";
import DataOverviewCard from "./components/DataOverviewCard";

/**
 * Data Sources management screen.
 * 
 * Features:
 * - Upload CSV files with drag & drop
 * - View list of uploaded files
 * - Select a file to see its overview
 * - Delete files
 */
export default function DataSourcesScreen() {
  const dataSources = useDataSources();

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-heading-1 text-ink">Data Sources</h1>
        <p className="text-body text-mute mt-1">
          Upload and manage CSV files for your metrics
        </p>
      </div>

      {/* Upload and file list */}
      <UploadCard
        files={dataSources.files}
        filesLoading={dataSources.filesLoading}
        filesError={dataSources.filesError}
        uploading={dataSources.uploading}
        uploadError={dataSources.uploadError}
        selectedSavedPath={dataSources.selectedSavedPath}
        deletingPath={dataSources.deletingPath}
        deleteError={dataSources.deleteError}
        onRefresh={dataSources.refreshFiles}
        onUpload={dataSources.uploadCsv}
        onSelect={dataSources.selectFile}
        onClear={dataSources.clearSelection}
        onDelete={dataSources.deleteCsv}
      />

      {/* Data overview */}
      <DataOverviewCard
        selectedFile={dataSources.selectedFile}
        overview={dataSources.overview}
        isLoading={dataSources.overviewLoading}
        error={dataSources.overviewError}
      />
    </div>
  );
}