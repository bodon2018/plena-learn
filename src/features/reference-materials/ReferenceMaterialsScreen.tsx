"use client";

import { useReferenceMaterials } from "./hooks/useReferenceMaterials";
import UploadMaterialForm from "./components/UploadMaterialForm";
import MaterialsList from "./components/MaterialsList";

/**
 * Reference Materials management screen.
 * 
 * Features:
 * - Upload PDF documents to ground AI reports
 * - Name and describe each material
 * - View all uploaded materials
 * - Delete materials when no longer needed
 */
export default function ReferenceMaterialsScreen() {
  const materials = useReferenceMaterials();

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-heading-1 text-ink">Reference Materials</h1>
        <p className="text-body text-mute mt-1">
          Upload organizational documents to enhance AI-generated reports with your context
        </p>
      </div>

      {/* Upload form */}
      <UploadMaterialForm
        form={materials.form}
        onFieldChange={materials.setFormField}
        onFileChange={materials.setFile}
        canUpload={materials.canUpload}
        isUploading={materials.isUploading}
        error={materials.uploadError}
        onSubmit={materials.uploadMaterial}
      />

      {/* Materials list */}
      <MaterialsList
        materials={materials.materials}
        isLoading={materials.isLoading}
        error={materials.loadError}
        deletingIds={materials.deletingIds}
        deleteError={materials.deleteError}
        onRefresh={materials.refreshMaterials}
        onDelete={materials.deleteMaterial}
      />
    </div>
  );
}