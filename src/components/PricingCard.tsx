import { Check } from "lucide-react";

interface PricingCardProps {
  title: string;
  price: string;
  features: string[];
  variant: "gold" | "silver";
  buttonText: string;
  checkoutLink?: string; // Optional now 
  buttonId?: string;
  onCheckout?: () => void; // New prop
}

export const PricingCard = ({ title, price, features, variant, buttonText, checkoutLink, buttonId, onCheckout }: PricingCardProps) => {
  const bgClass = variant === "gold"
    ? "bg-[hsl(45,100%,60%,0.05)]"
    : "bg-[hsl(190,100%,50%,0.05)]";

  const borderClass = variant === "gold"
    ? "border-[hsl(45,100%,60%)]"
    : "border-[hsl(190,100%,50%)]";

  const shadowClass = variant === "gold"
    ? "shadow-[0_0_40px_hsl(45,100%,60%/0.4)]"
    : "shadow-[0_0_30px_hsl(190,100%,50%/0.3)]";

  const handleLinkClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (onCheckout) {
      e.preventDefault();
      onCheckout();
    }
  };

  return (
    <div className={`relative ${bgClass} border-2 ${borderClass} rounded-xl p-6 md:p-8 ${shadowClass} md:hover:scale-105 md:transition-transform md:duration-300`}>
      <div className="relative z-10">
        <h3 className="text-2xl md:text-3xl font-bold mb-4 text-foreground">
          {title}
        </h3>
        <div className="mb-6">
          <span className="text-4xl md:text-5xl font-bold text-[#00ff73]">
            {price}
          </span>
        </div>
        <ul className="space-y-3 mb-8">
          {features.map((feature, index) => (
            <li key={index} className="flex items-start gap-2">
              <Check className="w-5 h-5 text-[hsl(94,100%,73%)] shrink-0 mt-0.5" />
              <span className="text-foreground">{feature}</span>
            </li>
          ))}
        </ul>
        <div className="relative group">
          {/* Outer Glow */}
          <div className={`absolute -inset-1 rounded-full blur-xl group-hover:blur-2xl transition-all duration-500 opacity-50 ${variant === "gold" ? "bg-emerald-600/50" : "bg-red-600/50"}`}></div>

          <a
            id={buttonId}
            href={checkoutLink || "#"}
            target="_blank"
            rel="noopener noreferrer"
            onClick={handleLinkClick}
            className={`relative flex items-center justify-center w-full max-w-[280px] mx-auto rounded-full px-5 py-3 text-sm sm:text-base font-black text-white text-center leading-snug whitespace-normal break-words shadow-2xl active:scale-[0.95] transition-all duration-300 overflow-hidden border border-white/20 uppercase tracking-tight ${variant === "gold"
              ? "bg-gradient-to-b from-emerald-500 to-emerald-700 shadow-emerald-900/40"
              : "bg-gradient-to-b from-red-500 to-red-700 shadow-red-900/40"
              }`}
          >
            {/* Shine effect */}
            <div className="absolute top-0 left-[-100%] w-full h-full bg-gradient-to-r from-transparent via-white/20 to-transparent transition-all duration-1000 group-hover:left-[100%]"></div>

            <span className="relative z-10 flex items-center gap-2">
              {buttonText}
              {/* Pulse indicator */}
              <div className="w-1.5 h-1.5 rounded-full bg-white shadow-[0_0_8px_white] animate-pulse"></div>
            </span>
          </a>
        </div>
      </div>
    </div>
  );
};

