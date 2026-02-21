import React from "react";

export const HealthKPI: React.FC<{ label: string; value: string | number | null }> = ({ label, value }) => {
  return (
    <div className="p-3 border rounded bg-white shadow-sm">
      <div className="text-sm text-gray-500">{label}</div>
      <div className="text-2xl font-semibold">{value ?? "-"}</div>
    </div>
  );
};

