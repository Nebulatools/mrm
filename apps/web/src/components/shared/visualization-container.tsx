"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Copy, Download, Maximize2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useVisualizationExportContext } from "@/context/visualization-export-context";

type VisualizationType = "chart" | "table";

interface VisualizationContainerProps {
  title: string;
  type: VisualizationType;
  className?: string;
  children: (isFullscreen: boolean) => React.ReactNode;
  filename?: string;
}

const sanitizeFileName = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9-_]+/g, "-")
    .replace(/-{2,}/g, "-")
    .replace(/^-|-$|\s+/g, "") || "visualizacion";

export function VisualizationContainer({
  title,
  type,
  className,
  children,
  filename
}: VisualizationContainerProps) {
  const baseRef = useRef<HTMLDivElement | null>(null);
  const fullscreenRef = useRef<HTMLDivElement | null>(null);
  const feedbackTimer = useRef<number>();
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const fileBase = useMemo(() => sanitizeFileName(filename ?? title), [filename, title]);
  const exportContext = useVisualizationExportContext();
  const exportMetaLines = useMemo(() => {
    if (!exportContext) {
      return [];
    }

    const lines: string[] = [];

    if (exportContext.periodLabel) {
      lines.push(`Período: ${exportContext.periodLabel}`);
    }

    if (exportContext.lastUpdatedLabel) {
      lines.push(`Actualizado: ${exportContext.lastUpdatedLabel}`);
    }

    if (exportContext.filtersCount > 0) {
      if (exportContext.filtersDetailedLines.length > 0) {
        lines.push("Filtros activos:");
        lines.push(...exportContext.filtersDetailedLines);
      } else if (exportContext.filtersSummary) {
        lines.push(`Filtros activos: ${exportContext.filtersSummary}`);
      }
    } else {
      lines.push("Filtros activos: Sin filtros adicionales");
    }

    return lines;
  }, [exportContext]);

  const clearFeedback = useCallback(() => {
    if (feedbackTimer.current) {
      window.clearTimeout(feedbackTimer.current);
      feedbackTimer.current = undefined;
    }
  }, []);

  const showFeedback = useCallback((message: string) => {
    clearFeedback();
    setFeedback(message);
    feedbackTimer.current = window.setTimeout(() => {
      setFeedback(null);
      feedbackTimer.current = undefined;
    }, 2400);
  }, [clearFeedback]);

  useEffect(() => clearFeedback, [clearFeedback]);

  useEffect(() => {
    if (!isFullscreen) return;
    window.dispatchEvent(new Event("resize"));
    const handle = window.setTimeout(() => {
      window.dispatchEvent(new Event("resize"));
    }, 180);
    return () => window.clearTimeout(handle);
  }, [isFullscreen]);

  const getActiveElement = () => (isFullscreen ? fullscreenRef.current : baseRef.current);

  const getSvgElement = (container: HTMLElement) => {
    const svg = container.querySelector("svg");
    return svg instanceof SVGElement ? svg : null;
  };

  const wrapText = (text: string, maxChars = 68) => {
    const words = text.split(/\s+/).filter(Boolean);
    const lines: string[] = [];
    let currentLine = "";

    for (const word of words) {
      const candidate = currentLine ? `${currentLine} ${word}` : word;
      if (candidate.length > maxChars && currentLine) {
        lines.push(currentLine);
        currentLine = word;
      } else {
        currentLine = candidate;
      }
    }

    if (currentLine) {
      lines.push(currentLine);
    }

    return lines;
  };

  interface ChartExportOptions {
    title: string;
    metaLines: string[];
    footerLines?: string[];
  }

  const renderSvgToCanvas = async (
    svg: SVGElement,
    { title, metaLines, footerLines = [] }: ChartExportOptions
  ): Promise<HTMLCanvasElement> => {
    const rect = svg.getBoundingClientRect();
    const widthAttr = parseFloat(svg.getAttribute("width") ?? "0");
    const heightAttr = parseFloat(svg.getAttribute("height") ?? "0");
    const width = Math.max(rect.width, widthAttr, 1);
    const height = Math.max(rect.height, heightAttr, 1);
    const scale = window.devicePixelRatio || 1;

    const exportWidth = Math.max(width, 920);
    const paddingX = 48;
    const paddingTop = 36;
    const paddingBottom = 32;
    const titleFontSize = 26;
    const metaLineHeight = 20;
    const footerLineHeight = 18;
    const spaceAfterTitle = 12;
    const spaceBeforeChart = 28;
    const spaceBeforeFooter = 24;

    const wrappedMetaLines = metaLines.flatMap((line) => wrapText(line, 70));
    const wrappedFooterLines = footerLines.flatMap((line) =>
      wrapText(line, 70)
    );

    const metaBlockHeight = wrappedMetaLines.length
      ? spaceAfterTitle + wrappedMetaLines.length * metaLineHeight
      : 0;
    const footerBlockHeight = wrappedFooterLines.length
      ? spaceBeforeFooter + wrappedFooterLines.length * footerLineHeight
      : paddingBottom;

    const chartTop =
      paddingTop + titleFontSize + metaBlockHeight + spaceBeforeChart;
    const canvasWidthUnits = exportWidth + paddingX * 2;
    const canvasHeightUnits = chartTop + height + footerBlockHeight;

    const canvas = document.createElement("canvas");
    canvas.width = canvasWidthUnits * scale;
    canvas.height = canvasHeightUnits * scale;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      throw new Error("No se pudo crear el contexto del canvas");
    }
    ctx.setTransform(scale, 0, 0, scale, 0, 0);
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvasWidthUnits, canvasHeightUnits);

    ctx.fillStyle = "#0f172a";
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    ctx.font = "600 26px 'Inter', 'Helvetica Neue', Arial, sans-serif";
    ctx.fillText(title, canvasWidthUnits / 2, paddingTop);

    if (wrappedMetaLines.length) {
      ctx.font = "400 14px 'Inter', 'Helvetica Neue', Arial, sans-serif";
      wrappedMetaLines.forEach((line, index) => {
        ctx.fillText(
          line,
          canvasWidthUnits / 2,
          paddingTop + titleFontSize + spaceAfterTitle + index * metaLineHeight
        );
      });
    }

    const serializer = new XMLSerializer();
    const svgString = serializer.serializeToString(svg);
    const blob = new Blob([svgString], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);

    await new Promise<void>((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const chartX = paddingX + (exportWidth - width) / 2;
        ctx.drawImage(img, chartX, chartTop, width, height);

        if (wrappedFooterLines.length) {
          ctx.font = "400 12px 'Inter', 'Helvetica Neue', Arial, sans-serif";
          wrappedFooterLines.forEach((line, index) => {
            ctx.fillText(
              line,
              canvasWidthUnits / 2,
              chartTop + height + spaceBeforeFooter + index * footerLineHeight
            );
          });
        }

        URL.revokeObjectURL(url);
        resolve();
      };
      img.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error("No se pudo renderizar la visualización"));
      };
      img.src = url;
    });

    return canvas;
  };

  const copyChartAsImage = async (element: HTMLElement, toClipboard: boolean) => {
    const svg = getSvgElement(element);
    if (!svg) {
      throw new Error("No se encontró una gráfica para copiar");
    }
    const now = new Date();
    let formattedTimestamp = now.toLocaleString();
    try {
      const locale =
        typeof navigator !== "undefined" && navigator.language
          ? navigator.language
          : "es-MX";
      formattedTimestamp = new Intl.DateTimeFormat(locale, {
        dateStyle: "short",
        timeStyle: "short",
      }).format(now);
    } catch {
      // Fallback to default locale formatting
      formattedTimestamp = now.toLocaleString();
    }

    const canvas = await renderSvgToCanvas(svg, {
      title,
      metaLines: exportMetaLines,
      footerLines: [`Descargado: ${formattedTimestamp}`],
    });
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
    if (!blob) {
      throw new Error("No se pudo generar la imagen");
    }

    if (toClipboard) {
      if (!navigator.clipboard || typeof ClipboardItem === "undefined") {
        throw new Error("El navegador no permite copiar imágenes al portapapeles");
      }
      await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
    } else {
      const downloadUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = downloadUrl;
      link.download = `${fileBase}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(downloadUrl);
    }
  };

  const copyTableAsText = async (element: HTMLElement) => {
    const table = element.querySelector("table");
    if (!table) {
      throw new Error("No se encontró una tabla para copiar");
    }
    const rows = Array.from(table.querySelectorAll("tr"));
    const lines = rows
      .map((row) => {
        const cells = Array.from(row.querySelectorAll("th,td"));
        return cells
          .map((cell) => cell.textContent?.replace(/\s+/g, " ").trim() ?? "")
          .join("\t");
      })
      .join("\n");
    await navigator.clipboard.writeText(lines);
  };

  const downloadTableAsExcel = async (element: HTMLElement) => {
    const table = element.querySelector("table");
    if (!table) {
      throw new Error("No se encontró una tabla para exportar");
    }
    const XLSX = await import("xlsx");
    const workbook = XLSX.utils.table_to_book(table, { sheet: "Datos" });
    const wbout = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
    const blob = new Blob([wbout], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${fileBase}.xlsx`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleCopy = useCallback(async () => {
    const element = getActiveElement();
    if (!element) return;

    try {
      if (type === "chart") {
        await copyChartAsImage(element, true);
        showFeedback("Gráfica copiada como PNG");
      } else {
        if (!navigator.clipboard) {
          throw new Error("El navegador no permite copiar al portapapeles");
        }
        await copyTableAsText(element);
        showFeedback("Tabla copiada al portapapeles");
      }
    } catch (error) {
      console.error(error);
      showFeedback("No se pudo completar la acción");
    }
  }, [type, showFeedback, isFullscreen]);

  const handleDownload = useCallback(async () => {
    const element = getActiveElement();
    if (!element) return;

    try {
      if (type === "chart") {
        await copyChartAsImage(element, false);
        showFeedback("Gráfica descargada en PNG");
      } else {
        await downloadTableAsExcel(element);
        showFeedback("Tabla exportada a Excel");
      }
    } catch (error) {
      console.error(error);
      showFeedback("No se pudo completar la acción");
    }
  }, [type, showFeedback, isFullscreen]);

  const renderControls = (includeExpand: boolean) => (
    <div className="pointer-events-auto flex gap-2">
      <Button
        size="icon"
        variant="ghost"
        className="h-8 w-8 bg-white/90 text-gray-700 shadow-sm hover:bg-white"
        onClick={handleCopy}
        title={type === "chart" ? "Copiar como PNG" : "Copiar tabla"}
        aria-label={type === "chart" ? "Copiar gráfica como PNG" : "Copiar tabla"}
      >
        <Copy className="h-4 w-4" />
      </Button>
      <Button
        size="icon"
        variant="ghost"
        className="h-8 w-8 bg-white/90 text-gray-700 shadow-sm hover:bg-white"
        onClick={handleDownload}
        title={type === "chart" ? "Descargar PNG" : "Descargar Excel"}
        aria-label={type === "chart" ? "Descargar gráfica como PNG" : "Descargar tabla como Excel"}
      >
        <Download className="h-4 w-4" />
      </Button>
      {includeExpand && (
        <Button
          size="icon"
          variant="ghost"
          className="h-8 w-8 bg-white/90 text-gray-700 shadow-sm hover:bg-white"
          onClick={() => setIsFullscreen(true)}
          title="Ver en pantalla completa"
          aria-label="Ver en pantalla completa"
        >
          <Maximize2 className="h-4 w-4" />
        </Button>
      )}
    </div>
  );

  return (
    <>
      <div className={cn("group relative", className)}>
        <div ref={baseRef} className="w-full">
          {children(false)}
        </div>
        <div className="pointer-events-none absolute right-3 top-3 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
          {renderControls(true)}
        </div>
        {feedback && (
          <div className="pointer-events-none absolute left-3 bottom-3 rounded-full bg-gray-900/80 px-3 py-1 text-xs text-white shadow">
            {feedback}
          </div>
        )}
      </div>

      <Dialog open={isFullscreen} onOpenChange={setIsFullscreen}>
        <DialogContent className={cn(
          "w-[95vw]",
          type === "table" ? "max-w-[1400px]" : "max-w-6xl"
        )}>
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
          </DialogHeader>
          <div className="relative mt-4">
            <div className="absolute right-3 top-3 flex gap-2 z-10">
              {renderControls(false)}
            </div>
            <div
              ref={fullscreenRef}
              className={cn(
                "max-h-[75vh] w-full overflow-auto rounded-xl border bg-white p-6",
                type === "chart" && "flex w-full items-center justify-center"
              )}
              style={{
                minWidth: type === "chart" ? "min(960px, 100%)" : undefined,
                minHeight: type === "chart" ? "360px" : undefined,
              }}
            >
              <div
                className={cn(type === "chart" && "w-full")}
                key={isFullscreen ? "fullscreen-open" : "fullscreen-closed"}
              >
                {children(true)}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
