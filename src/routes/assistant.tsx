import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { Plus, Trash2, MessageSquare, Copy, RefreshCcw, Menu, ChevronLeft, History, Square, Pencil } from "lucide-react";

import { SiteHeader, SiteFooter } from "@/components/site-chrome";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Markdown } from "@/components/markdown";
import { Conversation, ConversationContent, ConversationScrollButton } from "@/components/ai-elements/conversation";
import { Message, MessageContent } from "@/components/ai-elements/message";
import { PromptInput, PromptInputTextarea, PromptInputFooter, PromptInputSubmit } from "@/components/ai-elements/prompt-input";
import { Shimmer } from "@/components/ai-elements/shimmer";
import { Logo } from "@/components/brand";

import { supabase } from "@/integrations/supabase/client";
import { listThreads, createThread, deleteThread, getThreadMessages, renameThread } from "@/lib/data.functions";
import { cn } from "@/lib/utils";
import { exportChatMarkdown } from "@/lib/chat-export";

export const Route = createFileRoute("/assistant")({
  head: () => ({
    meta: [
      { title: "AI Lab Assistant – BioCalc AI" },
      { name: "description", content: "Chat with a biotechnology AI lab assistant. Practical, accurate answers for PCR, cloning, CRISPR, calculations, and protocols." },
    ],
  }),
  component: AssistantPage,
});

const QUICK_PROMPTS = [
  "Explain PCR",
  "Gibson Assembly Protocol",
  "Calculate Molarity",
  "Prepare 1X TAE Buffer",
  "Explain CRISPR-Cas9",
];

function AssistantPage() {
  const qc = useQueryClient();
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [pendingPrompt, setPendingPrompt] = useState<string | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const listFn = useServerFn(listThreads);
  const createFn = useServerFn(createThread);
  const deleteFn = useServerFn(deleteThread);
  const getMsgsFn = useServerFn(getThreadMessages);
  const renameFn = useServerFn(renameThread);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setAuthed(!!data.session?.user);
      setToken(data.session?.access_token ?? null);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_, session) => {
      setAuthed(!!session?.user);
      setToken(session?.access_token ?? null);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const threadsQ = useQuery({
    queryKey: ["threads"],
    queryFn: () => listFn({}),
    enabled: authed === true,
  });

  async function startNewChat(initialPrompt?: string) {
    const t = await createFn({ data: {} });
    setPendingPrompt(initialPrompt ?? null);
    setActiveId(t.id);
    qc.invalidateQueries({ queryKey: ["threads"] });
    setSidebarOpen(false);
  }

  function openThread(id: string) {
    setPendingPrompt(null);
    setActiveId(id);
    setSidebarOpen(false);
  }

  function backToWelcome() {
    setActiveId(null);
    setPendingPrompt(null);
  }

  async function handleRename(id: string, currentTitle: string) {
    const next = prompt("Rename conversation", currentTitle);
    if (!next || next.trim() === "" || next === currentTitle) return;
    try {
      await renameFn({ data: { id, title: next.trim() } });
      qc.invalidateQueries({ queryKey: ["threads"] });
    } catch {
      toast.error("Could not rename");
    }
  }

  if (authed === false) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <SiteHeader />
        <div className="flex-1 flex items-center justify-center p-8">
          <Card className="p-8 max-w-md text-center shadow-elegant">
            <MessageSquare className="h-8 w-8 mx-auto text-primary mb-3" />
            <h1 className="text-2xl font-display font-bold">Sign in to chat</h1>
            <p className="text-muted-foreground mt-2">The AI assistant saves your conversations to your private account.</p>
            <div className="mt-6 flex justify-center gap-2">
              <Link to="/auth"><Button className="bg-gradient-primary text-primary-foreground">Sign in</Button></Link>
              <Link to="/"><Button variant="outline">Home</Button></Link>
            </div>
          </Card>
        </div>
        <SiteFooter />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <SiteHeader />
      <div className="flex-1 w-full container mx-auto px-0 sm:px-4 py-0 sm:py-6 max-w-7xl min-w-0">
        <div className="grid grid-cols-1 lg:grid-cols-[280px_minmax(0,1fr)] gap-0 sm:gap-4 h-[calc(100vh-12rem)] min-h-[600px]">
          {/* Sidebar */}
          <aside className={cn(
            "border-r lg:border lg:rounded-xl bg-card flex flex-col overflow-hidden",
            "w-full lg:w-[280px] lg:max-w-[280px]",
            sidebarOpen ? "fixed inset-0 z-50 lg:static" : "hidden lg:flex"
          )}>
            <div className="p-3 flex items-center justify-between border-b shrink-0">
              <span className="font-display font-semibold text-sm flex items-center gap-2"><History className="h-4 w-4" />Chat History</span>
              <div className="flex gap-1">
                <Button size="icon-sm" variant="ghost" className="lg:hidden" onClick={() => setSidebarOpen(false)}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button size="icon-sm" variant="ghost" onClick={() => startNewChat()} title="New chat">
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <div className="p-2 border-b shrink-0">
              <Button size="sm" variant="outline" className="w-full justify-start gap-2" onClick={() => startNewChat()}>
                <Plus className="h-4 w-4" /> New Chat
              </Button>
            </div>
            <ScrollArea className="flex-1 min-h-0">
              <div className="p-2 space-y-1">
                {threadsQ.data?.map((t) => (
                  <div key={t.id} className={cn(
                    "group flex items-center gap-1 rounded-md hover:bg-muted",
                    activeId === t.id && "bg-muted"
                  )}>
                    <button
                      onClick={() => openThread(t.id)}
                      className="flex-1 min-w-0 text-left text-sm px-3 py-2 truncate"
                      title={t.title}
                    >
                      {t.title}
                    </button>
                    <div className="flex shrink-0 opacity-0 group-hover:opacity-100">
                      {renameFn && (
                        <Button size="icon-sm" variant="ghost" onClick={(e) => { e.stopPropagation(); handleRename(t.id, t.title); }} title="Rename">
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                      )}
                      <Button size="icon-sm" variant="ghost"
                        onClick={async (e) => {
                          e.stopPropagation();
                          if (!confirm("Delete this conversation?")) return;
                          await deleteFn({ data: { id: t.id } });
                          if (activeId === t.id) setActiveId(null);
                          qc.invalidateQueries({ queryKey: ["threads"] });
                        }}
                        title="Delete">
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                ))}
                {threadsQ.data?.length === 0 && <p className="text-xs text-muted-foreground px-3 py-2">No chats yet.</p>}
              </div>
            </ScrollArea>
          </aside>

          {/* Chat */}
          <main className="flex flex-col lg:rounded-xl bg-card border min-w-0 overflow-hidden">
            <div className="flex items-center justify-between p-3 border-b shrink-0">
              <div className="flex items-center gap-2 min-w-0">
                <Button size="icon-sm" variant="ghost" className="lg:hidden" onClick={() => setSidebarOpen(true)}>
                  <Menu className="h-4 w-4" />
                </Button>
                <Logo className="h-6 w-6 shrink-0" />
                <span className="font-display font-semibold truncate">BioCalc Assistant</span>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <Button size="sm" variant="ghost" onClick={() => startNewChat()} className="gap-1">
                  <Plus className="h-4 w-4" /> New Chat
                </Button>
                {activeId && (
                  <Button size="sm" variant="ghost" onClick={backToWelcome} title="Close chat">
                    Close
                  </Button>
                )}
              </div>
            </div>

            {!activeId ? (
              <WelcomeScreen onPick={(p) => startNewChat(p)} />
            ) : token ? (
              <ChatWindow
                key={activeId}
                threadId={activeId}
                token={token}
                pendingPrompt={pendingPrompt}
                onPromptConsumed={() => setPendingPrompt(null)}
                getMsgsFn={getMsgsFn}
              />
            ) : (
              <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">Loading…</div>
            )}
          </main>
        </div>
      </div>
      <SiteFooter />
    </div>
  );
}

function WelcomeScreen({ onPick }: { onPick: (prompt: string) => void }) {
  return (
    <div className="flex-1 flex items-center justify-center p-6 overflow-y-auto">
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="text-center max-w-xl">
        <div className="text-4xl mb-3">🧬</div>
        <h1 className="font-display font-bold text-2xl sm:text-3xl">BioCalc AI Lab Assistant</h1>
        <p className="text-muted-foreground text-sm mt-3">
          Ask any biotechnology, molecular biology, microbiology, genetics, PCR, cloning, or laboratory question.
        </p>
        <div className="flex flex-wrap gap-2 justify-center mt-6">
          {QUICK_PROMPTS.map((q) => (
            <button
              key={q}
              type="button"
              onClick={() => onPick(q)}
              className="text-sm px-3 py-1.5 rounded-full border bg-background hover:bg-muted hover:border-primary/40 transition-colors"
            >
              {q}
            </button>
          ))}
        </div>
        <p className="text-xs text-muted-foreground mt-6">Open <History className="inline h-3 w-3" /> Chat History from the sidebar to revisit a previous conversation.</p>
      </motion.div>
    </div>
  );
}

function ChatWindow({ threadId, token, getMsgsFn, pendingPrompt, onPromptConsumed }: { threadId: string; token: string; getMsgsFn: (args: { data: { threadId: string } }) => Promise<Array<{ id: string; role: string; parts: unknown }>>; pendingPrompt: string | null; onPromptConsumed: () => void; }) {
  const [initial, setInitial] = useState<UIMessage[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    setInitial(null);
    getMsgsFn({ data: { threadId } })
      .then((rows) => {
        if (cancelled) return;
        setInitial(rows.map((r) => ({
          id: r.id, role: r.role as UIMessage["role"], parts: (r.parts as UIMessage["parts"]) ?? [],
        })));
      })
      .catch(() => { if (!cancelled) setInitial([]); });
    return () => { cancelled = true; };
  }, [threadId, getMsgsFn]);

  if (!initial) {
    return <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">Loading conversation…</div>;
  }

  return <ChatSession key={threadId} threadId={threadId} token={token} initial={initial} pendingPrompt={pendingPrompt} onPromptConsumed={onPromptConsumed} />;
}

function ChatSession({ threadId, token, initial, pendingPrompt, onPromptConsumed }: { threadId: string; token: string; initial: UIMessage[]; pendingPrompt: string | null; onPromptConsumed: () => void; }) {
  const transport = useMemo(() => new DefaultChatTransport({
    api: "/api/chat",
    headers: () => ({ Authorization: `Bearer ${token}` }),
    body: () => ({ threadId }),
  }), [token, threadId]);

  const { messages, sendMessage, status, regenerate, stop, error } = useChat({
    id: threadId,
    messages: initial,
    transport,
    onError: (e) => toast.error(e.message),
  });

  useEffect(() => { if (error) toast.error(error.message); }, [error]);

  const sendRef = useRef(sendMessage);
  useEffect(() => { sendRef.current = sendMessage; }, [sendMessage]);

  const consumedRef = useRef(false);
  useEffect(() => {
    if (!pendingPrompt) return;
    if (consumedRef.current) return;
    if (initial.length > 0) return;
    consumedRef.current = true;
    // Fire immediately — no awaits, no extra effects.
    sendRef.current({ text: pendingPrompt });
    onPromptConsumed();
  }, [pendingPrompt, initial.length, onPromptConsumed]);

  const isLoading = status === "submitted" || status === "streaming";

  const handleSubmit = useCallback((text: string) => {
    const v = text.trim();
    if (!v || isLoading) return;
    sendRef.current({ text: v });
  }, [isLoading]);

  function copyMessage(m: UIMessage) {
    const txt = m.parts.map((p) => p.type === "text" ? p.text : "").join("");
    navigator.clipboard.writeText(txt);
    toast.success("Copied.");
  }

  return (
    <>
      <div className="flex-1 flex flex-col min-h-0 min-w-0">
        <Conversation className="flex-1 min-h-0">
          <ConversationContent>
            {messages.map((m, i) => {
              const text = m.parts.map((p) => p.type === "text" ? p.text : "").join("");
              return (
                <Message key={m.id} from={m.role}>
                  <MessageContent className="max-w-full overflow-hidden">
                    {m.role === "assistant" ? <Markdown>{text}</Markdown> : <p className="whitespace-pre-wrap break-words">{text}</p>}
                    {m.role === "assistant" && text.length > 0 && (
                      <div className="flex gap-1 mt-2 -ml-1">
                        <Button size="icon-sm" variant="ghost" onClick={() => copyMessage(m)} title="Copy"><Copy className="h-3.5 w-3.5" /></Button>
                        {i === messages.length - 1 && !isLoading && (
                          <Button size="icon-sm" variant="ghost" onClick={() => regenerate()} title="Regenerate"><RefreshCcw className="h-3.5 w-3.5" /></Button>
                        )}
                      </div>
                    )}
                  </MessageContent>
                </Message>
              );
            })}
            {status === "submitted" && (
              <Message from="assistant">
                <MessageContent>
                  <Shimmer>Thinking…</Shimmer>
                </MessageContent>
              </Message>
            )}
          </ConversationContent>
          <ConversationScrollButton />
        </Conversation>
      </div>

      <div className="p-3 border-t shrink-0">
        <div className="flex justify-between items-center mb-2 gap-2">
          {isLoading ? (
            <Button variant="outline" size="sm" onClick={() => stop()} className="gap-1">
              <Square className="h-3.5 w-3.5" /> Stop
            </Button>
          ) : <span />}
          <Button variant="ghost" size="sm" onClick={() => exportChatMarkdown(messages)} disabled={messages.length === 0}>Export markdown</Button>
        </div>
        <PromptInput onSubmit={handleSubmit}>
          <PromptInputTextarea placeholder="Ask BioCalc AI about your experiment…" />
          <PromptInputFooter className="justify-end">
            <PromptInputSubmit status={status} disabled={isLoading} />
          </PromptInputFooter>
        </PromptInput>
      </div>
    </>
  );
}
