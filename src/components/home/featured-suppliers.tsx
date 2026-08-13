import { Link } from "@/i18n/routing";
import Image from "next/image";
import { Building2, Star, BadgeCheck } from "lucide-react";

interface Supplier {
  id: string;
  slug: string;
  companyName: string;
  companyNameAr?: string | null;
  logo: string | null;
  productCount: number;
  rating: number | null;
  isVerified?: boolean;
}

export function FeaturedSuppliers({
  suppliers,
  locale,
  productsLabel,
}: {
  suppliers: Supplier[];
  locale: string;
  productsLabel: (count: number) => string;
}) {
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
      {suppliers.map((s) => {
        const name = locale === "ar" && s.companyNameAr ? s.companyNameAr : s.companyName;
        return (
          <Link
            key={s.id}
            href={`/suppliers/${s.slug}`}
            className="card-float shadow-luxury hover:shadow-luxury-hover relative flex flex-col items-center gap-2 rounded-xl2 bg-white p-5 text-center"
          >
            <div
              className={`relative flex h-14 w-14 items-center justify-center overflow-hidden rounded-full bg-saveo-emerald-50 ${
                s.isVerified ? "ring-2 ring-saveo-gold-400 ring-offset-2" : ""
              }`}
            >
              {s.logo ? (
                <Image src={s.logo} alt={name} fill className="object-cover" />
              ) : (
                <Building2 className="h-6 w-6 text-saveo-emerald-700/40" />
              )}
            </div>
            {s.isVerified && (
              <BadgeCheck className="absolute end-3 top-3 h-4 w-4 fill-saveo-gold-400 text-white" />
            )}
            <p className="line-clamp-1 text-sm font-bold text-saveo-emerald-800">{name}</p>
            <p className="text-xs text-saveo-emerald-700/50">{productsLabel(s.productCount)}</p>
            {s.rating !== null ? (
              <span className="flex items-center gap-0.5 text-xs font-semibold text-saveo-gold-600">
                <Star className="h-3 w-3 fill-current" /> {s.rating.toFixed(1)}
              </span>
            ) : (
              <span className="text-[10px] text-saveo-emerald-700/30">—</span>
            )}
          </Link>
        );
      })}
    </div>
  );
}
