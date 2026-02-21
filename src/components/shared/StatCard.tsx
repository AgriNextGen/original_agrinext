import React from "react";
import { Card, CardContent } from "@/components/ui/card";

export default function StatCard({ icon, label, value, children, className }: {
  icon?: React.ReactNode;
  label: string;
  value: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <Card className={`hover:shadow-md transition-all ${className || ""}`}>
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          {icon && <div className="p-2 rounded-lg bg-muted">{icon}</div>}
          <div>
            <p className="text-2xl font-bold">{value}</p>
            <p className="text-xs text-muted-foreground">{label}</p>
          </div>
        </div>
        {children}
      </CardContent>
    </Card>
  );
}

