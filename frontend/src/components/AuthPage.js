import { useState } from "react";
import { useAuth } from "../AuthContext";
import { authApi } from "../utils/api";
import toast from "react-hot-toast";
import { Zap, Mail, Lock, User, Eye, EyeOff, ArrowRight, Loader2 } from "lucide-react";

export default function AuthPage() {
  const { login } = useAuth();
  const [mode, setMode] = useState("signin");
  const [loading, setLoading] = useState(false);
  const [showPw, setShowPw] = useState(false);

  const [form, setForm] = useState({ name: "", email: "", password: "" });

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      let res;
      if (mode === "signup") {
        if (!form.name.trim()) { toast.error("Name is required"); return; }
        if (form.password.length < 6) { toast.error("Password must be at least 6 characters"); return; }
        res = await authApi.signup(form.name, form.email, form.password);
        toast.success("Account created! Welcome 🎉");
      } else {
        res = await authApi.login(form.email, form.password);
        toast.success(`Welcome back, ${res.user.name}!`);
      }
      login(res.token, res.user);
    } catch (err) {
      toast.error(err.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const switchMode = () => {
    setMode((m) => (m === "signin" ? "signup" : "signin"));
    setForm({ name: "", email: "", password: "" });
    setShowPw(false);
  };

  return (
    <div className="min-h-screen bg-ink flex items-center justify-center px-4 relative overflow-hidden">
      {/* Background orbs */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-40 -right-40 w-[500px] h-[500px] bg-accent/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 -left-40 w-96 h-96 bg-sky/5 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-accent/5 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-md animate-fade-up">
        {/* Logo */}
        <div className="flex items-center justify-center gap-2 mb-8">
          <div className="w-8 h-8 rounded-lg bg-accent/20 border border-accent/30 flex items-center justify-center">
            <Zap size={16} className="text-accent" />
          </div>
          <span className="font-mono text-accent text-sm uppercase tracking-widest font-semibold">
            OrderFlow
          </span>
        </div>

        {/* Card */}
        <div className="glass rounded-2xl p-8 shadow-2xl shadow-black/40">
          {/* Title */}
          <div className="mb-7">
            <h1 className="font-display text-2xl font-bold text-text-primary mb-1">
              {mode === "signin" ? "Welcome back" : "Create account"}
            </h1>
            <p className="text-text-secondary text-sm">
              {mode === "signin"
                ? "Sign in to access your order dashboard."
                : "Sign up to start managing orders."}
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Name — signup only */}
            {mode === "signup" && (
              <div className="space-y-1.5">
                <label className="text-xs text-text-secondary font-medium">Full Name</label>
                <div className="relative">
                  <User size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
                  <input
                    type="text"
                    required
                    autoComplete="name"
                    value={form.name}
                    onChange={set("name")}
                    placeholder="Jane Doe"
                    className="w-full bg-ink-light border border-border rounded-xl pl-9 pr-4 py-2.5 text-sm text-text-primary
                      placeholder:text-muted focus:outline-none focus:border-accent transition-colors"
                  />
                </div>
              </div>
            )}

            {/* Email */}
            <div className="space-y-1.5">
              <label className="text-xs text-text-secondary font-medium">Email</label>
              <div className="relative">
                <Mail size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
                <input
                  type="email"
                  required
                  autoComplete="email"
                  value={form.email}
                  onChange={set("email")}
                  placeholder="you@example.com"
                  className="w-full bg-ink-light border border-border rounded-xl pl-9 pr-4 py-2.5 text-sm text-text-primary
                    placeholder:text-muted focus:outline-none focus:border-accent transition-colors"
                />
              </div>
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <label className="text-xs text-text-secondary font-medium">Password</label>
              <div className="relative">
                <Lock size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
                <input
                  type={showPw ? "text" : "password"}
                  required
                  autoComplete={mode === "signup" ? "new-password" : "current-password"}
                  value={form.password}
                  onChange={set("password")}
                  placeholder={mode === "signup" ? "At least 6 characters" : "Your password"}
                  className="w-full bg-ink-light border border-border rounded-xl pl-9 pr-10 py-2.5 text-sm text-text-primary
                    placeholder:text-muted focus:outline-none focus:border-accent transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPw((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-text-secondary transition-colors"
                  tabIndex={-1}
                >
                  {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 mt-2 px-5 py-3 bg-accent hover:bg-accent-light
                disabled:opacity-60 disabled:cursor-not-allowed text-white rounded-xl font-medium text-sm
                transition-all shadow-lg shadow-accent/20 hover:shadow-accent/30"
            >
              {loading ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <>
                  {mode === "signin" ? "Sign In" : "Create Account"}
                  <ArrowRight size={15} />
                </>
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="flex items-center gap-3 my-5">
            <div className="flex-1 h-px bg-border" />
            <span className="text-xs text-muted">or</span>
            <div className="flex-1 h-px bg-border" />
          </div>

          {/* Switch mode */}
          <p className="text-center text-sm text-text-secondary">
            {mode === "signin" ? "Don't have an account?" : "Already have an account?"}{" "}
            <button
              type="button"
              onClick={switchMode}
              className="text-accent-light hover:text-accent font-medium transition-colors underline underline-offset-2"
            >
              {mode === "signin" ? "Sign Up" : "Sign In"}
            </button>
          </p>
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-muted mt-6">
          Order Management System &copy; {new Date().getFullYear()}
        </p>
      </div>
    </div>
  );
}
