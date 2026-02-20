import { useState } from 'react';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription } from '@/components/ui/drawer';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Plus, 
  Calendar, 
  AlertCircle, 
  CheckCircle2, 
  Clock, 
  FileImage, 
  FileText,
  Eye,
  Download,
  Trash2,
  Building2,
  TrendingUp
} from 'lucide-react';
import { format, differenceInMonths } from 'date-fns';
import { Farmland } from '@/hooks/useFarmerDashboard';
import { useSoilReports, useLatestSoilReport, useDeleteSoilReport, useSignedUrl, SoilTestReport } from '@/hooks/useSoilReports';
import SoilReportUploadDialog from './SoilReportUploadDialog';
import SoilReportViewer from './SoilReportViewer';
import SoilTrendChart from './SoilTrendChart';
import ConfirmDialog from '@/components/ui/confirm-dialog';

interface FarmlandSoilReportsPanelProps {
  farmland: Farmland | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function getTestStatusBadge(lastTestDate: string | null) {
  if (!lastTestDate) {
    return { variant: 'destructive' as const, label: 'No test yet', icon: AlertCircle };
  }

  const monthsAgo = differenceInMonths(new Date(), new Date(lastTestDate));
  
  if (monthsAgo <= 6) {
    return { variant: 'default' as const, label: 'Recent', icon: CheckCircle2 };
  } else if (monthsAgo <= 12) {
    return { variant: 'secondary' as const, label: `${monthsAgo}mo ago`, icon: Clock };
  } else {
    return { variant: 'destructive' as const, label: `${monthsAgo}mo ago`, icon: AlertCircle };
  }
}

function ReportListItem({ 
  report, 
  onView, 
  onDelete 
}: { 
  report: SoilTestReport; 
  onView: () => void;
  onDelete: () => void;
}) {
  const { data: signedUrl } = useSignedUrl(report.report_file_path);
  const isImage = report.report_file_type === 'image';

  const valueChips = [
    report.ph != null && { label: 'pH', value: report.ph },
    report.nitrogen != null && { label: 'N', value: report.nitrogen },
    report.phosphorus != null && { label: 'P', value: report.phosphorus },
    report.potassium != null && { label: 'K', value: report.potassium },
  ].filter(Boolean) as { label: string; value: number }[];

  return (
    <div className="flex items-start gap-3 p-3 border rounded-lg hover:bg-muted/30 transition-colors">
      <div className="p-2 rounded-lg bg-muted">
        {isImage ? (
          <FileImage className="h-5 w-5 text-primary" />
        ) : (
          <FileText className="h-5 w-5 text-primary" />
        )}
      </div>
      
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="font-medium text-sm">
            {format(new Date(report.report_date), 'dd MMM yyyy')}
          </span>
          {report.lab_name && (
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <Building2 className="h-3 w-3" />
              {report.lab_name}
            </span>
          )}
        </div>
        
        {valueChips.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1">
            {valueChips.map((chip) => (
              <Badge key={chip.label} variant="outline" className="text-xs py-0">
                {chip.label}: {chip.value}
              </Badge>
            ))}
          </div>
        )}
      </div>

      <div className="flex gap-1 shrink-0">
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onView}>
          <Eye className="h-4 w-4" />
        </Button>
        {signedUrl && (
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-8 w-8"
            onClick={() => window.open(signedUrl, '_blank')}
          >
            <Download className="h-4 w-4" />
          </Button>
        )}
        <Button 
          variant="ghost" 
          size="icon" 
          className="h-8 w-8 text-destructive hover:text-destructive"
          onClick={onDelete}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

export default function FarmlandSoilReportsPanel({
  farmland,
  open,
  onOpenChange,
}: FarmlandSoilReportsPanelProps) {
  const { data: reports, isLoading } = useSoilReports(farmland?.id || '');
  const { data: latestReport } = useLatestSoilReport(farmland?.id || '');
  const deleteMutation = useDeleteSoilReport();
  
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [viewingReport, setViewingReport] = useState<SoilTestReport | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [reportToDelete, setReportToDelete] = useState<SoilTestReport | null>(null);

  if (!farmland) return null;

  const status = getTestStatusBadge(latestReport?.report_date || null);
  const StatusIcon = status.icon;
  const monthsSinceTest = latestReport 
    ? differenceInMonths(new Date(), new Date(latestReport.report_date))
    : null;

  const handleDeleteClick = (report: SoilTestReport) => {
    setReportToDelete(report);
    setDeleteConfirmOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!reportToDelete) return;
    await deleteMutation.mutateAsync({ report: reportToDelete });
    setDeleteConfirmOpen(false);
    setReportToDelete(null);
  };

  return (
    <>
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent className="max-h-[90vh]">
          <DrawerHeader className="border-b">
            <DrawerTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Soil Reports - {farmland.name}
            </DrawerTitle>
            <DrawerDescription>
              {farmland.area} {farmland.area_unit} • {farmland.village || 'Unknown location'}
            </DrawerDescription>
          </DrawerHeader>

          <ScrollArea className="flex-1 p-4">
            <div className="space-y-6">
              {/* Header Summary */}
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Badge variant={status.variant} className="flex items-center gap-1">
                        <StatusIcon className="h-3.5 w-3.5" />
                        {status.label}
                      </Badge>
                      {latestReport && (
                        <span className="text-sm text-muted-foreground">
                          Last tested: {format(new Date(latestReport.report_date), 'dd MMM yyyy')}
                        </span>
                      )}
                    </div>
                    <Button onClick={() => setUploadDialogOpen(true)}>
                      <Plus className="h-4 w-4 mr-2" />
                      Upload Report
                    </Button>
                  </div>

                  {/* Reminder */}
                  {monthsSinceTest !== null && monthsSinceTest > 12 && (
                    <div className="mt-4 p-3 bg-destructive/10 rounded-lg flex items-start gap-2">
                      <AlertCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
                      <div>
                        <p className="font-medium text-sm text-destructive">
                          Soil test overdue
                        </p>
                        <p className="text-xs text-muted-foreground">
                          It's been {monthsSinceTest} months since your last soil test. Consider getting a new test for better crop planning.
                        </p>
                      </div>
                    </div>
                  )}

                  {!latestReport && (
                    <div className="mt-4 p-3 bg-muted rounded-lg flex items-start gap-2">
                      <AlertCircle className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                      <div>
                        <p className="font-medium text-sm">No soil reports yet</p>
                        <p className="text-xs text-muted-foreground">
                          Upload your first soil test report to track soil health over time.
                        </p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Trend Chart */}
              {reports && reports.length >= 2 && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <TrendingUp className="h-4 w-4" />
                      Soil Health Trends
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <SoilTrendChart reports={reports} />
                  </CardContent>
                </Card>
              )}

              {/* Reports History */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Report History</CardTitle>
                </CardHeader>
                <CardContent>
                  {isLoading ? (
                    <div className="space-y-3">
                      {[1, 2, 3].map((i) => (
                        <Skeleton key={i} className="h-16 rounded-lg" />
                      ))}
                    </div>
                  ) : reports?.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <FileText className="h-12 w-12 mx-auto mb-3 opacity-50" />
                      <p className="text-sm">No reports uploaded yet</p>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="mt-3"
                        onClick={() => setUploadDialogOpen(true)}
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Upload First Report
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {reports?.map((report) => (
                        <ReportListItem
                          key={report.id}
                          report={report}
                          onView={() => setViewingReport(report)}
                          onDelete={() => handleDeleteClick(report)}
                        />
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </ScrollArea>
        </DrawerContent>
      </Drawer>

      {/* Upload Dialog */}
      <SoilReportUploadDialog
        open={uploadDialogOpen}
        onOpenChange={setUploadDialogOpen}
        farmlandId={farmland.id}
        farmlandName={farmland.name}
      />

      {/* Viewer Dialog */}
      <SoilReportViewer
        report={viewingReport}
        open={!!viewingReport}
        onOpenChange={(open) => !open && setViewingReport(null)}
      />

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={deleteConfirmOpen}
        onOpenChange={setDeleteConfirmOpen}
        title="Delete Soil Report"
        description={`Are you sure you want to delete this soil report from ${reportToDelete ? format(new Date(reportToDelete.report_date), 'dd MMM yyyy') : ''}? This action cannot be undone.`}
        confirmText="Delete"
        variant="destructive"
        onConfirm={handleDeleteConfirm}
        loading={deleteMutation.isPending}
      />
    </>
  );
}
