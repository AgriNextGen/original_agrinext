import { useState } from "react";
import DashboardLayout from "@/layouts/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, Database, CheckCircle, Users, Truck, ShoppingBag, Shield, Leaf } from "lucide-react";

interface SeedResult {
  success: boolean;
  message: string;
  summary: {
    farmers: number;
    agents: number;
    transporters: number;
    buyers: number;
    admins: number;
    farmlands: number;
    crops: number;
    agent_tasks: number;
    agent_data: number;
    transport_requests: number;
    market_orders: number;
    market_prices: number;
    ai_agent_logs: number;
    ai_transport_logs: number;
    ai_market_logs: number;
    ai_admin_logs: number;
    notifications: number;
  };
  credentials: {
    farmers: string;
    agents: string;
    transporters: string;
    buyers: string;
    admins: {
      super: string;
      ops: string;
    };
  };
}

export default function SeedData() {
  const [isSeeding, setIsSeeding] = useState(false);
  const [result, setResult] = useState<SeedResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSeedData = async () => {
    setIsSeeding(true);
    setError(null);
    setResult(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke("seed-test-data");

      if (fnError) {
        throw fnError;
      }

      if (data?.success) {
        setResult(data);
        toast.success("Test data seeded successfully!");
      } else {
        throw new Error(data?.error || "Failed to seed data");
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error occurred";
      setError(message);
      toast.error("Failed to seed data: " + message);
    } finally {
      setIsSeeding(false);
    }
  };

  const credentialsList = [
    { role: "Farmers", icon: Leaf, emails: "ramesh.gowda@agrimitra.in, shankarappa@agrimitra.in, etc.", password: "farmer123" },
    { role: "Agents", icon: Users, emails: "mahesh.agent@agrimitra.in, kavya.agent@agrimitra.in, etc.", password: "agent123" },
    { role: "Transporters", icon: Truck, emails: "raju.transport@agrimitra.in, sahana.logistics@agrimitra.in, etc.", password: "trans123" },
    { role: "Buyers", icon: ShoppingBag, emails: "freshmart@agrimitra.in, mysuru.wholesale@agrimitra.in, etc.", password: "buyer123" },
    { role: "Super Admin", icon: Shield, emails: "admin@agrimitra.in", password: "admin123" },
    { role: "Ops Admin", icon: Shield, emails: "ops@agrimitra.in", password: "ops123" },
  ];

  return (
    <DashboardLayout title="Seed Test Data">
      <div className="max-w-4xl mx-auto space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-6 w-6" />
              Test Data Seeder
            </CardTitle>
            <CardDescription>
              Create sample users, crops, orders, and other data for testing the entire AgriNext Gen ecosystem
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-amber-800">
              <p className="font-medium">⚠️ Warning</p>
              <p className="text-sm">This will create test accounts and sample data. Run this only once on a fresh database to avoid duplicates.</p>
            </div>

            <Button 
              onClick={handleSeedData} 
              disabled={isSeeding}
              size="lg"
              className="w-full"
            >
              {isSeeding ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Seeding Data... This may take a minute
                </>
              ) : (
                <>
                  <Database className="mr-2 h-5 w-5" />
                  Seed All Test Data
                </>
              )}
            </Button>

            {error && (
              <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4 text-destructive">
                <p className="font-medium">Error</p>
                <p className="text-sm">{error}</p>
              </div>
            )}

            {result && (
              <div className="space-y-4">
                <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-green-800">
                  <div className="flex items-center gap-2 font-medium">
                    <CheckCircle className="h-5 w-5" />
                    {result.message}
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {Object.entries(result.summary).map(([key, value]) => (
                    <div key={key} className="bg-muted rounded-lg p-3 text-center">
                      <div className="text-2xl font-bold">{value}</div>
                      <div className="text-xs text-muted-foreground capitalize">{key.replace(/_/g, " ")}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Test Credentials</CardTitle>
            <CardDescription>Use these credentials to log in and test each dashboard</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {credentialsList.map((cred) => (
                <div key={cred.role} className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
                  <cred.icon className="h-5 w-5 mt-0.5 text-muted-foreground" />
                  <div className="flex-1 min-w-0">
                    <div className="font-medium">{cred.role}</div>
                    <div className="text-sm text-muted-foreground truncate">{cred.emails}</div>
                  </div>
                  <code className="text-sm bg-background px-2 py-1 rounded border">{cred.password}</code>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
