"use client";

import { FormEvent, KeyboardEvent, useCallback, useEffect, useState } from "react";

import Image from "next/image";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

import {

  Activity,

  ArrowUp,

  BookOpen,

  CheckCircle2,

  ChevronDown,

  Code2,

  ExternalLink,

  FileCode2,

  GitBranch,

  LoaderCircle,

  MessageSquare,

  Plus,

  Search,

  Settings2,

  ShieldCheck,

  Sparkles,

  Terminal,

  XCircle,

} from "lucide-react";

const API_URL =

  process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

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

type Source = {

  file?: string;

  path?: string;

  filename?: string;

  lines?: string;

  start_line?: number;

  end_line?: number;

  line_start?: number;

  line_end?: number;

  content?: string;

  snippet?: string;

  url?: string;

};

type Message = {

  id: number;

  role: "user" | "assistant";

  content: string;

  sources?: Source[];

};

type ApiResponse = {

  success?: boolean;

  status?: string;

  message?: string;

  error?: string;

  answer?: string;

  repository?: string;

  path?: string;

  sources?: Source[];

};

function repositoryName(url: string) {

  return url

    .replace(/\/+$/, "")

    .split("/")

    .pop()

    ?.replace(/\.git$/, "") || "Repository";

}

function validateRepositoryUrl(value: string) {

  try {

    const url = new URL(value.trim());

    if (url.protocol !== "https:" || url.hostname !== "github.com") {

      return false;

    }

    const parts = url.pathname.split("/").filter(Boolean);

    return (

      parts.length === 2 &&

      /^[A-Za-z0-9\_.-]+$/.test(parts[0]) &&

      /^[A-Za-z0-9\_.-]+$/.test(parts[1]) &&

      parts[0] !== "." &&

      parts[0] !== ".." &&

      parts[1] !== "." &&

      parts[1] !== ".."

    );

  } catch {

    return false;

  }

}

function normalizeMarkdown(content: string) {
  // Models sometimes escape Markdown punctuation even though no escaping is needed.
  return content.replace(/\\([#*`_[\]|])/g, "$1");
}

function MarkdownAnswer({ content }: { content: string }) {
  return (
    <div className="break-words text-sm leading-7 text-zinc-200">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: ({ children }) => (
            <h1 className="mb-4 mt-6 text-2xl font-bold">{children}</h1>
          ),
          h2: ({ children }) => (
            <h2 className="mb-3 mt-5 text-xl font-semibold">{children}</h2>
          ),
          h3: ({ children }) => (
            <h3 className="mb-2 mt-4 text-lg font-semibold">{children}</h3>
          ),
          p: ({ children }) => (
            <p className="mb-3 leading-7 text-zinc-200">{children}</p>
          ),
          ul: ({ children }) => (
            <ul className="mb-4 list-disc space-y-2 pl-6">{children}</ul>
          ),
          ol: ({ children }) => (
            <ol className="mb-4 list-decimal space-y-2 pl-6">{children}</ol>
          ),
          li: ({ children }) => <li className="pl-1">{children}</li>,
          blockquote: ({ children }) => (
            <blockquote className="my-3 border-l-2 border-zinc-600 pl-4 text-zinc-400">
              {children}
            </blockquote>
          ),
          pre: ({ children }) => (
            <pre className="my-4 overflow-x-auto rounded-lg border border-zinc-800 bg-zinc-950 p-4 text-sm">
              {children}
            </pre>
          ),
          code: ({ children, className }) => (
            <code
              className={
                className
                  ? `${className} font-mono`
                  : "rounded bg-zinc-800 px-1.5 py-0.5 font-mono text-sm"
              }
            >
              {children}
            </code>
          ),
          table: ({ children }) => (
            <div className="my-4 overflow-x-auto">
              <table className="w-full border-collapse text-left text-sm">
                {children}
              </table>
            </div>
          ),
          th: ({ children }) => (
            <th className="border border-zinc-700 px-3 py-2 font-semibold">
              {children}
            </th>
          ),
          td: ({ children }) => (
            <td className="border border-zinc-800 px-3 py-2 align-top">
              {children}
            </td>
          ),
          a: ({ children, href }) => (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sky-400 underline underline-offset-2 hover:text-sky-300"
            >
              {children}
            </a>
          ),
          hr: () => <hr className="my-5 border-white/10" />,
        }}
      >
        {normalizeMarkdown(content)}
      </ReactMarkdown>
    </div>
  );
}

export default function Home() {

  const [input, setInput] = useState("");

  const [repoUrl, setRepoUrl] = useState("");

  const [repoName, setRepoName] = useState("");

  const [messages, setMessages] = useState<Message[]>([]);

  const [sources, setSources] = useState<Source[]>([]);

  const [isIndexing, setIsIndexing] = useState(false);

  const [isAsking, setIsAsking] = useState(false);

  const [backendOnline, setBackendOnline] = useState<boolean | null>(null);

  const [repoReady, setRepoReady] = useState(false);

  const [repoError, setRepoError] = useState("");

  const [repoSuccess, setRepoSuccess] = useState("");

  const [chatError, setChatError] = useState("");

  const [showRepositoryForm, setShowRepositoryForm] = useState(true);

  const [showSources, setShowSources] = useState(true);

  const checkHealth = useCallback(async () => {

    try {

      const response = await fetch(`${API_URL}/api/health`, {

        signal: AbortSignal.timeout(5000),

        cache: "no-store",

      });

      const data: ApiResponse = await response.json();

      setBackendOnline(response.ok && data.success === true);

    } catch {

      setBackendOnline(false);

    }

  }, []);

  useEffect(() => {

    void checkHealth();

    const interval = window.setInterval(() => {

      void checkHealth();

    }, 15000);

    return () => window.clearInterval(interval);

  }, [checkHealth]);

  async function connectRepository(event?: FormEvent) {

    event?.preventDefault();

    const url = repoUrl.trim();

    if (!validateRepositoryUrl(url)) {

      setRepoError(

        "Enter a valid repository URL, such as https://github.com/owner/repository."

      );

      setRepoSuccess("");

      return;

    }

    if (isIndexing) return;

    setIsIndexing(true);

    setRepoError("");

    setRepoSuccess("");

    setChatError("");

    setRepoReady(false);

    setMessages([]);

    setSources([]);

    try {

      const response = await fetch(`${API_URL}/api/index`, {

        method: "POST",

        headers: {

          "Content-Type": "application/json",

        },

        body: JSON.stringify({ url }),

      });

      const data: ApiResponse = await response.json();

      if (!response.ok || !data.success) {

        throw new Error(data.error || "Repository indexing failed.");

      }

      setRepoUrl(url);

      setRepoName(repositoryName(url));

      setRepoReady(true);

      setRepoSuccess(

        data.message || "Repository indexed successfully. Start asking questions."

      );

      setShowRepositoryForm(false);

      setBackendOnline(true);

    } catch (error) {

      setRepoError(

        error instanceof Error

          ? error.message

          : "Could not connect to the TraceCode backend."

      );

      void checkHealth();

    } finally {

      setIsIndexing(false);

    }

  }

  async function sendMessage(questionOverride?: string) {

    const question = (questionOverride ?? input).trim();

    if (!question || isAsking || isIndexing) return;

    if (!repoReady) {

      setChatError("Connect and index a repository before asking questions.");

      return;

    }

    setInput("");

    setChatError("");

    setSources([]);

    const userMessage: Message = {

      id: Date.now(),

      role: "user",

      content: question,

    };

    setMessages((previous) => [...previous, userMessage]);

    setIsAsking(true);

    try {

      const response = await fetch(`${API_URL}/api/query`, {

        method: "POST",

        headers: {

          "Content-Type": "application/json",

        },

        body: JSON.stringify({ question }),

      });

      const data: ApiResponse = await response.json();

      if (!response.ok || !data.success) {

        throw new Error(data.error || "Failed to generate an answer.");

      }

      const answer = data.answer?.trim();

      if (!answer) {

        throw new Error("The backend returned an empty answer.");

      }

      const returnedSources = Array.isArray(data.sources)

        ? data.sources

        : [];

      const assistantMessage: Message = {

        id: Date.now() + 1,

        role: "assistant",

        content: answer,

        sources: returnedSources,

      };

      setMessages((previous) => [...previous, assistantMessage]);

      setSources(returnedSources);

    } catch (error) {

      setChatError(

        error instanceof Error

          ? error.message

          : "Could not get an answer from the backend."

      );

    } finally {

      setIsAsking(false);

    }

  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {

    if (event.key === "Enter" && !event.shiftKey) {

      event.preventDefault();

      void sendMessage();

    }

  }

  function startNewConversation() {

    setMessages([]);

    setSources([]);

    setInput("");

    setChatError("");

  }

  function renderSource(source: Source, index: number) {

    const file =

      source.path || source.file || source.filename || "Source file";

    const lineStart = source.start_line ?? source.line_start;

    const lineEnd = source.end_line ?? source.line_end;

    const lineLabel =

      source.lines ||

      (typeof lineStart === "number"

        ? lineEnd && lineEnd !== lineStart

          ? `${lineStart}–${lineEnd}`

          : `${lineStart}`

        : null);

    const snippet = source.snippet || source.content;

    const githubUrl =

      source.url ||

      (repoUrl && lineStart

        ? `${repoUrl.replace(/\/+$/, "")}/blob/HEAD/${file}#L${lineStart}`

        : null);

    return (

      <div

        key={`${file}-${index}`}

        className="rounded-lg border border-white/[0.08] bg-white/[0.02] p-3"

      >

        <div className="flex items-start gap-2">

          <FileCode2

            size={15}

            className="mt-0.5 shrink-0 text-zinc-400"

          />

          <div className="min-w-0 flex-1">

            <p className="break-all text-xs font-medium text-zinc-200">

              {file}

            </p>

            {lineLabel && (

              <p className="mt-1 text-[10px] text-zinc-500">

                Lines {lineLabel}

              </p>

            )}

          </div>

          {githubUrl && (

            <a

              href={githubUrl}

              target="_blank"

              rel="noopener noreferrer"

              aria-label={`Open ${file} on GitHub`}

              className="shrink-0 text-zinc-500 transition hover:text-white"

            >

              <ExternalLink size={14} />

            </a>

          )}

        </div>

        {snippet && (

          <pre className="mt-3 max-h-40 overflow-auto whitespace-pre-wrap break-words rounded-md bg-black/30 p-2 text-[11px] leading-5 text-zinc-400">

            {snippet}

          </pre>

        )}

      </div>

    );

  }

  return (

    <main className="flex h-dvh overflow-hidden bg-[#09090b] text-zinc-100">

      <aside className="hidden w-64 shrink-0 flex-col border-r border-white/[0.08] bg-[#0c0c0f] md:flex">

        <div className="flex h-16 items-center gap-3 border-b border-white/[0.08] px-5">

          <div className="flex h-9 w-12 shrink-0 items-center justify-center">

            <Image

              src="/tracecode-logo.png"

              alt="TraceCode logo"

              width={48}

              height={31}

              priority

              className="h-auto w-12 object-contain"

            />

          </div>

          <div>

            <h1 className="text-sm font-semibold tracking-tight">

              TraceCode

            </h1>

            <p className="mt-0.5 text-[10px] tracking-[0.18em] text-zinc-500">

              CODE INTELLIGENCE

            </p>

          </div>

        </div>

        <div className="p-3">

          <button

            onClick={startNewConversation}

            className="flex w-full items-center gap-2 rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2.5 text-sm text-zinc-300 transition hover:bg-white/[0.08]"

          >

            <Plus size={16} />

            New conversation

          </button>

        </div>

        <p className="px-5 pb-2 pt-5 text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-600">

          Workspace

        </p>

        <button className="mx-2 flex items-center gap-3 rounded-lg bg-white/[0.07] px-3 py-2.5 text-sm text-white">

          <Code2 size={16} />

          Codebase chat

        </button>

        <button

          onClick={() => setShowRepositoryForm(true)}

          className="mx-2 flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-zinc-500 transition hover:bg-white/[0.04] hover:text-white"

        >

          <Search size={16} />

          Connect repository

        </button>

        <button

          onClick={() => setShowSources((previous) => !previous)}

          className="mx-2 flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-zinc-500 transition hover:bg-white/[0.04] hover:text-white"

        >

          <BookOpen size={16} />

          Source explorer

        </button>

        <p className="px-5 pb-2 pt-8 text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-600">

          Recent messages

        </p>

        {messages.slice(-4).map((message) => (

          <button

            key={message.id}

            onClick={() => {

              const element = document.getElementById(

                `message-${message.id}`

              );

              element?.scrollIntoView({ behavior: "smooth" });

            }}

            className="mx-2 flex items-center gap-2 truncate rounded-lg px-3 py-2 text-left text-xs text-zinc-500 hover:bg-white/[0.04]"

          >

            <MessageSquare size={13} className="shrink-0" />

            <span className="truncate">{normalizeMarkdown(message.content).replace(/\s+/g, " ").slice(0, 70)}</span>

          </button>

        ))}

        <div className="mt-auto border-t border-white/[0.08] p-4">

          <div className="flex items-center gap-3">

            <div className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-zinc-800 text-sm">

              D

            </div>

            <div>

              <p className="text-xs font-medium">Developer</p>

              <p className="mt-1 text-[10px] text-zinc-500">

                Local workspace

              </p>

            </div>

            <Settings2 size={16} className="ml-auto text-zinc-500" />

          </div>

        </div>

      </aside>

      <section className="flex min-w-0 flex-1 flex-col">

        <header className="flex h-16 shrink-0 items-center justify-between gap-3 border-b border-white/[0.08] px-4 sm:px-7">

          <div className="flex min-w-0 items-center gap-2 text-sm">

            <span className="hidden text-zinc-500 sm:inline">

              Workspace

            </span>

            <span className="hidden text-zinc-700 sm:inline">/</span>

            <button

              onClick={() => setShowRepositoryForm(true)}

              className="flex min-w-0 items-center gap-2 font-medium hover:text-zinc-300"

            >

              <GitBranch size={16} className="shrink-0" />

              <span className="max-w-40 truncate">

                {repoName || "Connect repository"}

              </span>

              <ChevronDown size={14} className="shrink-0 text-zinc-500" />

            </button>

          </div>

          <div

            className={`flex shrink-0 items-center gap-2 rounded-full border px-3 py-1.5 text-[11px] ${backendOnline

              ? "border-emerald-500/20 bg-emerald-500/[0.06] text-emerald-300"

              : "border-amber-500/20 bg-amber-500/[0.06] text-amber-300"

              }`}

          >

            <span

              className={`h-1.5 w-1.5 rounded-full ${backendOnline ? "bg-emerald-400" : "bg-amber-400"

                }`}

            />

            {backendOnline === null

              ? "Checking API"

              : backendOnline

                ? "API connected"

                : "API offline"}

          </div>

        </header>

        <div className="flex min-h-0 flex-1">

          <div className="flex min-w-0 flex-1 flex-col">

            <div className="flex-1 overflow-y-auto px-5 py-8 sm:px-10">

              {messages.length === 0 ? (

                <div className="flex min-h-full flex-col items-center justify-center pb-8">

                  <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04]">

                    <Sparkles size={24} />

                  </div>

                  <p className="mb-3 text-center text-[11px] font-medium uppercase tracking-[0.22em] text-zinc-500">

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

                  {showRepositoryForm && (

                    <form

                      onSubmit={(event) => void connectRepository(event)}

                      className="mt-7 w-full max-w-2xl rounded-2xl border border-white/10 bg-[#101013] p-4"

                    >

                      <div className="mb-3 flex items-center justify-between gap-3">

                        <div>

                          <p className="text-sm font-medium">

                            Connect a GitHub repository

                          </p>

                          <p className="mt-1 text-xs text-zinc-500">

                            Start with a public repository URL.

                          </p>

                        </div>

                        {repoReady && (

                          <button

                            type="button"

                            onClick={() => setShowRepositoryForm(false)}

                            className="text-zinc-500 hover:text-white"

                            aria-label="Close repository form"

                          >

                            <XCircle size={17} />

                          </button>

                        )}

                      </div>

                      <label

                        htmlFor="repository-url"

                        className="sr-only"

                      >

                        GitHub repository URL

                      </label>

                      <div className="flex flex-col gap-2 sm:flex-row">

                        <input

                          id="repository-url"

                          type="url"

                          value={repoUrl}

                          onChange={(event) => setRepoUrl(event.target.value)}

                          placeholder="https://github.com/owner/repository"

                          disabled={isIndexing}

                          className="min-w-0 flex-1 rounded-lg border border-white/10 bg-black/30 px-3 py-3 text-sm outline-none placeholder:text-zinc-600 focus:border-zinc-500 disabled:opacity-50"

                        />

                        <button

                          type="submit"

                          disabled={isIndexing || !repoUrl.trim()}

                          className="flex items-center justify-center gap-2 rounded-lg bg-white px-4 py-3 text-sm font-medium text-black transition hover:bg-zinc-200 disabled:cursor-not-allowed disabled:opacity-40"

                        >

                          {isIndexing ? (

                            <>

                              <LoaderCircle size={15} className="animate-spin" />

                              Indexing...

                            </>

                          ) : (

                            "Connect repository"

                          )}

                        </button>

                      </div>

                      {isIndexing && (

                        <div className="mt-4">

                          <div className="h-1 overflow-hidden rounded-full bg-white/[0.08]">

                            <div className="h-full w-1/3 animate-pulse rounded-full bg-zinc-300" />

                          </div>

                          <p className="mt-2 text-xs text-zinc-400">

                            Cloning and indexing repository. This can take a

                            while for larger projects.

                          </p>

                        </div>

                      )}

                      {repoError && (

                        <p role="alert" className="mt-3 text-xs text-red-400">

                          {repoError}

                        </p>

                      )}

                      {repoSuccess && (

                        <p

                          role="status"

                          className="mt-3 flex items-center gap-2 text-xs text-emerald-400"

                        >

                          <CheckCircle2 size={14} />

                          {repoSuccess}

                        </p>

                      )}

                      <p className="mt-3 text-[10px] leading-5 text-zinc-600">

                        Private repositories require authentication, which

                        isn't configured in this version.

                      </p>

                    </form>

                  )}

                  {!showRepositoryForm && repoReady && (

                    <button

                      onClick={() => setShowRepositoryForm(true)}

                      className="mt-6 flex items-center gap-2 rounded-lg border border-white/10 px-4 py-2.5 text-xs text-zinc-300 hover:bg-white/[0.05]"

                    >

                      <GitBranch size={14} />

                      {repoName}

                      <ChevronDown size={13} />

                    </button>

                  )}

                  {repoReady && (

                    <div className="mt-4 flex items-center gap-2 text-xs text-emerald-400">

                      <CheckCircle2 size={14} />

                      Repository ready for questions

                    </div>

                  )}

                  <div className="mt-7 grid w-full max-w-2xl grid-cols-1 gap-3 sm:grid-cols-2">

                    {suggestions.map((item) => (

                      <button

                        key={item.title}

                        onClick={() => {

                          if (!repoReady) {

                            setShowRepositoryForm(true);

                            setChatError(

                              "Connect a repository first, then choose a prompt."

                            );

                            return;

                          }

                          void sendMessage(item.prompt);

                        }}

                        disabled={isAsking || isIndexing}

                        className="rounded-xl border border-white/[0.08] bg-white/[0.015] p-4 text-left transition hover:border-white/20 hover:bg-white/[0.04] disabled:opacity-50"

                      >

                        <p className="text-sm font-medium">{item.title}</p>

                        <p className="mt-1.5 text-xs leading-5 text-zinc-500">

                          {item.description}

                        </p>

                      </button>

                    ))}

                  </div>

                  {chatError && (

                    <p role="alert" className="mt-4 text-xs text-amber-300">

                      {chatError}

                    </p>

                  )}

                </div>

              ) : (

                <div className="mx-auto max-w-3xl space-y-8">

                  {messages.map((message) => (

                    <article

                      key={message.id}

                      id={`message-${message.id}`}

                      className="scroll-mt-6"

                    >

                      <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-600">

                        {message.role === "user" ? "You" : "TraceCode"}

                      </p>

                      {message.role === "assistant" ? (
                        <MarkdownAnswer content={message.content} />
                      ) : (
                        <p className="whitespace-pre-wrap break-words text-sm leading-7 text-zinc-200">
                          {message.content}
                        </p>
                      )}

                      {message.role === "assistant" &&

                        message.sources &&

                        message.sources.length > 0 && (

                          <div className="mt-5">

                            <p className="mb-3 text-xs font-medium text-zinc-400">

                              Sources ({message.sources.length})

                            </p>

                            <div className="grid gap-2">

                              {message.sources.map((source, index) =>

                                renderSource(source, index)

                              )}

                            </div>

                          </div>

                        )}

                    </article>

                  ))}

                  {isAsking && (

                    <div className="flex items-center gap-3 text-sm text-zinc-500">

                      <LoaderCircle size={16} className="animate-spin" />

                      Searching the codebase and generating an answer...

                    </div>

                  )}

                  {chatError && (

                    <div

                      role="alert"

                      className="rounded-xl border border-red-500/20 bg-red-500/[0.04] p-3 text-xs text-red-300"

                    >

                      {chatError}

                    </div>

                  )}

                  <div />

                </div>

              )}

            </div>

            {(repoReady || messages.length > 0) && (

              <div className="shrink-0 px-4 pb-3 pt-2 sm:px-8">

                <div className="mx-auto max-w-3xl">

                  <form

                    onSubmit={(event) => {

                      event.preventDefault();

                      void sendMessage();

                    }}

                    className="rounded-2xl border border-white/[0.12] bg-[#101013] p-3 transition focus-within:border-white/25"

                  >

                    <textarea

                      value={input}

                      onChange={(event) => setInput(event.target.value)}

                      onKeyDown={handleKeyDown}

                      rows={2}

                      disabled={isAsking || isIndexing}

                      placeholder={

                        repoReady

                          ? "Ask anything about your codebase..."

                          : "Connect a repository to start chatting..."

                      }

                      className="w-full resize-none bg-transparent px-1 py-1 text-sm leading-6 outline-none placeholder:text-zinc-600 disabled:opacity-50"

                    />

                    <div className="mt-2 flex items-center justify-between">

                      <p className="text-[10px] text-zinc-600">

                        Enter to send · Shift + Enter for a new line

                      </p>

                      <button

                        type="submit"

                        disabled={

                          !input.trim() ||

                          isAsking ||

                          isIndexing ||

                          !repoReady

                        }

                        aria-label="Send message"

                        className="flex h-9 w-9 items-center justify-center rounded-lg bg-white text-black transition hover:bg-zinc-200 disabled:cursor-not-allowed disabled:opacity-30"

                      >

                        {isAsking ? (

                          <LoaderCircle size={16} className="animate-spin" />

                        ) : (

                          <ArrowUp size={17} />

                        )}

                      </button>

                    </div>

                  </form>

                  <p className="mt-3 text-center text-[10px] text-zinc-600">

                    Verify important answers against your source code.

                  </p>

                </div>

              </div>

            )}

          </div>

          {showSources && (

            <aside className="hidden w-[270px] shrink-0 flex-col border-l border-white/[0.08] bg-[#0c0c0f] xl:flex">

              <div className="flex h-16 items-center justify-between border-b border-white/[0.08] px-4">

                <div className="flex items-center gap-2">

                  <FileCode2 size={16} className="text-zinc-400" />

                  <span className="text-xs font-medium">Source explorer</span>

                </div>

                <button

                  onClick={() => setShowSources(false)}

                  aria-label="Close source explorer"

                  className="text-zinc-600 hover:text-white"

                >

                  <XCircle size={15} />

                </button>

              </div>

              <div className="border-b border-white/[0.08] p-4">

                <p className="text-[10px] uppercase tracking-[0.16em] text-zinc-600">

                  Repository

                </p>

                <div className="mt-3 flex items-center gap-2 text-xs text-zinc-300">

                  <GitBranch size={14} />

                  <span className="break-all">

                    {repoName || "No repository connected"}

                  </span>

                </div>

                {repoUrl && (

                  <a

                    href={repoUrl}

                    target="_blank"

                    rel="noopener noreferrer"

                    className="mt-3 flex items-center gap-2 break-all text-[10px] text-zinc-500 hover:text-zinc-300"

                  >

                    Open on GitHub <ExternalLink size={11} />

                  </a>

                )}

                <div className="mt-3 flex items-center gap-2 text-[10px] text-zinc-500">

                  <GitBranch size={12} />

                  Default branch

                </div>

                {repoReady && (

                  <p className="mt-3 flex items-center gap-2 text-[10px] text-emerald-400">

                    <CheckCircle2 size={12} />

                    Indexed

                  </p>

                )}

              </div>

              <div className="min-h-0 flex-1 overflow-y-auto p-4">

                <p className="text-[10px] uppercase tracking-[0.16em] text-zinc-600">

                  Latest answer sources

                </p>

                {sources.length > 0 ? (

                  <div className="mt-4 space-y-2">

                    {sources.map((source, index) =>

                      renderSource(source, index)

                    )}

                  </div>

                ) : (

                  <div className="mt-4 rounded-lg border border-dashed border-white/10 p-4">

                    <FileCode2 size={18} className="text-zinc-600" />

                    <p className="mt-3 text-xs text-zinc-400">

                      No sources retrieved

                    </p>

                    <p className="mt-1 text-[10px] leading-5 text-zinc-600">

                      File references returned by the RAG backend will appear

                      here after you ask a question.

                    </p>

                  </div>

                )}

              </div>

              <div className="border-t border-white/[0.08] p-4">

                <p className="flex items-center gap-2 text-xs font-medium text-zinc-400">

                  <Activity size={15} /> System status

                </p>

                <p className="mt-3 flex items-center gap-2 text-[11px] text-zinc-500">

                  <span

                    className={`h-1.5 w-1.5 rounded-full ${backendOnline ? "bg-emerald-400" : "bg-amber-400"

                      }`}

                  />

                  {backendOnline === null

                    ? "Checking backend..."

                    : backendOnline

                      ? "Flask API connected"

                      : "Backend offline"}

                </p>

                <p className="mt-2 flex items-center gap-2 text-[11px] text-zinc-500">

                  <ShieldCheck size={13} />

                  {repoReady ? "Repository indexed" : "No indexed repository"}

                </p>

                <p className="mt-2 flex items-center gap-2 text-[11px] text-zinc-500">

                  <Terminal size={13} />

                  {isIndexing

                    ? "Indexing in progress"

                    : isAsking

                      ? "Generating answer"

                      : "Ready"}

                </p>

              </div>

            </aside>

          )}

        </div>

      </section>

    </main>

  );

}
