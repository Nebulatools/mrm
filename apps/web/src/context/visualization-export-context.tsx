import { createContext, useContext } from "react";
import type { RetentionFilterOptions } from "@/lib/filters";

export interface VisualizationExportContextValue {
  filters: RetentionFilterOptions;
  filtersSummary: string | null;
  filtersDetailedLines: string[];
  filtersCount: number;
  periodLabel?: string | null;
  lastUpdatedLabel?: string | null;
}

const VisualizationExportContext = createContext<
  VisualizationExportContextValue | undefined
>(undefined);

interface VisualizationExportProviderProps {
  value: VisualizationExportContextValue;
  children: React.ReactNode;
}

export function VisualizationExportProvider({
  value,
  children,
}: VisualizationExportProviderProps) {
  return (
    <VisualizationExportContext.Provider value={value}>
      {children}
    </VisualizationExportContext.Provider>
  );
}

export function useVisualizationExportContext() {
  return useContext(VisualizationExportContext);
}
