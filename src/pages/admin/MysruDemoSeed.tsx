import { useState } from "react";
import DashboardLayout from "@/layouts/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { 
  Loader2, Database, CheckCircle, Users, Truck, ShoppingBag, Shield, Leaf, 
  RefreshCw, AlertTriangle, Copy, MapPin 
} from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface Credential {
  role: string;
  email: string;
  password: string;
  name: string;
}

interface SeedResult {
  success: boolean;
  message: string;
  summary: Record<string, number>;
  credentials: Credential[];
}

interface ResetResult {
  success: boolean;
  message: string;
  deleted: Record<string, number>;
}

export default function MysuruDemoSeed() {
  const [isSeeding, setIsSeeding] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [result, setResult] = useState<SeedResult | null>(null);
  const [resetResult, setResetResult] = useState<ResetResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleGenerateDemo = async () => {
    setIsSeeding(true);
    setError(null);
    setResult(null);
    setResetResult(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke("seed-mysuru-demo", {
        body: { action: "generate" },
      });

      if (fnError) throw fnError;

      if (data?.success) {
        setResult(data);
        toast.success("Mysuru Demo Ecosystem generated successfully!");
      } else {
        throw new Error(data?.error || "Failed to generate demo data");
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error occurred";
      setError(message);
      toast.error("Failed to generate demo: " + message);
    } finally {
      setIsSeeding(false);
    }
  };

  const handleResetDemo = async () => {
    if (!confirm("Are you sure you want to reset the Mysuru Demo Ecosystem? This will delete all demo data.")) {
      return;
    }
    
    setIsResetting(true);
    setError(null);
    setResult(null);
    setResetResult(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke("seed-mysuru-demo", {
        body: { action: "reset" },
      });

      if (fnError) throw fnError;

      if (data?.success) {
        setResetResult(data);
        toast.success("Mysuru Demo Ecosystem reset successfully!");
      } else {
        throw new Error(data?.error || "Failed to reset demo data");
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error occurred";
      setError(message);
      toast.error("Failed to reset demo: " + message);
    } finally {
      setIsResetting(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard!");
  };

  const getRoleIcon = (role: string) => {
    if (role.includes("Farmer")) return <Leaf className="h-4 w-4 text-green-600" />;
    if (role.includes("Agent")) return <Users className="h-4 w-4 text-blue-600" />;
    if (role.includes("Transporter")) return <Truck className="h-4 w-4 text-orange-600" />;
    if (role.includes("Buyer")) return <ShoppingBag className="h-4 w-4 text-purple-600" />;
    if (role.includes("Admin")) return <Shield className="h-4 w-4 text-red-600" />;
    return <Users className="h-4 w-4" />;
  };

  const getRoleBadgeVariant = (role: string): "default" | "secondary" | "destructive" | "outline" => {
    if (role.includes("Admin")) return "destructive";
    if (role.includes("Agent")) return "default";
    return "secondary";
  };

  return (
    <DashboardLayout title="Mysuru Demo Ecosystem">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header Card */}
        <Card className="border-primary/20 bg-gradient-to-r from-primary/5 to-transparent">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <MapPin className="h-6 w-6 text-primary" />
              </div>
              <div>
                <CardTitle>Mysuru Demo Ecosystem v2</CardTitle>
                <CardDescription>
                  Complete demo environment with Hullahalli Hobli focus, scoped admins, escalations & disputes
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <h4 className="font-medium text-sm">What gets created:</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• 15 Farmers (6 small, 6 medium, 3 large)</li>
                  <li>• 4 Agents with village coverage</li>
                  <li>• 6 Transporters with vehicles</li>
                  <li>• 6 Buyers (wholesale, retail, export)</li>
                  <li>• 6 Scoped Admins (super, state, district, taluk, village)</li>
                  <li>• 60+ Crops with realistic status distribution</li>
                  <li>• 40 Transport requests across all statuses</li>
                  <li>• 30 Market orders</li>
                  <li>• 10 Escalations + 8 Transport disputes</li>
                  <li>• 150 Notifications</li>
                </ul>
              </div>
              <div className="space-y-2">
                <h4 className="font-medium text-sm">Region:</h4>
                <div className="text-sm text-muted-foreground">
                  <p><strong>State:</strong> Karnataka</p>
                  <p><strong>District:</strong> Mysuru</p>
                  <p><strong>Taluk:</strong> Mysuru / Nanjangud</p>
                  <p><strong>Hobli:</strong> Hullahalli</p>
                  <p><strong>Villages:</strong> Hullahalli, Bannur, Somanathapura, Talakadu, Sosale, Malavalli, Kollegal, Yelandur, Chamarajanagar, Gundlupet, Nanjangud, Mysuru Rural</p>
                </div>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <Button 
                onClick={handleGenerateDemo} 
                disabled={isSeeding || isResetting}
                size="lg"
                className="flex-1"
              >
                {isSeeding ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Generating Demo...
                  </>
                ) : (
                  <>
                    <Database className="mr-2 h-5 w-5" />
                    Generate Mysuru Demo Ecosystem
                  </>
                )}
              </Button>
              
              <Button 
                onClick={handleResetDemo} 
                disabled={isSeeding || isResetting}
                size="lg"
                variant="outline"
                className="border-destructive text-destructive hover:bg-destructive/10"
              >
                {isResetting ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Resetting...
                  </>
                ) : (
                  <>
                    <RefreshCw className="mr-2 h-5 w-5" />
                    Reset Demo
                  </>
                )}
              </Button>
            </div>

            <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4 text-amber-800 dark:text-amber-200 mt-4">
              <div className="flex gap-2">
                <AlertTriangle className="h-5 w-5 flex-shrink-0" />
                <div>
                  <p className="font-medium">Important Notes</p>
                  <ul className="text-sm mt-1 space-y-1">
                    <li>• All demo data is tagged and can be safely reset without affecting real data</li>
                    <li>• Password for all demo accounts: <code className="bg-amber-100 dark:bg-amber-900 px-1 rounded">Demo@12345</code></li>
                    <li>• Generate once, then use Reset to clear and regenerate</li>
                  </ul>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Error Display */}
        {error && (
          <Card className="border-destructive">
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 text-destructive">
                <AlertTriangle className="h-5 w-5" />
                <span className="font-medium">Error: {error}</span>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Reset Result */}
        {resetResult && (
          <Card className="border-green-500">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-green-600">
                <CheckCircle className="h-5 w-5" />
                {resetResult.message}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
                {Object.entries(resetResult.deleted).filter(([_, v]) => v > 0).map(([key, value]) => (
                  <div key={key} className="bg-muted rounded-lg p-3 text-center">
                    <div className="text-xl font-bold text-destructive">{value}</div>
                    <div className="text-xs text-muted-foreground capitalize">{key.replace(/_/g, " ")}</div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Generation Result */}
        {result && (
          <>
            {/* Summary Stats */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-green-600">
                  <CheckCircle className="h-5 w-5" />
                  {result.message}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
                  {Object.entries(result.summary).map(([key, value]) => (
                    <div key={key} className="bg-muted rounded-lg p-3 text-center">
                      <div className="text-2xl font-bold">{value}</div>
                      <div className="text-xs text-muted-foreground capitalize">{key.replace(/_/g, " ")}</div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Credentials Table */}
            <Card>
              <CardHeader>
                <CardTitle>Demo Credentials</CardTitle>
                <CardDescription>
                  Use these credentials to test each dashboard. Password for all: <code className="bg-muted px-2 py-1 rounded">Demo@12345</code>
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="rounded-md border overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[150px]">Role</TableHead>
                        <TableHead>Name</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead className="w-[80px]">Copy</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {result.credentials.map((cred, idx) => (
                        <TableRow key={idx}>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              {getRoleIcon(cred.role)}
                              <Badge variant={getRoleBadgeVariant(cred.role)} className="text-xs">
                                {cred.role}
                              </Badge>
                            </div>
                          </TableCell>
                          <TableCell className="font-medium">{cred.name}</TableCell>
                          <TableCell className="font-mono text-sm">{cred.email}</TableCell>
                          <TableCell>
                            <Button 
                              size="icon" 
                              variant="ghost" 
                              onClick={() => copyToClipboard(cred.email)}
                              title="Copy email"
                            >
                              <Copy className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
