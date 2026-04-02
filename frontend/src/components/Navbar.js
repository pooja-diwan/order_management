import { Link, useNavigate, useLocation } from "react-router-dom";
import { ShoppingCart, Package, HelpCircle, Store, LogOut, User, Zap, Menu, X } from "lucide-react";
import { useState } from "react";
import { useAuth } from "../AuthContext";
import { useCart } from "../CartContext";

export default function Navbar() {
  const { user, logout } = useAuth();
  const { cartCount, setCartOpen } = useCart();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  const navLinks = [
    { to: "/", label: "Shop", icon: <Store size={15} /> },
    { to: "/orders", label: "My Orders", icon: <Package size={15} /> },
    { to: "/help", label: "Help", icon: <HelpCircle size={15} /> },
  ];

  const isActive = (path) =>
    path === "/" ? location.pathname === "/" : location.pathname.startsWith(path);

  return (
    <header className="sticky top-0 z-50 bg-ink/95 backdrop-blur border-b border-border/60 shadow-lg">
      <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between gap-4">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2 shrink-0">
          <div className="w-8 h-8 rounded-lg bg-accent/20 border border-accent/30 flex items-center justify-center">
            <Zap size={16} className="text-accent" />
          </div>
          <span className="font-display font-bold text-text-primary text-lg hidden sm:block">
            Shop<span className="text-accent">Flow</span>
          </span>
        </Link>

        {/* Desktop Nav */}
        <nav className="hidden md:flex items-center gap-1">
          {navLinks.map(({ to, label, icon }) => (
            <Link
              key={to}
              to={to}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium transition-all
                ${isActive(to)
                  ? "bg-accent/15 text-accent border border-accent/30"
                  : "text-text-secondary hover:text-text-primary hover:bg-surface"
                }`}
            >
              {icon}
              {label}
            </Link>
          ))}
        </nav>

        {/* Right side */}
        <div className="flex items-center gap-2">
          {/* Cart Button */}
          <button
            onClick={() => setCartOpen(true)}
            className="relative flex items-center gap-2 px-3 py-2 bg-surface hover:bg-border border border-border rounded-xl text-text-secondary hover:text-text-primary transition-all"
          >
            <ShoppingCart size={17} />
            <span className="hidden sm:block text-sm font-medium">Cart</span>
            {cartCount > 0 && (
              <span className="absolute -top-2 -right-2 w-5 h-5 bg-accent text-white text-xs font-bold rounded-full flex items-center justify-center shadow-lg">
                {cartCount > 9 ? "9+" : cartCount}
              </span>
            )}
          </button>

          {/* User pill */}
          <div className="hidden sm:flex items-center gap-2 px-3 py-2 bg-surface border border-border rounded-xl">
            <div className="w-6 h-6 rounded-full bg-accent/20 border border-accent/30 flex items-center justify-center">
              <User size={12} className="text-accent" />
            </div>
            <span className="text-xs text-text-secondary font-medium max-w-[80px] truncate">
              {user?.name}
            </span>
          </div>

          {/* Logout */}
          <button
            onClick={handleLogout}
            title="Sign out"
            className="p-2.5 rounded-xl bg-surface border border-border text-muted hover:text-rose hover:border-rose/40 transition-colors"
          >
            <LogOut size={15} />
          </button>

          {/* Mobile hamburger */}
          <button
            className="md:hidden p-2 rounded-xl bg-surface border border-border text-muted hover:text-text-primary transition-colors"
            onClick={() => setMobileOpen(!mobileOpen)}
          >
            {mobileOpen ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="md:hidden border-t border-border bg-ink px-4 py-3 space-y-1">
          {navLinks.map(({ to, label, icon }) => (
            <Link
              key={to}
              to={to}
              onClick={() => setMobileOpen(false)}
              className={`flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-medium transition-all
                ${isActive(to)
                  ? "bg-accent/15 text-accent border border-accent/30"
                  : "text-text-secondary hover:text-text-primary hover:bg-surface"
                }`}
            >
              {icon}{label}
            </Link>
          ))}
        </div>
      )}
    </header>
  );
}
