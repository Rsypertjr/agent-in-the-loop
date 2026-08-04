"use client";

import React, { useState, useEffect } from "react";
import { Send, CheckCircle2, XCircle, AlertTriangle, Bot, User, Loader2, LineChart as ChartIcon } from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

interface Message {
  id: string;
  sender: "user" | "agent";
  text: string;
}

export default function AdvancedAgentInterface() {
  const [threadId, setThreadId] = useState<string>("");
  const [messages, setMessages] = useState<Message[]>([
    { id: "1", sender: "agent", text: "Welcome to Capital Insights Engine. Ask me to fetch and audit market data analytics pipelines for any major ticker symbol." }
  ]);
  const [lastMessage, setLastMessage] = useState<Message>({ id: "", sender: "user", text: "" });
  const [input, setInput] = useState("Analyze NVDA stock metrics");
  const [loading, setLoading] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [pendingTool, setPendingTool] = useState<any>(null);
  
  // Custom Complex Render Output Data Target Storage state
  const [activeChartData, setActiveChartData] = useState<any[] | null>(null);

  const BACKEND_URL = "http://127.0.0.1:8000";

  useEffect(() => {
    setThreadId(`session_${Math.random().toString(36).substring(7)}`);
  }, []);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading || isPaused) return;

    const userText = input;
    setInput("");
    setLoading(true);
    setMessages((prev) => [...prev, { id: Date.now().toString(), sender: "user", text: userText }]);

    try {
      const response = await fetch(`${BACKEND_URL}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ thread_id: threadId, message: userText }),
      });

      const data = await response.json();

      if (data.status === "paused") {
        setIsPaused(true);
        setPendingTool(data.pending_tool_call);
      }
      const last_message: Message = { id: (Date.now()+1).toString(), sender: "agent", text: data.last_agent_response };
      setLastMessage(last_message)
      if (data.last_agent_response && data.pending_tool_call.length === 0) {      
        setMessages((prev) => [...prev, last_message]);        
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleApprovalDecision = async (approve: boolean) => {
    setLoading(true);
    approve ? setIsPaused(false) : setIsPaused(true);
    setPendingTool(null);

    try {
      const response = await fetch(`${BACKEND_URL}/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ thread_id: threadId, approve: approve }),
      });

      const data = await response.json();

      // Catch complex non-text data structures generated during the execution pass loop
      if (data.complex_chart_data) {
        setActiveChartData(data.complex_chart_data);
      }

      if (data.final_agent_response) {
        setMessages((prev) => [...prev, lastMessage]);
        //setMessages((prev) => [...prev, { id: Date.now().toString(), sender: "agent", text: data.final_agent_response }]);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
    
      <div className="flex flex-col h-screen bg-slate-900 text-slate-100">
        <header className="flex items-center justify-between border-b border-slate-800 bg-slate-950 px-6 py-4">
          <h1 className="text-lg font-semibold tracking-tight text-indigo-400">Agent Analytical Intelligence Studio</h1>
          <div className="text-xs font-mono text-slate-500">Thread ID: {threadId}</div>
        </header>

        {/* Two Column Layout: Left handles chat stream, Right renders dynamically compiled interactive analytical data output views */}
        <div className="flex flex-1 overflow-hidden">
          {/* CHAT INTERFACE CHANNEL FEED */}
          <div className="w-1/2 flex flex-col border-r border-slate-800 bg-slate-900/50">
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {messages.map((msg) => (
                <div key={msg.id} className={`flex gap-4 ${msg.sender === "user" ? "justify-end" : "justify-start"}`}>
                  {msg.sender === "agent" && (
                    <div className={`flex h-8 w-8 items-center justify-center rounded bg-indigo-600`}><Bot size={16} /></div>
                  )}
                  <div className={`max-w-[80%] rounded-lg px-4 py-2.5 text-sm ${msg.sender === "user" ? "bg-indigo-600" : "bg-slate-800 border border-slate-700"}`}>
                  { msg.sender === "user" &&  typeof msg.text === "object" && JSON.stringify(msg.text)} 
                  { msg.sender === "user" &&  typeof msg.text != "object" && msg.text} 
                  { msg.sender != "user" && msg.text} 
                  </div>                 
                </div>
              ))}

              {isPaused && pendingTool && (
                <div className="rounded-lg border border-amber-500/40 bg-amber-950/20 p-4 space-y-3">
                  <div className="flex items-center gap-2 text-amber-400 text-sm font-semibold">
                    <AlertTriangle size={16} /> Data Fetch Pipeline Intercepted
                  </div>
                  <p className="text-xs text-slate-400">Agent is requesting payload review data extraction approval before pipeline serialization mapping execution:</p>
                  <div className="bg-slate-950 text-[11px] p-2 rounded font-mono border border-slate-800 text-emerald-400">
                    Tool: {pendingTool.name}<br />Args: {JSON.stringify(pendingTool.args)}
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => handleApprovalDecision(true)} className="flex items-center gap-1.5 rounded bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-500"><CheckCircle2 size={13}/> Approve</button>
                    <button onClick={() => handleApprovalDecision(false)} className="flex items-center gap-1.5 rounded bg-rose-600/20 border border-rose-500/40 px-3 py-1.5 text-xs text-rose-400 hover:bg-rose-600/30"><XCircle size={13}/> Reject</button>
                  </div>
                </div>
              )}
            </div>

            <footer className="p-4 border-t border-slate-800 bg-slate-950">
              <form onSubmit={handleSendMessage} className="flex gap-2">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  disabled={loading || isPaused}
                  placeholder="Analyze stock ticker NVDA..."
                  className="flex-1 rounded bg-slate-900 border border-slate-800 px-4 py-2 text-sm focus:outline-none focus:border-indigo-500"
                />
                <button type="submit" className="bg-indigo-600 p-2 rounded hover:bg-indigo-500"><Send size={16} /></button>
              </form>
            </footer>
          </div>

          {/* COMPLEX DATA VIEW LAYER SCREEN PANEL */}
       <div className="w-1/2 bg-slate-950 p-6 flex flex-col justify-center items-center">
              {activeChartData ? (
                <div className="w-full h-full flex flex-col space-y-4 animate-in fade-in duration-500">
                  <div className="flex items-center gap-2 text-sm font-semibold text-slate-400 border-b border-slate-800 pb-2">
                    <ChartIcon size={16} className="text-indigo-400" /> Dynamic Telemetry Visualization Framework Layer
                  </div>
                  <div className="w-full h-[320px] bg-slate-900/40 p-4 rounded-xl border border-slate-800">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={activeChartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                        <defs>
                          <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#6366f1" stopOpacity={0.4}/>
                            <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                        <XAxis dataKey="day" stroke="#64748b" fontSize={12} />
                        <YAxis stroke="#64748b" fontSize={12} domain={['auto', 'auto']} />
                        <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', color: '#f8fafc' }} />
                        <Area type="monotone" dataKey="price" stroke="#6366f1" strokeWidth={2} fillOpacity={1} fill="url(#colorPrice)" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="text-xs text-slate-500 font-mono text-center">Interactive chart populated securely from human-audited internal data packet streams.</div>
                </div>
              ) : (
                <div className="text-center space-y-2 text-slate-600 max-w-sm">
                  <ChartIcon size={48} className="mx-auto text-slate-800 stroke-[1]" />
                  <p className="text-sm font-medium text-slate-500">No telemetry data loaded.</p>
                  <p className="text-xs">Ask the agent to analyze a stock ticker (e.g. "NVDA") and approve the data audit to render real-time interactive chart tracking modules.</p>
                </div>
              )}
            </div> 
        </div> 
      </div>
      
    </>
    
  );
}
