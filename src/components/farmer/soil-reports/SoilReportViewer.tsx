import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Download, ExternalLink, ZoomIn, ZoomOut, X, FileText, Calendar, Building2 } from 'lucide-react';
import { SoilTestReport, useSignedUrl } from '@/hooks/useSoilReports';
import { format } from 'date-fns';

interface SoilReportViewerProps {
  report: SoilTestReport | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function SoilReportViewer({ report, open, onOpenChange }: SoilReportViewerProps) {
  const { data: signedUrl, isLoading } = useSignedUrl(report?.report_file_path || null);
  const [zoom, setZoom] = useState(1);
  const [fullscreen, setFullscreen] = useState(false);

  if (!report) return null;

  const isImage = report.report_file_type === 'image';
  const isPdf = report.report_file_type === 'pdf';

  const handleDownload = () => {
    if (signedUrl) {
      window.open(signedUrl, '_blank');
    }
  };

  const valueChips = [
    report.ph != null && { label: 'pH', value: report.ph },
    report.nitrogen != null && { label: 'N', value: report.nitrogen },
    report.phosphorus != null && { label: 'P', value: report.phosphorus },
    report.potassium != null && { label: 'K', value: report.potassium },
    report.organic_carbon != null && { label: 'OC', value: `${report.organic_carbon}%` },
    report.ec != null && { label: 'EC', value: report.ec },
  ].filter(Boolean) as { label: string; value: number | string }[];

  // Fullscreen image viewer
  if (fullscreen && isImage && signedUrl) {
    return (
      <div className="fixed inset-0 z-50 bg-black flex items-center justify-center">
        <div className="absolute top-4 right-4 flex gap-2 z-10">
          <Button
            variant="secondary"
            size="icon"
            onClick={() => setZoom((z) => Math.min(z + 0.5, 3))}
          >
            <ZoomIn className="h-4 w-4" />
          </Button>
          <Button
            variant="secondary"
            size="icon"
            onClick={() => setZoom((z) => Math.max(z - 0.5, 0.5))}
          >
            <ZoomOut className="h-4 w-4" />
          </Button>
          <Button variant="secondary" size="icon" onClick={handleDownload}>
            <Download className="h-4 w-4" />
          </Button>
          <Button variant="secondary" size="icon" onClick={() => setFullscreen(false)}>
            <X className="h-4 w-4" />
          </Button>
        </div>
        <div className="overflow-auto max-w-full max-h-full p-4">
          <img
            src={signedUrl}
            alt="Soil Report"
            style={{ transform: `scale(${zoom})`, transformOrigin: 'center' }}
            className="transition-transform duration-200"
          />
        </div>
      </div>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Soil Test Report
          </DialogTitle>
        </DialogHeader>

        {/* Report Metadata */}
        <div className="flex flex-wrap gap-3 text-sm text-muted-foreground border-b pb-3">
          <div className="flex items-center gap-1.5">
            <Calendar className="h-4 w-4" />
            {format(new Date(report.report_date), 'dd MMM yyyy')}
          </div>
          {report.lab_name && (
            <div className="flex items-center gap-1.5">
              <Building2 className="h-4 w-4" />
              {report.lab_name}
            </div>
          )}
          <Badge variant="outline" className="capitalize">
            {report.report_file_type}
          </Badge>
        </div>

        {/* Value Chips */}
        {valueChips.length > 0 && (
          <div className="flex flex-wrap gap-2 py-2">
            {valueChips.map((chip) => (
              <Badge key={chip.label} variant="secondary">
                {chip.label}: {chip.value}
              </Badge>
            ))}
          </div>
        )}

        {/* Notes */}
        {report.notes && (
          <p className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-lg">
            {report.notes}
          </p>
        )}

        {/* File Preview */}
        <div className="flex-1 overflow-auto min-h-0">
          {isLoading ? (
            <Skeleton className="w-full h-64 rounded-lg" />
          ) : signedUrl ? (
            isImage ? (
              <div className="relative">
                <img
                  src={signedUrl}
                  alt="Soil Report"
                  className="w-full rounded-lg cursor-pointer"
                  onClick={() => setFullscreen(true)}
                />
                <div className="absolute bottom-2 right-2">
                  <Button size="sm" variant="secondary" onClick={() => setFullscreen(true)}>
                    <ZoomIn className="h-4 w-4 mr-1" />
                    Full Screen
                  </Button>
                </div>
              </div>
            ) : isPdf ? (
              <div className="flex flex-col items-center gap-4 p-8 border rounded-lg bg-muted/30">
                <FileText className="h-16 w-16 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">PDF Document</p>
                <Button onClick={handleDownload}>
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Open PDF in New Tab
                </Button>
              </div>
            ) : null
          ) : (
            <div className="flex items-center justify-center h-64 text-muted-foreground">
              Unable to load file
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-2 pt-3 border-t">
          <Button variant="outline" onClick={handleDownload} disabled={!signedUrl}>
            <Download className="h-4 w-4 mr-2" />
            Download
          </Button>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
