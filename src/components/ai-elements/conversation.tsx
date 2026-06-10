import * as React from "react";
import { ArrowDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

const ScrollCtx = React.createContext<{
  scrollRef: React.RefObject<HTMLDivElement | null>;
  atBottom: boolean;
}>({ scrollRef: { current: null }, atBottom: true });

export function Conversation({ className, children }: { className?: string; children: React.ReactNode }) {
  const scrollRef = React.useRef<HTMLDivElement>(null);
  const [atBottom, setAtBottom] = React.useState(true);

  React.useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const onScroll = () => {
      const distance = el.scrollHeight - el.scrollTop - el.clientHeight;
      setAtBottom(distance < 40);
    };
    el.addEventListener("scroll", onScroll);
    onScroll();
    return () => el.removeEventListener("scroll", onScroll);
  }, []);

  React.useEffect(() => {
    const el = scrollRef.current;
    if (!el || !atBottom) return;
    const obs = new MutationObserver(() => {
      el.scrollTop = el.scrollHeight;
    });
    obs.observe(el, { childList: true, subtree: true, characterData: true });
    return () => obs.disconnect();
  }, [atBottom]);

  return (
    <ScrollCtx.Provider value={{ scrollRef, atBottom }}>
      <div className={cn("relative", className)}>
        <div ref={scrollRef} className="h-full overflow-y-auto px-4">
          {children}
        </div>
      </div>
    </ScrollCtx.Provider>
  );
}

export function ConversationContent({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn("max-w-3xl mx-auto py-6 space-y-4", className)}>{children}</div>;
}

export function ConversationScrollButton() {
  const { scrollRef, atBottom } = React.useContext(ScrollCtx);
  if (atBottom) return null;
  return (
    <Button
      size="icon"
      variant="secondary"
      className="absolute bottom-4 right-4 rounded-full shadow-md"
      onClick={() => {
        const el = scrollRef.current;
        if (el) el.scrollTop = el.scrollHeight;
      }}
    >
      <ArrowDown className="h-4 w-4" />
    </Button>
  );
}
