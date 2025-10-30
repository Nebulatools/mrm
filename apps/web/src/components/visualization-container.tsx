"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Copy, Download, Maximize2 } from "lucide-react";
import { cn } from "@/lib/utils";

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

  const getActiveElement = () => (isFullscreen ? fullscreenRef.current : baseRef.current);

  const getSvgElement = (container: HTMLElement) => {
    const svg = container.querySelector("svg");
    return svg instanceof SVGElement ? svg : null;
  };

  const renderSvgToCanvas = async (svg: SVGElement): Promise<HTMLCanvasElement> => {
    const rect = svg.getBoundingClientRect();
    const widthAttr = parseFloat(svg.getAttribute("width") ?? "0");
    const heightAttr = parseFloat(svg.getAttribute("height") ?? "0");
    const width = Math.max(rect.width, widthAttr, 1);
    const height = Math.max(rect.height, heightAttr, 1);
    const scale = window.devicePixelRatio || 1;

    const canvas = document.createElement("canvas");
    canvas.width = width * scale;
    canvas.height = height * scale;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      throw new Error("No se pudo crear el contexto del canvas");
    }
    ctx.setTransform(scale, 0, 0, scale, 0, 0);

    const serializer = new XMLSerializer();
    const svgString = serializer.serializeToString(svg);
    const blob = new Blob([svgString], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);

    await new Promise<void>((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        ctx.drawImage(img, 0, 0);
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
    const canvas = await renderSvgToCanvas(svg);
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

  const overlayButtons = (
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
    </div>
  );

  return (
    <>
      <div className={cn("group relative", className)}>
        <div ref={baseRef} className="w-full">
          {children(false)}
        </div>
        <div className="pointer-events-none absolute right-3 top-3 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
          {overlayButtons}
        </div>
        {feedback && (
          <div className="pointer-events-none absolute left-3 bottom-3 rounded-full bg-gray-900/80 px-3 py-1 text-xs text-white shadow">
            {feedback}
          </div>
        )}
      </div>

      <Dialog open={isFullscreen} onOpenChange={setIsFullscreen}>
        <DialogContent className="max-w-5xl">
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
          </DialogHeader>
          <div className="relative mt-4">
            <div className="absolute right-3 top-3 flex gap-2">
              {overlayButtons}
            </div>
            <div
              ref={fullscreenRef}
              className={cn(
                "max-h-[75vh] overflow-auto rounded-lg border bg-white p-3",
                type === "chart" && "flex items-center justify-center"
              )}
            >
              {children(true)}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

