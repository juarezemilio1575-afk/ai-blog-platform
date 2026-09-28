"use client";

import Image from "next/image";
import { Badge, Card, cn } from "@/components/ui/primitives";

export interface AffiliateProductView {
  id: string;
  name: string;
  description?: string | null;
  price?: number | null;
  currency?: string;
  imageUrl?: string | null;
  merchant?: string | null;
  rating?: number | null;
}

/**
 * Every "buy" button posts to /api/affiliate/click first (for tracking),
 * then redirects — so the actual affiliate URL never has to be hardcoded
 * into article content. Changing a Product's affiliateUrl in the database
 * instantly updates every article that references it (section 9).
 */
function BuyButton({ productId, articleId, label = "Check price" }: { productId: string; articleId?: string; label?: string }) {
  return (
    <form
      action="/api/affiliate/click"
      method="post"
      onSubmit={(e) => {
        e.preventDefault();
        fetch("/api/affiliate/click", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ productId, articleId }),
        })
          .then((r) => r.json())
          .then((data) => {
            if (data.redirectUrl) window.open(data.redirectUrl, "_blank", "noopener,noreferrer");
          });
      }}
    >
      <button
        type="submit"
        className="rounded-full bg-accent-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-accent-600"
      >
        {label}
      </button>
    </form>
  );
}

export function ProductCard({ product, articleId }: { product: AffiliateProductView; articleId?: string }) {
  return (
    <Card className="flex gap-4">
      {product.imageUrl && (
        <Image src={product.imageUrl} alt={product.name} width={96} height={96} className="h-24 w-24 rounded-lg object-cover" />
      )}
      <div className="flex flex-1 flex-col gap-1">
        <h4 className="font-display text-lg font-semibold">{product.name}</h4>
        {product.merchant && <p className="text-sm text-ink-700/70 dark:text-paper-100/60">Sold by {product.merchant}</p>}
        {product.description && <p className="text-sm">{product.description}</p>}
        <div className="mt-2 flex items-center justify-between">
          {product.price != null && <span className="font-display text-lg">${product.price.toFixed(2)}</span>}
          <BuyButton productId={product.id} articleId={articleId} />
        </div>
      </div>
    </Card>
  );
}

export function BestChoiceBlock({ product, articleId }: { product: AffiliateProductView; articleId?: string }) {
  return (
    <div className="relative">
      <Badge tone="accent">🏆 Best Overall</Badge>
      <div className="mt-2">
        <ProductCard product={product} articleId={articleId} />
      </div>
    </div>
  );
}

export function BudgetChoiceBlock({ product, articleId }: { product: AffiliateProductView; articleId?: string }) {
  return (
    <div>
      <Badge tone="success">💰 Best Budget Pick</Badge>
      <div className="mt-2">
        <ProductCard product={product} articleId={articleId} />
      </div>
    </div>
  );
}

export function PremiumChoiceBlock({ product, articleId }: { product: AffiliateProductView; articleId?: string }) {
  return (
    <div>
      <Badge tone="warning">✨ Premium Pick</Badge>
      <div className="mt-2">
        <ProductCard product={product} articleId={articleId} />
      </div>
    </div>
  );
}

export function ComparisonTable({ products, articleId }: { products: AffiliateProductView[]; articleId?: string }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-paper-200 dark:border-ink-800">
      <table className="w-full text-left text-sm">
        <thead className="bg-paper-100 dark:bg-ink-800/60">
          <tr>
            <th className="px-4 py-3">Product</th>
            <th className="px-4 py-3">Price</th>
            <th className="px-4 py-3">Rating</th>
            <th className="px-4 py-3"></th>
          </tr>
        </thead>
        <tbody>
          {products.map((p, idx) => (
            <tr key={p.id} className={cn(idx % 2 === 1 && "bg-paper-50/60 dark:bg-ink-900/40")}>
              <td className="px-4 py-3 font-medium">{p.name}</td>
              <td className="px-4 py-3">{p.price != null ? `$${p.price.toFixed(2)}` : "—"}</td>
              <td className="px-4 py-3">{p.rating != null ? `${p.rating.toFixed(1)} / 5` : "—"}</td>
              <td className="px-4 py-3">
                <BuyButton productId={p.id} articleId={articleId} label="View" />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
