import * as React from "react";
import { cn } from "@/lib/utils";

export function Message({
  from,
  children,
  className,
}: {
  from: string;
  children: React.ReactNode;
  className?: string;
}) {
  const isUser = from === "user";
  return (
    <div className={cn("flex w-full", isUser ? "justify-end" : "justify-start", className)}>
      <div className={cn("flex flex-col max-w-[85%]", isUser && "items-end")}>{children}</div>
    </div>
  );
}

export function MessageContent({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-2xl px-4 py-3 text-sm bg-muted/60 border",
        className,
      )}
    >
      {children}
    </div>
  );
}
