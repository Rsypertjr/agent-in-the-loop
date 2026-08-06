"use client";

import React, { useState, useEffect } from "react";
import Image from 'next/image';
import fs from 'fs/promises';
import path from 'path';
import { Send, CheckCircle2, XCircle, AlertTriangle, Bot, User, Loader2, LineChart as ChartIcon, DatabaseSearch, MarsStroke } from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import ChartDisplay from "./components/ChartDisplay";
import Slideshow from "./components/SlideShow";
import { json } from "stream/consumers";
import { LlmResponse } from "./components/LlmResponse";

interface Message {
  id: string;
  sender: "user" | "agent";
  text: string;
}

export default function AdvancedAgentInterface() {
  const [threadId, setThreadId] = useState<string>("");
  const [chartFiles, setChartFiles] = useState([]);
  const [messages, setMessages] = useState<Message[]>([
    { id: "1", sender: "agent", text: "Welcome to Capital Insights Engine. Ask me to fetch and audit market data analytics pipelines for any major ticker symbol." }
  ]);
  const [lastMessage, setLastMessage] = useState<Message>({ id: "", sender: "user", text: "" });
  const [tickerInput, setTickerInput] = useState("");
  const [analysisType, setAnalysisType] = useState("");
  const [ticker, setTicker] = useState("");
  const [loading, setLoading] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [pendingTool, setPendingTool] = useState<any>(null);
  
  // Custom Complex Render Output Data Target Storage state
  const [activeChartData, setActiveChartData] = useState<any[] | null>(null);

  const BACKEND_URL = "http://127.0.0.1:8000";

  useEffect(() => {
    setThreadId(`session_${Math.random().toString(36).substring(7)}`);

    setChartFiles([]);
    }, []);

  useEffect(() => {  
    console.log("Message was added!")
    const getfiles = async () => {
       let last_message = messages[messages.length-1].text;
       if (messages.length > 1 && typeof last_message != undefined &&
                last_message?.toLowerCase().includes("charts") &&
                last_message?.toLowerCase().includes(ticker.toLowerCase())
              )
          {
            await fetch(`api/charts?ticker=${ticker.toUpperCase()}`)
              .then((res) => res.json())
              .then((data) => {
                console.log(messages[messages.length-1].text);     
              
                  console.log(data.files);
                  setChartFiles(data.files);
                
              }); 
          }
       else 
          setChartFiles([]); 
      };

      try {
          getfiles();
      }catch(error){
          console.error("An error happened:", error.message);
      }
    }, [messages]);


  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tickerInput.trim() || loading || isPaused) return;

    const userText = analysisType ? `${tickerInput.toUpperCase()} - ${analysisType}` : tickerInput.toUpperCase();
   
    setTicker(tickerInput);
    setLoading(true);
    setMessages((prev) => [...prev, { id: threadId, sender: "user", text: userText }]);

    try {
      const response = await fetch(`${BACKEND_URL}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ thread_id: threadId, ticker:tickerInput, analytics: analysisType }),
      });
       
      const data = await response.json();
      setTickerInput("");
      setAnalysisType("");

      if (data.status === "paused") {
        setIsPaused(true);
        setPendingTool(data.pending_tool_call);
      }
      const last_message: Message = { id: threadId, sender: "agent", text: data.last_agent_response };
      setLastMessage(last_message)
      //if (data.last_agent_response && data.pending_tool_call.length === 0) {      
        //setMessages((prev) => [...prev, last_message]);     
      if (data.last_agent_response) {      
         setMessages((prev) => [...prev, data.last_agent_response]);         
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
      if (data.complex_chart_data_urls) {
        setActiveChartData(data.complex_chart_data_urls);
      }

      if (data.final_agent_response) {
        //setMessages((prev) => [...prev, lastMessage]);
        setMessages((prev) => [...prev, { id: threadId, sender: "agent", text: data.final_agent_response }]);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
    
      <div className="flex flex-col bg-slate-900 text-slate-100" style={{height:"1000px",width:"1300px"}}>
        <header className="flex items-center justify-between border-b border-slate-800 bg-slate-950 px-6 py-4">
          <h1 className="text-lg font-semibold tracking-tight text-indigo-400">Agent Analytical Intelligence Studio</h1>
          <div className="text-xs font-mono text-slate-500">Thread ID: {threadId}</div>
        </header>

        {/* Two Column Layout: Left handles chat stream, Right renders dynamically compiled interactive analytical data output views */}
        <div className="flex flex-1 overflow-hidden">
          {/* CHAT INTERFACE CHANNEL FEED */}
          <div className="w-1/2 flex flex-col border-r border-slate-800 bg-slate-900/50">
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {messages.map((msg,index) => (
                <div key={index} className={`flex gap-4 ${msg.sender === "user" ? "justify-end" : "justify-start"}`}>
                  {msg.sender === "agent" && (
                    <div className={`flex h-8 w-8 items-center justify-center rounded bg-indigo-600`}><Bot size={16} /></div>
                  )}
                  { msg.text &&
                    <div className={`max-w-[80%] rounded-lg px-4 py-2.5 text-sm ${msg.sender === "user" ? "bg-indigo-600" : "bg-slate-800 border border-slate-700"}`}>
                    { msg.sender === "user" &&  typeof msg.text === "object" && JSON.stringify(msg.text)} 
                    { msg.sender === "user" &&  typeof msg.text != "object" && msg.text} 
                    { msg.sender != "user" && 
                      <LlmResponse content={msg.text} />
                    } 
                  </div> 
                  }               
                </div>
              ))}
              {/* Global Loading Spinner for active asynchronous processing requests */}
              {loading && !isPaused && (
                <div className="flex gap-3 items-center text-xs text-slate-400 italic">
                  <Loader2 className="animate-spin text-indigo-400" size={14} />
                  Agent processing state steps...
                </div>
              )}
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
              <form onSubmit={handleSendMessage} className="flex flex-col gap-2">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={tickerInput}
                    onChange={(e) => setTickerInput(e.target.value)}
                    disabled={loading || isPaused}
                    placeholder="Ticker (e.g. NVDA, AAPL)"
                    className="w-36 rounded bg-slate-900 border border-slate-800 px-4 py-2 text-sm focus:outline-none focus:border-indigo-500"
                  />
                  <select
                    value={analysisType}
                    onChange={(e) => setAnalysisType(e.target.value)}
                    disabled={loading || isPaused}
                    className="flex-1 rounded bg-slate-900 border border-slate-800 px-3 py-2 text-sm text-slate-300 focus:outline-none focus:border-indigo-500"
                  >
                    <option value="">Select analysis type (optional)</option>
                    <option value="Technical Analysis">Technical Analysis</option>
                    <option value="Fundamental Analysis">Fundamental Analysis</option>
                    <option value="Price Trend Analysis">Price Trend Analysis</option>
                    <option value="Volume Analysis">Volume Analysis</option>
                    <option value="Moving Average Analysis">Moving Average Analysis</option>
                    <option value="Momentum & RSI Analysis">Momentum &amp; RSI Analysis</option>
                    <option value="Earnings Analysis">Earnings Analysis</option>
                    <option value="Volatility Analysis">Volatility Analysis</option>
                  </select>
                  <button type="submit" disabled={loading || isPaused} className="bg-indigo-600 p-2 rounded hover:bg-indigo-500 disabled:opacity-50"><Send size={16} /></button>
                </div>
              </form>
            </footer>
          </div>

          {/* COMPLEX DATA VIEW LAYER SCREEN PANEL */}
          <div className="w-1/2 bg-slate-950 pt-8 pl-8 justify-center items-center">
              {chartFiles.length > 0 &&
                <div className="p-2 max-w-xl bg-white rounded-2xl shadow-md overflow-x-auto scrollbar-h-2 scrollbar-thumb-sky-700 scrollbar-track-sky-300">
                  <Slideshow initialFiles={chartFiles} ticker={ticker}/>
                </div>
              } 
              {chartFiles.length === 0 &&
                <div className="text-center space-y-2 text-slate-600 max-w-sm">
                  <ChartIcon size={48} className="mx-auto text-slate-800 stroke-[1]" />
                  <p className="text-sm font-medium text-slate-500">No telemetry data loaded.</p>
                  <p className="text-xs">Ask the agent to analyze a stock ticker (e.g. "NVDA") and approve the data audit to render real-time interactive chart tracking modules.</p>
                </div>
              }
          </div> 
      </div> 
    </div>
    
  </>
    
  );
}
