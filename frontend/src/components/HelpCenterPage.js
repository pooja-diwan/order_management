import { useState } from "react";
import {
  HelpCircle, ChevronDown, ChevronUp, Mail, Phone, MessageCircle,
  Package, CreditCard, RotateCcw, User, ShieldCheck
} from "lucide-react";
import ChatWidget from "./ChatWidget";

const FAQS = [
  {
    category: "Orders & Delivery",
    icon: <Package size={16} />,
    items: [
      {
        q: "How long does delivery take?",
        a: "Standard delivery takes 3–7 business days across India. Express delivery (1–2 days) is available for major metro cities including Mumbai, Delhi, Bengaluru, Chennai, Hyderabad, and Pune.",
      },
      {
        q: "Can I track my order?",
        a: "Yes! Go to 'My Orders' in the navbar to see your order status and a detailed status timeline. Orders progress from Pending → Processing → Shipped → Delivered.",
      },
      {
        q: "Can I cancel an order?",
        a: "You can cancel an order while it's in PENDING or PROCESSING status. Once it's SHIPPED, cancellation is not possible. Visit 'My Orders' and click the Cancel button.",
      },
      {
        q: "What happens if my order is delayed?",
        a: "If your order is delayed beyond the estimated date, please contact our support team at support@shopflow.in or call 1800-123-4567 (toll-free). We'll investigate and update you promptly.",
      },
    ],
  },
  {
    category: "Payments",
    icon: <CreditCard size={16} />,
    items: [
      {
        q: "What payment methods are accepted?",
        a: "We accept Cash on Delivery (COD), UPI (GPay, PhonePe, Paytm, BHIM), Credit/Debit cards (Visa, Mastercard, Rupay), and Net Banking. All transactions are secured with 256-bit SSL encryption.",
      },
      {
        q: "Is it safe to enter my card details?",
        a: "Absolutely. ShopFlow uses industry-standard encryption for all transactions. We do not store your complete card details on our servers.",
      },
      {
        q: "When will I be charged for COD orders?",
        a: "For Cash on Delivery orders, payment is collected at the time of delivery by our delivery partner. Please keep the exact amount ready.",
      },
      {
        q: "How long does a refund take after cancellation?",
        a: "Refunds for prepaid orders (UPI/Card) are processed within 5–7 business days back to the original payment method. COD orders are refunded to your bank account after providing details.",
      },
    ],
  },
  {
    category: "Returns & Exchanges",
    icon: <RotateCcw size={16} />,
    items: [
      {
        q: "What is the return policy?",
        a: "We offer a 7-day return policy from the date of delivery. Items must be unused, in original packaging with tags intact. To initiate a return, go to 'My Orders' and click 'Return / Exchange' on a delivered order.",
      },
      {
        q: "How do I exchange a product?",
        a: "You can request an exchange within 7 days of delivery. Go to 'My Orders', find the delivered order, and click 'Return / Exchange'. Select Exchange and provide the reason.",
      },
      {
        q: "Are all products eligible for return?",
        a: "Most products are eligible for returns. However, some categories like personal care, inner-wear, and consumables are non-returnable due to hygiene reasons.",
      },
      {
        q: "Who pays for return shipping?",
        a: "For defective or wrong items, we provide free pickup. For buyer's remorse returns (wrong size, change of mind), a shipping fee of ₹50–₹100 may be deducted from your refund.",
      },
    ],
  },
  {
    category: "Account & Security",
    icon: <User size={16} />,
    items: [
      {
        q: "How do I reset my password?",
        a: "Click on 'Sign In', then 'Forgot Password'. Enter your registered email address and we'll send a reset link within 2 minutes.",
      },
      {
        q: "Is my personal data secure?",
        a: "Yes. ShopFlow does not sell or share your personal data with third parties. We comply with India's Personal Data Protection guidelines and use encrypted storage for all sensitive information.",
      },
      {
        q: "How do I update my delivery address?",
        a: "You can update your shipping address at checkout for each order. We don't store a default address yet — each order lets you enter a fresh address.",
      },
    ],
  },
];

function FAQItem({ q, a }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border border-border rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-5 py-4 text-left bg-surface hover:bg-ink/50 transition-colors"
      >
        <span className="text-sm font-medium text-text-primary pr-4">{q}</span>
        {open ? (
          <ChevronUp size={16} className="text-accent flex-shrink-0" />
        ) : (
          <ChevronDown size={16} className="text-muted flex-shrink-0" />
        )}
      </button>
      {open && (
        <div className="px-5 py-4 bg-ink/30 border-t border-border">
          <p className="text-sm text-text-secondary leading-relaxed">{a}</p>
        </div>
      )}
    </div>
  );
}

export default function HelpCenterPage() {
  const [activeCategory, setActiveCategory] = useState("All");

  const filtered = activeCategory === "All"
    ? FAQS
    : FAQS.filter((c) => c.category === activeCategory);

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="text-center mb-10">
        <div className="w-16 h-16 rounded-2xl bg-accent/15 border border-accent/30 flex items-center justify-center mx-auto mb-4">
          <HelpCircle size={28} className="text-accent" />
        </div>
        <h1 className="font-display text-3xl md:text-4xl font-bold text-text-primary mb-2">
          Help Center
        </h1>
        <p className="text-text-secondary max-w-xl mx-auto">
          Find answers to common questions, or reach out to our team.
        </p>
      </div>

      {/* Contact cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-10">
        <a href="mailto:support@shopflow.in" className="group bg-surface border border-border hover:border-accent/40 rounded-2xl p-5 flex flex-col items-center text-center gap-3 transition-all hover:shadow-lg hover:shadow-accent/10">
          <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center group-hover:bg-accent/20 transition-colors">
            <Mail size={20} className="text-accent" />
          </div>
          <div>
            <p className="text-sm font-semibold text-text-primary mb-0.5">Email Us</p>
            <p className="text-xs text-accent">support@shopflow.in</p>
            <p className="text-xs text-muted mt-1">Reply within 24 hours</p>
          </div>
        </a>

        <a href="tel:18001234567" className="group bg-surface border border-border hover:border-sky/40 rounded-2xl p-5 flex flex-col items-center text-center gap-3 transition-all hover:shadow-lg hover:shadow-sky/10">
          <div className="w-12 h-12 rounded-xl bg-sky/10 flex items-center justify-center group-hover:bg-sky/20 transition-colors">
            <Phone size={20} className="text-sky" />
          </div>
          <div>
            <p className="text-sm font-semibold text-text-primary mb-0.5">Call Us</p>
            <p className="text-xs text-sky">1800-123-4567</p>
            <p className="text-xs text-muted mt-1">Toll-free · Mon–Sat 9AM–8PM</p>
          </div>
        </a>

        <div className="group bg-surface border border-border hover:border-emerald/40 rounded-2xl p-5 flex flex-col items-center text-center gap-3 transition-all hover:shadow-lg hover:shadow-emerald/10">
          <div className="w-12 h-12 rounded-xl bg-emerald/10 flex items-center justify-center group-hover:bg-emerald/20 transition-colors">
            <MessageCircle size={20} className="text-emerald" />
          </div>
          <div>
            <p className="text-sm font-semibold text-text-primary mb-0.5">Live Chat (AI)</p>
            <p className="text-xs text-emerald">Gemini-powered bot</p>
            <p className="text-xs text-muted mt-1">Available 24/7 via the chat bubble (bottom right)</p>
          </div>
        </div>
      </div>

      {/* Trust badges */}
      <div className="flex flex-wrap justify-center gap-4 mb-10">
        {[
          { icon: <ShieldCheck size={14} />, text: "Secure Payments" },
          { icon: <RotateCcw size={14} />, text: "Easy Returns" },
          { icon: <Package size={14} />, text: "Fast Delivery" },
        ].map(({ icon, text }) => (
          <div key={text} className="flex items-center gap-2 px-4 py-2 bg-surface border border-border rounded-full text-xs text-text-secondary">
            <span className="text-accent">{icon}</span>
            {text}
          </div>
        ))}
      </div>

      {/* FAQs */}
      <div>
        <h2 className="font-display text-xl font-bold text-text-primary mb-4">Frequently Asked Questions</h2>

        {/* Category tabs */}
        <div className="flex flex-wrap gap-2 mb-6">
          {["All", ...FAQS.map((c) => c.category)].map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-4 py-2 rounded-xl text-xs font-medium border transition-all
                ${activeCategory === cat
                  ? "bg-accent/20 border-accent/50 text-accent"
                  : "bg-surface border-border text-text-secondary hover:border-accent/30 hover:text-text-primary"
                }`}
            >
              {cat}
            </button>
          ))}
        </div>

        <div className="space-y-8">
          {filtered.map((section) => (
            <div key={section.category}>
              <div className="flex items-center gap-2 mb-3">
                <span className="text-accent">{section.icon}</span>
                <h3 className="font-semibold text-text-primary text-sm">{section.category}</h3>
              </div>
              <div className="space-y-2">
                {section.items.map((item) => (
                  <FAQItem key={item.q} q={item.q} a={item.a} />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* CTA */}
      <div className="mt-12 text-center bg-gradient-to-r from-accent/20 via-sky/10 to-emerald/10 border border-accent/20 rounded-2xl p-8">
        <HelpCircle size={24} className="text-accent mx-auto mb-3" />
        <h3 className="font-display font-bold text-text-primary mb-2">Still have questions?</h3>
        <p className="text-text-secondary text-sm mb-4">
          Our support team is happy to help. Use the chat bubble (bottom-right) for instant AI-powered answers.
        </p>
        <a
          href="mailto:support@shopflow.in"
          className="inline-flex items-center gap-2 px-6 py-3 bg-accent hover:bg-accent-light text-white rounded-xl font-medium text-sm transition-colors shadow-lg shadow-accent/20"
        >
          <Mail size={15} />
          Email Support
        </a>
      </div>
    </div>
  );
}
