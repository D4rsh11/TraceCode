
"use client";

import { useState } from "react";
import {
  Activity,
  ArrowUp,
  BookOpen,
  ChevronDown,
  Code2,
  FileCode2,
  GitBranch,
  // Github,
  MessageSquare,
  Plus,
  Search,
  Settings2,
  ShieldCheck,
  Sparkles,
  Terminal,
} from "lucide-react";

const suggestions = [
  {
    title: "Architecture",
    description: "Explain how this project is structured.",
    prompt: "Explain the architecture of this codebase.",
  },
  {
    title: "Data flow",
    description: "Trace a request through the system.",
    prompt: "How does data flow through this application?",
  },
  {
    title: "Retrieval",
    description: "Understand search and context selection.",
    prompt: "How does code retrieval work?",
  },
  {
    title: "Debugging",
    description: "Find where a behavior is implemented.",
    prompt: "Where should I start debugging this project?",
  },
];

export default function Home() {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<string[]>([]);

  function sendMessage() {
    const question = input.trim();
    if (!question) return;

    setMessages((previous) => [...previous, question]);
    setInput("");
  }

  return (
    <main className="flex h-screen overflow-hidden bg-[#09090b] text-zinc-100">
      <aside className="hidden w-64 shrink-0 flex-col border-r border-white/[0.08] bg-[#0c0c0f] md:flex">
        <div className="flex h-16 items-center gap-3 border-b border-white/[0.08] px-5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white text-black">
            <GitBranch size={20} />
          </div>
          <div>
            <h1 className="text-sm font-semibold tracking-tight">TraceCode</h1>
            <p className="mt-0.5 text-[10px] tracking-[0.18em] text-zinc-500">
              CODE INTELLIGENCE
            </p>
          </div>
        </div>

        <div className="p-3">
          <button
            onClick={() => setMessages([])}
            className="flex w-full items-center gap-2 rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2.5 text-sm text-zinc-300 transition hover:bg-white/[0.08]"
          >
            <Plus size={16} /> New conversation
          </button>
        </div>

        <p className="px-5 pb-2 pt-5 text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-600">
          Workspace
        </p>

        <button className="mx-2 flex items-center gap-3 rounded-lg bg-white/[0.07] px-3 py-2.5 text-sm text-white">
          <Code2 size={16} /> Codebase chat
        </button>
        <button className="mx-2 flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-zinc-500 transition hover:bg-white/[0.04] hover:text-white">
          <Search size={16} /> Search code
        </button>
        <button className="mx-2 flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-zinc-500 transition hover:bg-white/[0.04] hover:text-white">
          <BookOpen size={16} /> Documentation
        </button>

        <p className="px-5 pb-2 pt-8 text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-600">
          Recent conversations
        </p>
        {messages.slice(-4).map((message, index) => (
          <div
            key={`${message}-${index}`}
            className="mx-2 flex items-center gap-2 truncate rounded-lg px-3 py-2 text-xs text-zinc-500"
          >
            <MessageSquare size={13} className="shrink-0" />
            <span className="truncate">{message}</span>
          </div>
        ))}

        <div className="mt-auto border-t border-white/[0.08] p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-zinc-800 text-sm">
              D
            </div>
            <div>
              <p className="text-xs font-medium">Developer</p>
              <p className="mt-1 text-[10px] text-zinc-500">Local workspace</p>
            </div>
            <Settings2 size={16} className="ml-auto text-zinc-500" />
          </div>
        </div>
      </aside>

      <section className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-16 shrink-0 items-center justify-between border-b border-white/[0.08] px-4 sm:px-7">
          <div className="flex items-center gap-2 text-sm">
            <span className="text-zinc-500">Workspace</span>
            <span className="text-zinc-700">/</span>
            <button className="flex items-center gap-2 font-medium">
              {/* <Github size={16} /> */}
              TraceCode
              <ChevronDown size={14} className="text-zinc-500" />
            </button>
          </div>
          <span className="flex items-center gap-2 rounded-full border border-amber-500/20 bg-amber-500/[0.06] px-3 py-1.5 text-[11px] text-amber-300">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
            Demo mode
          </span>
        </header>

        <div className="flex min-h-0 flex-1">
          <div className="flex min-w-0 flex-1 flex-col">
            <div className="flex-1 overflow-y-auto px-5 py-8 sm:px-10">
              {messages.length === 0 ? (
                <div className="flex h-full flex-col items-center justify-center pb-8">
                  <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04]">
                    <Sparkles size={24} />
                  </div>

                  <p className="mb-3 text-[11px] font-medium uppercase tracking-[0.22em] text-zinc-500">
                    Your codebase, understood
                  </p>
                  <h2 className="text-center text-3xl font-medium tracking-tight sm:text-4xl">
                    Understand the code.
                    <br />
                    <span className="text-zinc-500">Skip the digging.</span>
                  </h2>
                  <p className="mt-4 max-w-md text-center text-sm leading-6 text-zinc-500">
                    Ask questions about your repository, explore implementation
                    details, and trace answers back to source code.
                  </p>

                  <div className="mt-9 grid w-full max-w-2xl grid-cols-1 gap-3 sm:grid-cols-2">
                    {suggestions.map((item) => (
                      <button
                        key={item.title}
                        onClick={() => setInput(item.prompt)}
                        className="rounded-xl border border-white/[0.08] bg-white/[0.015] p-4 text-left transition hover:border-white/20 hover:bg-white/[0.04]"
                      >
                        <p className="text-sm font-medium">{item.title}</p>
                        <p className="mt-1.5 text-xs leading-5 text-zinc-500">
                          {item.description}
                        </p>
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="mx-auto max-w-2xl space-y-7">
                  {messages.map((message, index) => (
                    <div key={`${message}-${index}`}>
                      <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-600">
                        You
                      </p>
                      <p className="whitespace-pre-wrap text-sm leading-7 text-zinc-200">
                        {message}
                      </p>
                      <div className="mt-4 rounded-xl border border-amber-500/20 bg-amber-500/[0.04] p-4">
                        <p className="text-xs font-medium text-amber-200">
                          Backend connection pending
                        </p>
                        <p className="mt-1 text-xs leading-5 text-zinc-400">
                          This is a UI prototype. Connect the Flask API to
                          retrieve real codebase answers and source citations.
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="shrink-0 px-4 pb-3 pt-2 sm:px-8">
              <div className="mx-auto max-w-3xl">
                <form
                  onSubmit={(event) => {
                    event.preventDefault();
                    sendMessage();
                  }}
                  className="rounded-2xl border border-white/[0.12] bg-[#101013] p-3 transition focus-within:border-white/25"
                >
                  <textarea
                    value={input}
                    onChange={(event) => setInput(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" && !event.shiftKey) {
                        event.preventDefault();
                        sendMessage();
                      }
                    }}
                    rows={2}
                    placeholder="Ask anything about your codebase..."
                    className="w-full resize-none bg-transparent px-1 py-1 text-sm leading-6 outline-none placeholder:text-zinc-600"
                  />
                  <div className="mt-2 flex items-center justify-between">
                    <p className="text-[10px] text-zinc-600">
                      Enter to send · Shift + Enter for a new line
                    </p>
                    <button
                      type="submit"
                      disabled={!input.trim()}
                      aria-label="Send message"
                      className="flex h-9 w-9 items-center justify-center rounded-lg bg-white text-black transition hover:bg-zinc-200 disabled:opacity-30"
                    >
                      <ArrowUp size={17} />
                    </button>
                  </div>
                </form>
                <p className="mt-3 text-center text-[10px] text-zinc-600">
                  Always verify important answers against your source code.
                </p>
              </div>
            </div>
          </div>

          <aside className="hidden w-[270px] shrink-0 flex-col border-l border-white/[0.08] bg-[#0c0c0f] xl:flex">
            <div className="flex h-16 items-center gap-2 border-b border-white/[0.08] px-4">
              <FileCode2 size={16} className="text-zinc-400" />
              <span className="text-xs font-medium">Source explorer</span>
            </div>

            <div className="border-b border-white/[0.08] p-4">
              <p className="text-[10px] uppercase tracking-[0.16em] text-zinc-600">
                Repository
              </p>
              <div className="mt-3 flex items-center gap-2 text-xs text-zinc-300">
                {/* <Github size={14} /> */}
                 D4rsh11 / TraceCode
              </div>
              <div className="mt-3 flex items-center gap-2 text-[10px] text-zinc-500">
                <GitBranch size={12} /> main
              </div>
            </div>

            <div className="p-4">
              <p className="text-[10px] uppercase tracking-[0.16em] text-zinc-600">
                Source references
              </p>
              <div className="mt-4 rounded-lg border border-dashed border-white/10 p-4">
                <FileCode2 size={18} className="text-zinc-600" />
                <p className="mt-3 text-xs text-zinc-400">
                  No sources retrieved
                </p>
                <p className="mt-1 text-[10px] leading-5 text-zinc-600">
                  Actual files and line numbers will appear here when the RAG
                  backend is connected.
                </p>
              </div>
            </div>

            <div className="mt-auto border-t border-white/[0.08] p-4">
              <p className="flex items-center gap-2 text-xs font-medium text-zinc-400">
                <Activity size={15} /> System status
              </p>
              <p className="mt-3 flex items-center gap-2 text-[11px] text-zinc-500">
                <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
                Backend not connected
              </p>
              <p className="mt-2 flex items-center gap-2 text-[11px] text-zinc-500">
                <ShieldCheck size={14} /> Frontend prototype
              </p>
              <p className="mt-2 flex items-center gap-2 text-[11px] text-zinc-500">
                <Terminal size={14} /> API integration pending
              </p>
            </div>
          </aside>
        </div>
      </section>
    </main>
  );
}
