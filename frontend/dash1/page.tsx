"use client";

import React, { useState } from "react";
import { Send, CheckCircle2, XCircle, AlertTriangle, Bot, User, Loader2 } from "lucide-react";

interface Message {
  id: string;
  sender: "user" | "agent";
  text: string;
}

interface PendingTool {
  name: string;
  args: {
    amount?: number;
    order_id?: string;
    [key: string]: any;
  };
  id: string;
}

export default function AgentInterface() {
  const [threadId] = useState<string>(() => `session_${Math.random().toString(36).substring(7)}`);
  const [messages, setMessages] = useState<Message[]>([
    { id: "1", sender: "agent", text: "Hello! I am your AI assistant. How can I help you manage your customer records or orders today?" }
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  
  // Human-in-the-loop pending transaction states
  const [isPaused, setIsPaused] = useState(false);
  const [pendingTool, setPendingTool] = useState<PendingTool | null>(null);

  const BACKEND_URL = "http://127.0.0.1:8000";

  // 1. Send User Message to Backend
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading || isPaused) return;

    const userText = input;
    setInput("");
    setLoading(true);

    // Optimistically add user message to layout chat view
    const userMsgId = Date.now().toString();
    setMessages((prev) => [...prev, { id: userMsgId, sender: "user", text: userText }]);

    try {
      const response = await fetch(`${BACKEND_URL}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ thread_id: threadId, message: userText }),
      });

      if (!response.ok) throw new Error("Network connection error");
      const data = await response.json();

      // Check if execution has been halted by a LangGraph breakpoint
      if (data.status === "paused") {
        setIsPaused(true);
        setPendingTool(data.pending_tool_call?.[0] || data.pending_tool_call || null);
      }

      if (data.last_agent_response) {
        setMessages((prev) => [
          ...prev,
          { id: (Date.now() + 1).toString(), sender: "agent", text: data.last_agent_response }
        ]);
      }
    } catch (error) {
      setMessages((prev) => [
        ...prev,
        { id: Date.now().toString(), sender: "agent", text: "Error: Failed to connect to the agent service server." }
      ]);
    } finally {
      setLoading(false);
    }
  };

  // 2. Submit Human Approval / Rejection Decision
  const handleApprovalDecision = async (approve: boolean) => {
    setLoading(true);
    setIsPaused(false);
    setPendingTool(null);

    try {
      const response = await fetch(`${BACKEND_URL}/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ thread_id: threadId, approve }),
      });

      if (!response.ok) throw new Error("Network connection error");
      const data = await response.json();

      if (data.final_agent_response) {
        setMessages((prev) => [
          ...prev,
          { id: Date.now().toString(), sender: "agent", text: data.final_agent_response }
        ]);
      }
    } catch (error) {
      setMessages((prev) => [
        ...prev,
        { id: Date.now().toString(), sender: "agent", text: "Error processing judgment step sequence." }
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-slate-900 text-slate-100 font-sans">
      {/* Top Header Navigation bar */}
      <header className="flex items-center justify-between border-b border-slate-800 bg-slate-950 px-6 py-4 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="h-3 w-3 animate-pulse rounded-full bg-emerald-500" />
          <h1 className="text-lg font-semibold tracking-tight">Agent-in-the-Loop Hub</h1>
        </div>
        <div className="rounded-md bg-slate-800 px-3 py-1.5 text-xs text-slate-400 font-mono">
          Thread ID: {threadId}
        </div>
      </header>

      {/* Main Chat Feed Area Container Layout */}
      <main className="flex-1 overflow-y-auto px-4 py-6 md:px-8 space-y-6 max-w-4xl mx-auto w-full">
        {messages.map((msg) => (
          <div key={msg.id} className={`flex gap-4 ${msg.sender === "user" ? "justify-end" : "justify-start"}`}>
            {msg.sender === "agent" && (
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-indigo-600 text-white shadow-md">
                <Bot size={18} />
              </div>
            )}
            <div className={`max-w-[75%] rounded-xl px-4 py-3 text-sm shadow-sm leading-relaxed ${
              msg.sender === "user" 
                ? "bg-indigo-600 text-white rounded-tr-none" 
                : "bg-slate-800 text-slate-100 border border-slate-700 rounded-tl-none"
            }`}>
              {msg.text || <span className="italic text-slate-400">Agent executing background workflow process...</span>}
            </div>
            {msg.sender === "user" && (
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-700 text-white">
                <User size={18} />
              </div>
            )}
          </div>
        ))}

        {/* Global Loading Spinner for active asynchronous processing requests */}
        {loading && !isPaused && (
          <div className="flex gap-3 items-center text-xs text-slate-400 italic">
            <Loader2 className="animate-spin text-indigo-400" size={14} />
            Agent processing state steps...
          </div>
        )}

        {/* INTERRUPT BREAKPOINT INTERFACE PANEL MODAL LAYOUT */}
        {isPaused && pendingTool && (
          <div className="animate-in fade-in slide-in-from-bottom-2 duration-300 rounded-xl border border-amber-500/30 bg-amber-950/20 p-5 mt-4 shadow-xl backdrop-blur-sm max-w-2xl mx-auto">
            <div className="flex items-start gap-4">
              <div className="rounded-lg bg-amber-500/20 p-2 text-amber-400">
                <AlertTriangle size={24} />
              </div>
              <div className="flex-1 space-y-3">
                <div>
                  <h3 className="text-sm font-semibold text-amber-400 tracking-wide uppercase">
                    Security Boundary Checkpoint Intercepted
                  </h3>
                  <p className="text-xs text-slate-400 mt-1">
                    The autonomous agent is requesting manual management authorization validation before running a protected operational call:
                  </p>
                </div>

                {/* Inspectable arguments layout */}
                <div className="rounded-lg bg-slate-950 p-4 border border-slate-800 font-mono text-xs text-slate-300 space-y-1.5 shadow-inner">
                  <div><span className="text-indigo-400 font-semibold">Protected Tool:</span> {pendingTool.name}</div>
                  <div>
                    <span className="text-indigo-400 font-semibold">Payload Parameters:</span>
                    <pre className="text-emerald-400 mt-1 text-[11px] overflow-x-auto p-1 bg-slate-900/50 rounded">
                      {JSON.stringify(pendingTool.args, null, 2)}
                    </pre>
                  </div>
                </div>

                {/* Direct Action Processing Buttons Layout */}
                <div className="flex items-center gap-3 pt-2">
                  <button
                    onClick={() => handleApprovalDecision(true)}
                    className="flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-xs font-medium text-white shadow hover:bg-emerald-500 transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <CheckCircle2 size={15} />
                    Approve Execution
                  </button>
                  <button
                    onClick={() => handleApprovalDecision(false)}
                    className="flex items-center gap-2 rounded-lg bg-rose-600/20 border border-rose-500/30 px-4 py-2 text-xs font-medium text-rose-400 hover:bg-rose-600/30 transition-colors focus:outline-none focus:ring-2 focus:ring-rose-500"
                  >
                    <XCircle size={15} />
                    Reject Action
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Persistent Bottom Chat Controls Input Interface Footer Layout */}
      <footer className="border-t border-slate-800 bg-slate-950 p-4 shadow-md">
        <form onSubmit={handleSendMessage} className="max-w-4xl mx-auto flex items-center gap-3">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={loading || isPaused}
            placeholder={isPaused ? "Provide a decision above to unlock conversation input..." : "Request a refund, update customer accounts..."}
            className="flex-1 rounded-xl border border-slate-800 bg-slate-900 px-4 py-3 text-sm text-slate-100 placeholder-slate-500 shadow-inner focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          />
          <button
            type="submit"
            disabled={!input.trim() || loading || isPaused}
            className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-md hover:bg-indigo-500 transition-colors disabled:bg-slate-800 disabled:text-slate-600 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <Send size={16} />
          </button>
        </form>
      </footer>
    </div>
  );
}
