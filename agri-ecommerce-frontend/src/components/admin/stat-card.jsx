import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export function StatCard({
  title,
  value,
  description,
  icon: Icon,
  tone = "green",
}) {
  const toneClasses = {
    green: "bg-emerald-50 text-emerald-700 ring-emerald-100",
    blue: "bg-blue-50 text-blue-700 ring-blue-100",
    amber: "bg-amber-50 text-amber-700 ring-amber-100",
    rose: "bg-rose-50 text-rose-700 ring-rose-100",
  };

  return (
    <Card className="rounded-lg border-0 shadow-sm">
      <CardContent className="flex items-start justify-between gap-4 p-4">
        <div className="min-w-0">
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <p className="mt-2 text-2xl font-semibold tracking-normal text-foreground">
            {value}
          </p>
          {description && (
            <p className="mt-1 text-xs text-muted-foreground">{description}</p>
          )}
        </div>

        {Icon && (
          <div
            className={cn(
              "flex size-10 shrink-0 items-center justify-center rounded-lg ring-1",
              toneClasses[tone] || toneClasses.green
            )}
          >
            <Icon className="size-5" />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
