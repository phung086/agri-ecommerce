import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";

export function ModuleCard({ title, description, href, image, meta }) {
  return (
    <Link href={href} className="group block h-full">
      <Card className="h-full rounded-[8px] border border-emerald-100 bg-white py-0 shadow-[0_16px_42px_rgba(15,61,38,0.07)] transition group-hover:-translate-y-1 group-hover:border-emerald-200">
        <CardContent className="p-0">
          <div className="relative h-32 overflow-hidden bg-emerald-50">
            <div
              className="absolute inset-0 bg-cover bg-center transition duration-500 group-hover:scale-105"
              role="img"
              aria-label={title}
              style={{ backgroundImage: `url("${image}")` }}
            />
            <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.1)_0%,rgba(15,61,38,0.32)_100%)]" />
            <div className="absolute bottom-3 left-3 rounded-[8px] bg-white/90 px-2.5 py-1 text-xs font-bold text-emerald-800 shadow-sm">
              Mở nhanh
            </div>
          </div>

          <div className="space-y-3 p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="font-black text-emerald-950">{title}</p>
                <p className="mt-1 line-clamp-2 text-sm leading-5 text-muted-foreground">
                  {description}
                </p>
              </div>
              <ArrowRight className="mt-1 size-4 shrink-0 text-emerald-700 transition group-hover:translate-x-1" />
            </div>
            {meta && (
              <div className="inline-flex max-w-full items-center rounded-[8px] bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700 ring-1 ring-emerald-100">
                {meta}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
