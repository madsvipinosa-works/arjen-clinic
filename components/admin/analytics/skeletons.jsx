import { Card, CardContent, CardHeader } from "@/components/ui/card";

export function MetricCardsSkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
      {[1, 2, 3, 4].map((i) => (
        <Card key={i} className="rounded-3xl border-border/80 p-6 space-y-4">
          <div className="flex items-start justify-between">
            <div className="space-y-2">
              <div className="h-3.5 w-24 bg-muted animate-pulse rounded-md" />
              <div className="h-8 w-20 bg-muted/80 animate-pulse rounded-lg" />
            </div>
            <div className="w-12 h-12 rounded-2xl bg-muted/70 animate-pulse" />
          </div>
          <div className="pt-3 border-t border-border/50">
            <div className="h-3 w-32 bg-muted/60 animate-pulse rounded-md" />
          </div>
        </Card>
      ))}
    </div>
  );
}

export function ChartSkeleton({ title = "Loading Chart..." }) {
  return (
    <Card className="rounded-3xl border-border/80 overflow-hidden min-h-[380px] flex flex-col justify-between p-6">
      <div className="space-y-2">
        <div className="h-4 w-40 bg-muted animate-pulse rounded-md" />
        <div className="h-3 w-56 bg-muted/60 animate-pulse rounded-md" />
      </div>
      <div className="h-64 w-full bg-muted/30 rounded-2xl animate-pulse flex items-center justify-center my-4">
        <div className="h-10 w-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
      </div>
      <div className="flex items-center justify-between pt-2 border-t border-border/50">
        <div className="h-3 w-28 bg-muted/60 animate-pulse rounded-md" />
        <div className="h-3 w-20 bg-muted/60 animate-pulse rounded-md" />
      </div>
    </Card>
  );
}
