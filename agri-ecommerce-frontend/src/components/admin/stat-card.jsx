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
    green: {
      stripe: "bg-emerald-500",
      icon: "bg-emerald-50 text-emerald-700 ring-emerald-100",
      value: "text-emerald-700",
    },
    blue: {
      stripe: "bg-sky-500",
      icon: "bg-sky-50 text-sky-700 ring-sky-100",
      value: "text-sky-700",
    },
    amber: {
      stripe: "bg-amber-400",
      icon: "bg-amber-50 text-amber-700 ring-amber-100",
      value: "text-amber-700",
    },
    rose: {
      stripe: "bg-rose-500",
      icon: "bg-rose-50 text-rose-700 ring-rose-100",
      value: "text-rose-700",
    },
  };
  const currentTone = toneClasses[tone] || toneClasses.green;

  return (
    <Card className="relative rounded-[8px] border border-emerald-100 bg-white py-0 shadow-[0_16px_42px_rgba(15,61,38,0.07)]">
      <div className={cn("h-1 w-full", currentTone.stripe)} />
      <CardContent className="flex items-start justify-between gap-4 p-4">
        <div className="min-w-0">
          <p className="text-sm font-bold text-muted-foreground">{title}</p>
          <p
            className={cn(
              "mt-2 truncate text-2xl font-black tracking-normal",
              currentTone.value
            )}
          >
            {value}
          </p>
          {description && (
            <p className="mt-1 text-xs leading-5 text-muted-foreground">
              {description}
            </p>
          )}
        </div>

        {Icon && (
          <div
            className={cn(
              "flex size-11 shrink-0 items-center justify-center rounded-[8px] ring-1",
              currentTone.icon
            )}
          >
            <Icon className="size-5" />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
