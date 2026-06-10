import * as React from "react";
import { Send, Loader2, Square } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

const PromptCtx = React.createContext<{
  value: string;
  setValue: (v: string) => void;
  submit: () => void;
}>({ value: "", setValue: () => {}, submit: () => {} });

export function PromptInput({
  onSubmit,
  children,
  className,
}: {
  onSubmit: (text: string) => void;
  children: React.ReactNode;
  className?: string;
}) {
  const [value, setValue] = React.useState("");
  const submit = React.useCallback(() => {
    const t = value.trim();
    if (!t) return;
    onSubmit(t);
    setValue("");
  }, [value, onSubmit]);

  return (
    <PromptCtx.Provider value={{ value, setValue, submit }}>
      <form
        className={cn(
          "max-w-3xl mx-auto w-full rounded-2xl border bg-background shadow-sm focus-within:ring-2 focus-within:ring-ring/40 transition-shadow",
          className,
        )}
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
      >
        {children}
      </form>
    </PromptCtx.Provider>
  );
}

export function PromptInputTextarea({
  placeholder,
  className,
}: {
  placeholder?: string;
  className?: string;
}) {
  const { value, setValue, submit } = React.useContext(PromptCtx);
  return (
    <textarea
      value={value}
      onChange={(e) => setValue(e.target.value)}
      placeholder={placeholder}
      rows={2}
      onKeyDown={(e) => {
        if (e.key === "Enter" && !e.shiftKey) {
          e.preventDefault();
          submit();
        }
      }}
      className={cn(
        "w-full resize-none bg-transparent px-4 py-3 text-sm outline-none placeholder:text-muted-foreground min-h-[60px] max-h-48",
        className,
      )}
    />
  );
}

export function PromptInputFooter({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <div className={cn("flex items-center gap-2 px-2 pb-2", className)}>{children}</div>;
}

export function PromptInputSubmit({
  status,
  disabled,
}: {
  status?: string;
  disabled?: boolean;
}) {
  const { value } = React.useContext(PromptCtx);
  const isStreaming = status === "streaming" || status === "submitted";
  return (
    <Button type="submit" size="icon" disabled={disabled || (!isStreaming && !value.trim())}>
      {status === "submitted" ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : isStreaming ? (
        <Square className="h-4 w-4" />
      ) : (
        <Send className="h-4 w-4" />
      )}
    </Button>
  );
}
