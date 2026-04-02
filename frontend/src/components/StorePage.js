import { useState, useEffect, useCallback } from "react";
import {
  Search, SlidersHorizontal, ChevronDown, Star, Package, X
} from "lucide-react";
import { productsApi } from "../utils/api";
import ProductCard from "./ProductCard";
import toast from "react-hot-toast";

const CATEGORIES = ["All", "Electronics", "Clothing", "Home & Kitchen", "Books", "Fitness", "Beauty", "Stationery"];
const SORT_OPTIONS = [
  { value: "", label: "Featured" },
  { value: "rating", label: "Top Rated" },
  { value: "price_asc", label: "Price: Low to High" },
  { value: "price_desc", label: "Price: High to Low" },
];

export default function StorePage() {
  const [products, setProducts]     = useState([]);
  const [loading, setLoading]       = useState(true);
  const [category, setCategory]     = useState("All");
  const [sort, setSort]             = useState("");
  const [search, setSearch]         = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [showFilters, setShowFilters] = useState(false);

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (category !== "All") params.category = category;
      if (sort) params.sort = sort;
      if (search) params.search = search;
      const data = await productsApi.list(params);
      setProducts(data);
    } catch (err) {
      toast.error("Failed to load products");
    } finally {
      setLoading(false);
    }
  }, [category, sort, search]);

  useEffect(() => { fetchProducts(); }, [fetchProducts]);

  const handleSearch = (e) => {
    e.preventDefault();
    setSearch(searchInput);
    setCategory("All");
  };

  const clearSearch = () => { setSearch(""); setSearchInput(""); };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Hero banner */}
      <div className="relative rounded-2xl overflow-hidden bg-gradient-to-r from-accent/30 via-sky/20 to-emerald/20 border border-accent/20 p-8 mb-8">
        <div className="absolute inset-0 bg-ink/40" />
        <div className="relative z-10">
          <p className="text-accent font-mono text-xs uppercase tracking-widest mb-2">Welcome to ShopFlow</p>
          <h1 className="font-display text-3xl md:text-4xl font-bold text-text-primary mb-2">
            Shop the Best Indian Brands
          </h1>
          <p className="text-text-secondary text-sm mb-6 max-w-xl">
            Discover 22+ curated products with genuine ratings, fast delivery & easy returns.
          </p>

          {/* Search bar */}
          <form onSubmit={handleSearch} className="flex gap-2 max-w-xl">
            <div className="relative flex-1">
              <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" />
              <input
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Search products…"
                className="w-full bg-ink/80 backdrop-blur border border-border rounded-xl pl-10 pr-4 py-3 text-sm text-text-primary placeholder:text-muted focus:outline-none focus:border-accent transition-colors"
              />
              {searchInput && (
                <button type="button" onClick={clearSearch} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-text-primary">
                  <X size={14} />
                </button>
              )}
            </div>
            <button type="submit" className="px-5 py-3 bg-accent hover:bg-accent-light text-white rounded-xl font-medium text-sm transition-colors">
              Search
            </button>
          </form>
        </div>

        {/* Decorative gradient orbs */}
        <div className="absolute -right-20 -top-20 w-64 h-64 bg-accent/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute right-10 bottom-0 w-32 h-32 bg-sky/20 rounded-full blur-2xl pointer-events-none" />
      </div>

      <div className="flex flex-col md:flex-row gap-6">
        {/* Category sidebar */}
        <aside className="md:w-52 shrink-0">
          <div className="bg-surface border border-border rounded-2xl p-4 sticky top-24">
            <h3 className="text-xs font-semibold text-muted uppercase tracking-widest mb-3">Categories</h3>
            <div className="space-y-1">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  onClick={() => { setCategory(cat); setSearch(""); setSearchInput(""); }}
                  className={`w-full text-left px-3 py-2 rounded-xl text-sm transition-all
                    ${category === cat
                      ? "bg-accent/20 text-accent font-semibold border border-accent/30"
                      : "text-text-secondary hover:bg-ink hover:text-text-primary"
                    }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            {/* Sort */}
            <div className="mt-5">
              <h3 className="text-xs font-semibold text-muted uppercase tracking-widest mb-3">Sort By</h3>
              {SORT_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setSort(opt.value)}
                  className={`w-full text-left px-3 py-2 rounded-xl text-sm transition-all
                    ${sort === opt.value
                      ? "bg-accent/20 text-accent font-semibold border border-accent/30"
                      : "text-text-secondary hover:bg-ink hover:text-text-primary"
                    }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </aside>

        {/* Product Grid */}
        <main className="flex-1">
          {/* Active filter chips */}
          {(search || category !== "All") && (
            <div className="flex flex-wrap gap-2 mb-4">
              {category !== "All" && (
                <span className="flex items-center gap-1.5 px-3 py-1.5 bg-accent/15 text-accent text-xs rounded-full border border-accent/30 font-medium">
                  {category}
                  <button onClick={() => setCategory("All")}><X size={12} /></button>
                </span>
              )}
              {search && (
                <span className="flex items-center gap-1.5 px-3 py-1.5 bg-surface text-text-secondary text-xs rounded-full border border-border font-medium">
                  "{search}"
                  <button onClick={clearSearch}><X size={12} /></button>
                </span>
              )}
            </div>
          )}

          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="shimmer h-72 rounded-2xl" />
              ))}
            </div>
          ) : products.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 text-center">
              <div className="w-16 h-16 rounded-2xl bg-surface flex items-center justify-center mb-4 border border-border">
                <Package size={24} className="text-muted" />
              </div>
              <p className="font-display text-text-primary font-semibold mb-1">No products found</p>
              <p className="text-text-secondary text-sm">Try a different search or category</p>
            </div>
          ) : (
            <>
              <p className="text-xs text-muted mb-4">
                Showing {products.length} product{products.length !== 1 ? "s" : ""}
                {category !== "All" ? ` in ${category}` : ""}
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {products.map((p) => (
                  <ProductCard key={p.id} product={p} />
                ))}
              </div>
            </>
          )}
        </main>
      </div>
    </div>
  );
}
