import { cn } from "@/lib/utils";

export function Shimmer({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <span
      className={cn(
        "inline-block bg-clip-text text-transparent bg-[linear-gradient(110deg,hsl(var(--muted-foreground)),35%,hsl(var(--foreground)),50%,hsl(var(--muted-foreground)),65%)] bg-[length:200%_100%] animate-[shimmer_2s_linear_infinite]",
        className,
      )}
      style={{ animation: "shimmer 2s linear infinite" }}
    >
      {children}
    </span>
  );
}
