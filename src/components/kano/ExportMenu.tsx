import { Download, FileText, Sheet, Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import type { KanoTableData } from "@/lib/kano-types";
import type { Insight } from "@/components/kano/InsightsPanel";
import { downloadCsv, triggerDownload } from "@/lib/export/csv";

function slugify(title: string): string {
  return (
    title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60) || "kanolens-report"
  );
}

export function ExportMenu({
  title,
  table,
  insights,
}: {
  title: string;
  table: KanoTableData;
  insights: Insight[];
}) {
  const [busy, setBusy] = useState(false);
  const slug = slugify(title);

  async function exportPdf() {
    setBusy(true);
    try {
      // Lazy-load the PDF renderer (heavy) only when the user actually exports.
      const [{ pdf }, { ReportPdf }] = await Promise.all([
        import("@react-pdf/renderer"),
        import("@/lib/export/ReportPdf"),
      ]);
      const generatedAt = new Date().toLocaleDateString(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
      const blob = await pdf(
        <ReportPdf title={title} table={table} insights={insights} generatedAt={generatedAt} />,
      ).toBlob();
      triggerDownload(blob, `${slug}.pdf`);
    } catch {
      toast.error("Couldn't generate the PDF");
    } finally {
      setBusy(false);
    }
  }

  function exportCsv() {
    try {
      downloadCsv(slug, table);
    } catch {
      toast.error("Couldn't generate the CSV");
    }
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="shrink-0" disabled={busy}>
          {busy ? (
            <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
          ) : (
            <Download className="h-3.5 w-3.5 mr-1.5" />
          )}
          Export
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-44 p-1">
        <button
          type="button"
          className="flex items-center gap-2 w-full px-2 py-1.5 text-sm rounded-md hover:bg-muted text-left"
          onClick={exportPdf}
          disabled={busy}
        >
          <FileText className="h-4 w-4" /> Download PDF
        </button>
        <button
          type="button"
          className="flex items-center gap-2 w-full px-2 py-1.5 text-sm rounded-md hover:bg-muted text-left"
          onClick={exportCsv}
        >
          <Sheet className="h-4 w-4" /> Download CSV
        </button>
      </PopoverContent>
    </Popover>
  );
}
