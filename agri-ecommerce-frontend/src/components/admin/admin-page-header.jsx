import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export function AdminPageHeader({
  title,
  description,
  image,
  badges = [],
  children,
  className,
}) {
  return (
    <section
      className={cn(
        "overflow-hidden rounded-[8px] border border-emerald-100 bg-white shadow-[0_18px_55px_rgba(15,61,38,0.08)]",
        className
      )}
    >
      <div className="grid min-h-56 gap-0 lg:grid-cols-[1fr_24rem]">
        <div className="flex flex-col justify-center gap-5 p-5 sm:p-6 lg:p-7">
          {badges.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {badges.map((badge) => (
                <Badge
                  key={badge}
                  variant="outline"
                  className="h-7 rounded-[8px] border-emerald-200 bg-emerald-50 px-2.5 text-emerald-700"
                >
                  {badge}
                </Badge>
              ))}
            </div>
          )}

          <div>
            <h2 className="max-w-3xl text-2xl font-black tracking-normal text-emerald-950 sm:text-3xl">
              {title}
            </h2>
            {description && (
              <p className="mt-3 max-w-3xl text-sm leading-6 text-muted-foreground sm:text-base">
                {description}
              </p>
            )}
          </div>

          {children && <div className="flex flex-wrap gap-2">{children}</div>}
        </div>

        {image && (
          <div className="relative min-h-52 overflow-hidden border-t border-emerald-100 bg-emerald-50 lg:min-h-full lg:border-l lg:border-t-0">
            <div
              className="absolute inset-0 bg-cover bg-center"
              role="img"
              aria-label={title}
              style={{ backgroundImage: `url("${image}")` }}
            />
            <div className="absolute inset-0 bg-[linear-gradient(120deg,rgba(255,255,255,0.82)_0%,rgba(255,255,255,0.08)_58%,rgba(16,185,129,0.18)_100%)]" />
            <div className="absolute bottom-4 left-4 right-4 rounded-[8px] border border-white/70 bg-white/86 px-3 py-2 text-xs font-bold text-emerald-800 shadow-sm backdrop-blur">
              Vận hành bán hàng, kho và giao nhận trên cùng một bảng điều khiển.
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
