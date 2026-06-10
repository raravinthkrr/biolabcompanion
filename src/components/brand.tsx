import logo from "@/assets/biocalc-logo.png";

export function Logo({ className = "h-8 w-8" }: { className?: string }) {
  return <img src={logo} alt="BioCalc AI" className={className} width={512} height={512} />;
}

export function BrandLockup({ size = "default" }: { size?: "default" | "lg" }) {
  return (
    <div className="flex items-center gap-2">
      <Logo className={size === "lg" ? "h-10 w-10" : "h-8 w-8"} />
      <div className="flex flex-col leading-none">
        <span className={"font-display font-semibold tracking-tight " + (size === "lg" ? "text-2xl" : "text-lg")}>
          BioCalc <span className="text-gradient-primary">AI</span>
        </span>
      </div>
    </div>
  );
}
