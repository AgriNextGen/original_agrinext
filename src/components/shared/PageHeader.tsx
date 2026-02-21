import React from "react";
import PageShell from "@/components/layout/PageShell";

export default function PageHeader({ title, subtitle, actions, children, className }: {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
}) {
  // Thin wrapper around PageShell for consistent header usage across pages.
  return (
    <PageShell title={title} subtitle={subtitle} actions={actions} className={className}>
      {children}
    </PageShell>
  );
}

