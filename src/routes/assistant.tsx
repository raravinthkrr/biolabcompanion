import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { Plus, Trash2, MessageSquare, Copy, RefreshCcw, Menu, ChevronLeft } from "lucide-react";

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
import { listThreads, createThread, deleteThread, getThreadMessages } from "@/lib/data.functions";
import { cn } from "@/lib/utils";
import { exportChatMarkdown } from "@/lib/chat-export";

export const Route = createFileRoute("/assistant")({
  head: () => ({
    meta: [
      { title: "AI Lab Assistant – BioCalc AI" },
      { name: "description", content: "Threaded conversations with an expert biotechnology AI assistant. Streaming answers with markdown, history, and export." },
    ],
  }),
  component: AssistantPage,
});

const QUICK_PROMPTS = [
  "Explain the steps of a standard Gibson assembly cloning protocol.",
  "How do I optimize PCR with a high-GC template?",
  "What controls should I include in a Western blot?",
  "Walk me through designing CRISPR sgRNAs for a knockout.",
];

function AssistantPage() {
  const nav = useNavigate();
  const qc = useQueryClient();
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const listFn = useServerFn(listThreads);
  const createFn = useServerFn(createThread);
  const deleteFn = useServerFn(deleteThread);
  const getMsgsFn = useServerFn(getThreadMessages);

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

  // Pick or create an active thread
  useEffect(() => {
    if (authed !== true || activeId) return;
    if (threadsQ.isSuccess) {
      if (threadsQ.data.length > 0) setActiveId(threadsQ.data[0].id);
      else {
        createFn({ data: {} }).then((t) => { setActiveId(t.id); qc.invalidateQueries({ queryKey: ["threads"] }); });
      }
    }
  }, [authed, threadsQ.isSuccess, threadsQ.data, activeId, createFn, qc]);

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
      <div className="flex-1 container mx-auto px-0 sm:px-4 py-0 sm:py-6 max-w-7xl">
        <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-0 sm:gap-4 min-h-[calc(100vh-12rem)]">
          {/* Sidebar */}
          <aside className={cn(
            "border-r lg:border lg:rounded-xl bg-card flex flex-col",
            sidebarOpen ? "fixed inset-0 z-50 lg:static" : "hidden lg:flex"
          )}>
            <div className="p-3 flex items-center justify-between border-b">
              <span className="font-display font-semibold text-sm">Conversations</span>
              <div className="flex gap-1">
                <Button size="icon-sm" variant="ghost" className="lg:hidden" onClick={() => setSidebarOpen(false)}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button size="icon-sm" variant="ghost" onClick={async () => {
                  const t = await createFn({ data: {} });
                  setActiveId(t.id);
                  qc.invalidateQueries({ queryKey: ["threads"] });
                  setSidebarOpen(false);
                }} title="New chat">
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <ScrollArea className="flex-1">
              <div className="p-2 space-y-1">
                {threadsQ.data?.map((t) => (
                  <div key={t.id} className={cn(
                    "group flex items-center gap-1 rounded-md hover:bg-muted",
                    activeId === t.id && "bg-muted"
                  )}>
                    <button
                      onClick={() => { setActiveId(t.id); setSidebarOpen(false); }}
                      className="flex-1 text-left text-sm px-3 py-2 truncate"
                    >
                      {t.title}
                    </button>
                    <Button size="icon-sm" variant="ghost" className="opacity-0 group-hover:opacity-100"
                      onClick={async (e) => {
                        e.stopPropagation();
                        if (!confirm("Delete this conversation?")) return;
                        await deleteFn({ data: { id: t.id } });
                        if (activeId === t.id) setActiveId(null);
                        qc.invalidateQueries({ queryKey: ["threads"] });
                      }}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ))}
                {threadsQ.data?.length === 0 && <p className="text-xs text-muted-foreground px-3 py-2">No chats yet.</p>}
              </div>
            </ScrollArea>
          </aside>

          {/* Chat */}
          <main className="flex flex-col lg:rounded-xl bg-card border min-h-[600px]">
            <div className="flex items-center justify-between p-3 border-b">
              <div className="flex items-center gap-2">
                <Button size="icon-sm" variant="ghost" className="lg:hidden" onClick={() => setSidebarOpen(true)}>
                  <Menu className="h-4 w-4" />
                </Button>
                <Logo className="h-6 w-6" />
                <span className="font-display font-semibold">BioCalc Assistant</span>
              </div>
            </div>

            {activeId && token ? (
              <ChatWindow
                key={activeId}
                threadId={activeId}
                token={token}
                loadInitial={async () => {
                  const rows = await getMsgsFn({ data: { threadId: activeId } });
                  return rows.map((r) => ({
                    id: r.id, role: r.role as UIMessage["role"], parts: (r.parts as UIMessage["parts"]) ?? [],
                  })) satisfies UIMessage[];
                }}
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

function ChatWindow({ threadId, token, loadInitial }: { threadId: string; token: string; loadInitial: () => Promise<UIMessage[]>; }) {
  const [initial, setInitial] = useState<UIMessage[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    setInitial(null);
    loadInitial().then((rows) => { if (!cancelled) setInitial(rows); }).catch(() => { if (!cancelled) setInitial([]); });
    return () => { cancelled = true; };
  }, [loadInitial]);

  if (!initial) {
    return <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">Loading conversation…</div>;
  }

  return <ChatSession key={`${threadId}:${initial.length}`} threadId={threadId} token={token} initial={initial} />;
}

function ChatSession({ threadId, token, initial }: { threadId: string; token: string; initial: UIMessage[]; }) {
  const transport = useMemo(() => new DefaultChatTransport({
    api: "/api/chat",
    headers: () => ({ Authorization: `Bearer ${token}` }),
    body: () => ({ threadId }),
  }), [token, threadId]);

  const { messages, sendMessage, status, regenerate, error } = useChat({
    id: threadId,
    messages: initial,
    transport,
    onError: (e) => toast.error(e.message),
  });

  useEffect(() => { if (error) toast.error(error.message); }, [error]);

  const isLoading = status === "submitted" || status === "streaming";

  async function handleSubmit(text: string) {
    const v = text.trim();
    if (!v || isLoading) return;
    await sendMessage({ text: v });
  }


  function copyMessage(m: UIMessage) {
    const txt = m.parts.map((p) => p.type === "text" ? p.text : "").join("");
    navigator.clipboard.writeText(txt);
    toast.success("Copied.");
  }

  return (
    <>
      <div className="flex-1 flex flex-col min-h-0">
        <Conversation className="flex-1">
          <ConversationContent>
            {(initial?.length === 0 && messages.length === 0) && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="py-12 text-center max-w-xl mx-auto">
                <Logo className="h-12 w-12 mx-auto" />
                <h2 className="font-display font-bold text-2xl mt-4">Ask anything about the lab</h2>
                <p className="text-muted-foreground text-sm mt-2">Molecular biology, microbiology, biochemistry, calculations, troubleshooting — get expert, scientifically accurate answers.</p>
                <div className="grid sm:grid-cols-2 gap-2 mt-6 text-left">
                  {QUICK_PROMPTS.map((q) => (
                    <button key={q} onClick={() => sendMessage({ text: q })} className="text-sm p-3 rounded-lg border hover:bg-muted hover:border-primary/40 transition-colors">
                      {q}
                    </button>
                  ))}
                </div>
              </motion.div>
            )}
            {messages.map((m, i) => {
              const text = m.parts.map((p) => p.type === "text" ? p.text : "").join("");
              return (
                <Message key={m.id} from={m.role}>
                  <MessageContent>
                    {m.role === "assistant" ? <Markdown>{text}</Markdown> : <p className="whitespace-pre-wrap">{text}</p>}
                    {m.role === "assistant" && (
                      <div className="flex gap-1 mt-2 -ml-1">
                        <Button size="icon-sm" variant="ghost" onClick={() => copyMessage(m)} title="Copy"><Copy className="h-3.5 w-3.5" /></Button>
                        {i === messages.length - 1 && (
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

      <div className="p-3 border-t">
        <div className="flex justify-end mb-2">
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
