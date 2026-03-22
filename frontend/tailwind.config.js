/** @type {import('tailwindcss').Config} */
module.exports = {
    content: ["./src/**/*.{js,jsx}"],
    theme: {
        extend: {
            fontFamily: {
                display: ["'Syne'", "sans-serif"],
                body: ["'DM Sans'", "sans-serif"],
                mono: ["'JetBrains Mono'", "monospace"],
            },
            colors: {
                ink: "#0A0A0F",
                "ink-light": "#12121A",
                surface: "#1A1A26",
                border: "#2A2A3A",
                accent: "#6366F1",
                "accent-light": "#818CF8",
                "accent-dim": "#312E81",
                gold: "#F59E0B",
                emerald: "#10B981",
                rose: "#F43F5E",
                sky: "#38BDF8",
                muted: "#6B7280",
                "text-primary": "#F1F5F9",
                "text-secondary": "#94A3B8",
            },
            animation: {
                "fade-up": "fadeUp 0.4s ease forwards",
                "slide-in": "slideIn 0.3s ease forwards",
                pulse2: "pulse2 2s ease-in-out infinite",
                shimmer: "shimmer 1.5s infinite",
            },
            keyframes: {
                fadeUp: {
                    "0%": { opacity: 0, transform: "translateY(16px)" },
                    "100%": { opacity: 1, transform: "translateY(0)" },
                },
                slideIn: {
                    "0%": { opacity: 0, transform: "translateX(-12px)" },
                    "100%": { opacity: 1, transform: "translateX(0)" },
                },
                pulse2: {
                    "0%, 100%": { opacity: 1 },
                    "50%": { opacity: 0.4 },
                },
                shimmer: {
                    "0%": { backgroundPosition: "-200% 0" },
                    "100%": { backgroundPosition: "200% 0" },
                },
            },
        },
    },
    plugins: [],
};