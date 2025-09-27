"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Boxes, GitMerge, Layers2, ListChecks, PlusCircle, Sparkles } from "lucide-react";
import { ReactNode, useMemo } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import { useMatchingStats } from "@/modules/stats/hooks/use-matching-stats";

const navItems = [
  { label: "Entities", href: "/entities" },
  { label: "Templates", href: "/templates" },
  { label: "Jobs", href: "/jobs" },
  { label: "Matches", href: "/matches" },
];

function LayoutShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { templates, jobs, entities, totalAutoApproved } = useMatchingStats();

  const metrics = useMemo(
    () => [
      {
        label: "Templates live",
        value: templates.length,
        description: "Reusable logic blocks",
        icon: <GitMerge className="h-4 w-4 text-muted-foreground" />,
      },
      {
        label: "Entities managed",
        value: entities.length,
        description: "Profiles, teams, talent pools",
        icon: <Boxes className="h-4 w-4 text-muted-foreground" />,
      },
      {
        label: "Jobs running",
        value: jobs.length,
        description: "Across all entity pairs",
        icon: <Layers2 className="h-4 w-4 text-muted-foreground" />,
      },
      {
        label: "Auto-approved",
        value: totalAutoApproved,
        description: "Streaming straight to teams",
        icon: <ListChecks className="h-4 w-4 text-muted-foreground" />,
      },
    ],
    [entities.length, jobs.length, templates.length, totalAutoApproved],
  );

  return (
    <div className="relative min-h-screen bg-background">
      <div
        className="absolute inset-x-0 top-0 h-[360px] bg-gradient-to-b from-primary/15 via-primary/5 to-transparent blur-[120px]"
        aria-hidden
      />

      <div className="relative mx-auto flex max-w-6xl flex-col gap-10 px-6 pb-20 pt-10">
        <header className="flex flex-col gap-4">
          <div className="inline-flex items-center gap-2 self-start rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
            <Sparkles className="h-4 w-4" /> Matching control center
          </div>
          <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div className="max-w-2xl space-y-3">
              <h1 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
                Compose templates, launch jobs, review matches in minutes.
              </h1>
              <p className="text-base text-muted-foreground">
                Craft reusable blueprints for matching logic, spin up jobs against fresh entity sets, and monitor the quality of matches without juggling spreadsheets.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button asChild size="lg" className="gap-2 whitespace-nowrap">
                <Link href="/entities#create-entity">
                  <PlusCircle className="h-4 w-4" /> New entity
                </Link>
              </Button>
              <Button asChild variant="secondary" size="lg" className="gap-2 whitespace-nowrap">
                <Link href="/templates#create-template">New template</Link>
              </Button>
            </div>
          </div>
        </header>

        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {metrics.map((metric) => (
            <Card key={metric.label}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">{metric.label}</CardTitle>
                {metric.icon}
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-semibold text-foreground">{metric.value}</p>
                <p className="text-xs text-muted-foreground">{metric.description}</p>
              </CardContent>
            </Card>
          ))}
        </section>

        <nav className="flex flex-wrap gap-2">
          {navItems.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring ${
                  isActive
                    ? "bg-foreground text-background shadow"
                    : "bg-muted text-muted-foreground hover:bg-muted/70"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="rounded-2xl border border-border/60 bg-card/80 p-6 shadow-sm backdrop-blur">
          {children}
        </div>

        <footer className="flex items-center justify-between gap-4 border-t border-border/60 pt-6 text-xs text-muted-foreground">
          <span>Mock data only – wire to API when ready.</span>
          <Badge variant="secondary">Matching UI preview</Badge>
        </footer>
      </div>
    </div>
  );
}

export default function MainLayout({ children }: { children: ReactNode }) {
  return <LayoutShell>{children}</LayoutShell>;
}
