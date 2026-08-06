import os
import asyncio
import random
import json
from copilot import CopilotClient, define_tool # Sourced via github-copilot-sdk

from copilot.tools import Tool, ToolInvocation, ToolResult
from copilot.session import PermissionHandler 
from langchain_core.tools import tool, BaseTool
import httpx
import uvicorn
from fastapi import FastAPI, Query, HTTPException
from fastapi.responses import HTMLResponse
from fastapi.middleware.cors import CORSMiddleware 

from typing import Annotated, Literal, TypedDict, Any, List, Optional
from langchain_core.language_models.chat_models import BaseChatModel
from langgraph.graph import StateGraph, START, END
from langgraph.graph.message import add_messages
from langgraph.checkpoint.memory import MemorySaver
from langchain_core.messages import AIMessage, HumanMessage, BaseMessage, ToolMessage
from langchain_core.outputs import ChatResult, ChatGeneration
from pydantic import Field, BaseModel
from langgraph.prebuilt import ToolNode




# Configuration from your GitHub OAuth App Registration
CLIENT_ID = "Ov23liXydNmtlhl31eFc"
CLIENT_SECRET = "8430b8cfa425baeb9fa9ea93cb425d6e6c385b3e"
REDIRECT_URI = "http://localhost:8000/callback"



# Global state to share the token across threads safely
auth_state = {"access_token": None}

# 1.  Define the Shared State
class State(TypedDict):
    messages: Annotated[list, add_messages]
    ticker: str
   

class ChatGithubCopilot(BaseChatModel):
    """An async-safe custom LangChain wrapper for the GitHub Copilot SDK."""
    
    model_name: str = Field(default="claude-3.5-sonnet", alias="model")
    bound_tools: List[Any] = Field(default_factory=list)
    
    @property
    def _llm_type(self) -> str:
        return "github-copilot-client"

    def bind_tools(
        self,
        tools: List[Any],
        **kwargs: Any,
    ) -> "ChatGithubCopilot":
        """Overrides parent method to bind tools using Pydantic V2."""
        return self.model_copy(update={"bound_tools": tools})

    async def _agenerate(
        self,
        messages: List[BaseMessage],
        stop: Optional[List[str]] = None,
        run_manager: Optional[Any] = None,
        **kwargs: Any,
    ) -> ChatResult:
        """Asynchronous execution path using native Copilot SDK definitions to fix tool visibility."""
      
        #print("\n\nKWARGS: ",kwargs.ticker)
        data = kwargs
        ticker = data['kwargs']['ticker']
        analytics = data['kwargs']['analytics']
        tools = data['kwargs']['tools']
        print("\n\nTicker: ",ticker)
        print("\n\nAnalytics: ",analytics)
        print("\n\nTools: ",tools)
        last_message = messages[-1].content
        
        
        print("\n\nLLM Intake Message Stack: ",messages)
        raw_langchain_tools = self.bound_tools + kwargs.get("tools", [])
        
        #kwargs_tools = json.loads(kwargs).tools
        #print("\n\nKWARGS TOOLS: ", kwargs_tools )
        processed_tools = []
        for t in raw_langchain_tools:
            if isinstance(t, BaseTool):
                # 1. Capture the underlying execution model or fallback to building a simple wrapper model
                # Copilot define_tool requires a Pydantic BaseModel class for parameters typing
                param_model = t.args_schema if t.args_schema else BaseModel
                
                #print("Param Model: ",param_model)
                
                # 2. Build the execution bridging function
                async def make_handler(tool_instance):
                    async def wrapper(params: Any) -> str:
                        # Extract data dictionary from incoming Pydantic parameter instance
                        args = getattr(params, "__dict__", params)
                        if not isinstance(args, dict):
                            args = dict(params)
                        
                        if hasattr(tool_instance, "coroutine") and tool_instance.coroutine is not None:
                            return await tool_instance.ainvoke(args)
                        return tool_instance.invoke(args)
                    return wrapper

                handler_func = await make_handler(t)

                # 3. CRITICAL FIX: Use the SDK's decorator directly to assemble a native tool object.
                # This automatically applies all attributes (defer, parameters, overrides, metadata)
                # exactly as the internal SDK client and JSON-RPC bridge require.
                decorator = define_tool(description=t.description or t.__doc__ or "")
                
                # Re-assign the function name dynamically so Copilot registers the correct tool identifier
                handler_func.__name__ = t.name
                
                # Expose parameter type hint so define_tool can parse it
                handler_func.__annotations__ = {"params": param_model}
                
                # Invoke the decorator on our handler to compile the native SDK Tool instance
                native_copilot_tool = decorator(handler_func)
                processed_tools.append(native_copilot_tool)
            else:
                processed_tools.append(t)
        
        print("\n\nProcessed Tools: ", processed_tools)
        get_charts = """Please return any analytical charts urls at the location
        '/home/rsypert/agent-in-the-loop/frontend/public/[ticker]' 
        folder in the .png format under. [ticker] being the ticker user input. 
        Only delete preexisting charts in the current ticker folder if they are out of date."""
        newMessage = ''
        if ticker and not analytics:
            last_message = f"The ticker is: {ticker} and here are chart instructions: {get_charts}"
        elif ticker and analytics:
            last_message = f"This ticker is: {ticker} and analytics I would like done are: {analytics}.  Provide any charts you want according to: {get_charts}."
        else:
            last_message = f"You should find the ticker here: {last_message} and here are chart instructions {get_charts}."
            
        print("Last Message to LLM: ", last_message)
        
        # 4. Open session stream using fully compiled native types
        async with CopilotClient() as client:
            async with await client.create_session(
                model=self.model_name,
                tools=processed_tools,  
                on_permission_request=PermissionHandler.approve_all
            ) as session:
                response = await session.send_and_wait(last_message)
                content = response.data.content
        print("\n\nLLM Response: ", response);
        message = AIMessage(content=content,tool_calls=tools)
        generation = ChatGeneration(message=message)
        return ChatResult(generations=[generation])
    
    
    def _generate(
        self,
        messages: List[BaseMessage],
        stop: Optional[List[str]] = None,
        run_manager: Optional[Any] = None,
        **kwargs: Any,
    ) -> ChatResult:
        """Mandatory synchronous implementation to satisfy the BaseChatModel abstract class."""
        try:
            loop = asyncio.get_running_loop()
        except RuntimeError:
            loop = None

        # If an event loop is already running (e.g. FastAPI/Uvicorn), delegate via threadsafe coroutine
        if loop and loop.is_running():
            future = asyncio.run_coroutine_threadsafe(
                self._agenerate(messages, stop, run_manager, **kwargs), loop
            )
            return future.result()
        
        # If no loop exists, safely start a fresh temporary loop
        return asyncio.run(self._agenerate(messages, stop, run_manager, **kwargs))


async def run_copilot_agent(token: str,state:State):
    """Step 4: Use the authenticated gho_ token inside the Copilot SDK."""
    print(f"\n🚀 Instantiating Copilot SDK with OAuth token: {token[:8]}...")
    
    # Initialize the client with the retrieved gho_ token string
    client = CopilotClient(github_token=token)
    
 
    try:
       # ... inside async function
        async with await client.create_session(
            model="claude-3.5-sonnet",
            tools=[fetch_market_data],
            on_permission_request=PermissionHandler.approve_all
        ) as session:
            response = await session.send_and_wait(state["messages"][-1].content)
            return(AIMessage(content=response.data.content,tool_calls=response.data.tool_requests))
            
    except Exception as e:
        print(f"❌ SDK Session Error: {e}")

async def monitor_auth_flow():
    """Poller that waits until the local webserver captures the OAuth token."""
    print("\n[OAuth Server] Waiting for user authentication at http://localhost:8000 ...")
    while auth_state["access_token"] is None:
        await asyncio.sleep(0.5)
        
    # Valid gho_ token is acquired; execute the SDK agent pipeline
    token = auth_state["access_token"]
    
    #await run_copilot_agent(token,{"messages": [HumanMessage(
    #    content="Analyze NVDA using the fetch_market_data tool.",tool_calls=[]
    #    )]})
        
    # Initialize your custom Copilot LLM wrapper
    llm = ChatGithubCopilot(model="claude-sonnet-4.5")

    # Bind tools using standard LangChain builder API
    llm_with_tools = llm.bind_tools([fetch_market_data])  
        
    # Invoke the wrapper pipeline
    ai_msg = await llm_with_tools.ainvoke([HumanMessage(content="Analyze NVDA using the fetch_market_data tool.")])
    #print(ai_msg.content)
        


# --------------------------------------------------------
# COMPLEX TOOL: Generates structured financial data points
# ---------------------------------------------------------

@tool
def fetch_market_data(ticker: str) -> dict:
    """Fetches historical price data points and metadata for a given stock ticker symbol."""
    
    # Simulating complex, nested database/API output   
    print("\n\nTicker Inside Tool:", ticker)
    ticker_clean = ticker.upper().strip()
    base_price = {"AAPL": 180, "TSLA": 170, "NVDA": 450, "MSFT": 380}.get(ticker_clean, 100)
    
    historical_points = []
    current_price = base_price
    for idx, day in enumerate(["Mon", "Tue", "Wed", "Thu", "Fri"]):
        change = random.uniform(-0.05, 0.06) * current_price
        current_price = round(current_price + change, 2)
        historical_points.append({"day": day, "price": current_price, "volume": random.randint(10000, 50000)})

    return {
        "status": "SUCCESS",
        "ticker": ticker_clean,
        "summary": {
            "current_value": historical_points[-1]["price"],
            "weekly_high": max(p["price"] for p in historical_points),
            "weekly_low": min(p["price"] for p in historical_points)
        },
        "chart_data": historical_points
    }
    
# Define your tools array and bind them to the LLM  
tool = {
    
}
tools = [fetch_market_data]
tool_node = ToolNode(tools)

# Initialize your custom Copilot LLM wrapper
llm = ChatGithubCopilot(model="claude-sonnet-4.5")

# Bind tools using standard LangChain builder API
llm_with_tools = llm.bind_tools(tools)
    

async def fetch_market_data_handler(invocation: ToolInvocation) -> ToolResult:
    ticker = invocation.arguments["ticker"]
    
    # ❌ AVOID: Returning raw dictionaries or unescaped strings directly
    # return {"data": "..."} 

    #  CORRECT: Explicitly define text_result_for_llm and set result_type="success"
    return ToolResult(
        text_result_for_llm=f"Stock data for {ticker}: $240.50",
        result_type="success", # Do not omit this field
        session_log=f"Executed fetch_market_data for {ticker}"
    )


# -----------------------------------------------------------
# Graph Logic & Routing
# -----------------------------------------------------------
async def call_model(state: State):
    print("--- [Agent] Thinking ... ---")
    token = auth_state["access_token"]
    #response = await run_copilot_agent(state["messages"])
    
    print("Intake in Call Model: ", state)     
     
    success = False
    status = state["messages"][-1].content        
    if any(char in status for char in ("{","}")):
        print("\n\nStatus in Dictionary Form: ",json.loads(status))
        if "success".casefold() in status.casefold():
            success = True
        
    else:
        print("\n\nStatus as String: ", status)
        
        
    # Invoke the wrapper pipeline
    content = state["messages"][-1].content
    kwargs = state["messages"][-1].additional_kwargs
    print("\n\n\nKwargs: ", kwargs)
  
    
    if len(kwargs) > 0:    
        ticker = kwargs["ticker"]
        analytics = kwargs["analytics"]     
    else:
        ticker=content
        analytics=""
    print("\n\nTicker in Call Model :", ticker)
    
    tool = {
        "name": "fetch_market_data",
        "args": {"ticker": content},  # Dynamically extract or default the parameter
        "id": f"call_{random.randint(1000, 9999)}"
    }
    if not success:
        response = await llm_with_tools.ainvoke([HumanMessage(content=state["messages"][-1].content, additional_kwargs={"ticker": ticker, "analytics": analytics,"tools":[tool]})],kwargs={"ticker": ticker, "analytics": analytics,"tools":[tool]})
        print("\n\n Call Model Response: ",response)    
        content_string = response.content
        return {"messages": [AIMessage(content=content_string, tool_calls=response.tool_calls)]}
    elif success:
        print("State Messages Stack: ", state)
        return {"messages": [AIMessage(content=state["messages"][-2].content, tool_calls=[])]}

async def route_after_agent(state: State) -> Literal["tools", "__end__"]:
    """Determines if the model wants to call a tool or finish the conversation."""
    last_message = state["messages"][-1]
    if hasattr(last_message, "tool_calls") and len(last_message.tool_calls) > 0:
        return "tools"
    return END

# Build the LangGraph state machine 
builder = StateGraph(State) 
builder.add_node("agent", call_model)
builder.add_node("tools", tool_node)

builder.add_edge(START, "agent")
builder.add_conditional_edges("agent", route_after_agent)
builder.add_edge("tools", "agent")  # After a tool runs, loop back to the agent to interpret results

# CRITICAL STEP: Add a breakpoint *before* the tools node executes any actions  
memory = MemorySaver()

graph = builder.compile(
    checkpointer=memory,
    interrupt_before=["tools"]
)



app = FastAPI()

# Define the origins that are allowed to make requests
origins = [
    "http://localhost:3000",
]

# Add the middleware to your app
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def login():
    """Step 1: Redirect user to GitHub to log in and authorize scopes."""
    # Ensure copilot permissions are requested in the scope array
    github_auth_url = (
        "https://github.com/login/oauth/authorize"
        f"?client_id={CLIENT_ID}"
        f"&redirect_uri={REDIRECT_URI}"
        f"&scope=read:user,copilot"
    )
    return HTMLResponse(f'Click here to authenticate: <a href="{github_auth_url}">Login with GitHub</a>')

@app.get("/callback")
async def callback(code: str = Query(...)):
    """Step 2 & 3: Handle the callback code and exchange it for a gho_ token."""
    token_url = "https://github.com/login/oauth/access_token"
    headers = {"Accept": "application/json"}
    payload = {
        "client_id": CLIENT_ID,
        "client_secret": CLIENT_SECRET,
        "code": code,
        "redirect_uri": REDIRECT_URI
    }
    #print("Payload: ",payload)
    async with httpx.AsyncClient() as client:
        response = await client.post(token_url, json=payload, headers=headers)
        data = response.json()
   
    #print("Data: ", data)     
    if "access_token" in data:
        auth_state["access_token"] = data["access_token"]
        return HTMLResponse("<h3>Authentication successful! You can close this tab and return to your terminal.</h3>")
    else:
        return HTMLResponse(f"<h3>Authentication failed: {data.get('error_description', 'Unknown error')}</h3>")


# --------------------------------------------------------
# 5. API Endpoints
# --------------------------------------------------------


class ChatRequest(BaseModel):
    thread_id: str
    ticker:str
    analytics: str

class ApprovalRequest(BaseModel):
    thread_id: str
    approve: bool


@app.post("/chat")
async def chat_with_agent(payload: ChatRequest):
    """Initializes or continues a conversation thread with the agent."""
    config = {"configurable": {"thread_id": payload.thread_id}}
    #print("config:", config)
    # Process the new message through the graph until it ends or hits an interrupt
    if payload.ticker and not payload.analytics:   
        events = graph.astream(
            {"messages": [HumanMessage(content=payload.ticker, additional_kwargs={"ticker":payload.ticker, "analytics":""})]}, 
            config, 
            stream_mode="values"
        )
    elif payload.ticker and payload.analytics:  
        events = graph.astream(
            {"messages": [HumanMessage(content=(payload.ticker+payload.analytics), additional_kwargs={"ticker":payload.ticker, "analytics":payload.analytics})]}, 
            config, 
            stream_mode="values"
        )
    else:
        print("Just sending Ticker to LLM!")
        events = graph.astream(
            {"messages": [HumanMessage(content=payload.ticker, additional_kwargs={"ticker":payload.ticker, "analytics":""})]}, 
            config, 
            stream_mode="values"
        )
    # Consume the generator stream to drive execution forward
    final_state = None
    async for event in events:
        final_state = event
    
    #print("Final Event: ", final_state) 
    # Check if the execution stopped due to a human checkpoint requirement
    state_snapshot = graph.get_state(config)
    
    #print("State Snapshot: ", state_snapshot )
    is_paused = len(state_snapshot.next) > 0
    
    #print("Is Paused: ",is_paused)
    
    pending_tool_call = None
    if is_paused:
        # Extract details of the tool call the agent is trying to perform
        last_msg = final_state["messages"][-1]
        if hasattr(last_msg, "tool_calls") and last_msg.tool_calls:
            pending_tool_call = last_msg.tool_calls[0]

    return {
        "status": "paused" if is_paused else "completed",
        "next_step": list(state_snapshot.next),
        "last_agent_response": final_state["messages"][-1].content if final_state else "",
        "pending_tool_call": pending_tool_call
    }

@app.post("/approve")
async def handle_approval(payload: ApprovalRequest):
    """Processes a human manager's decision to allow or block a tool execution."""
    config = {"configurable": {"thread_id": payload.thread_id}}
    state_snapshot = graph.get_state(config)
    
    if not state_snapshot.next:
        raise HTTPException(status_code=400, detail="This thread is not currently paused for approval.")

    if payload.approve:
        # RESUME: Passing None routes the existing state into the paused node ("tools")
        events = graph.astream(None, config, stream_mode="values")
    else:
        # REJECT: We manually overwrite the state by appending a cancellation tool response.
        # This keeps the graph safe without crashing, telling the model the action was blocked.
        last_msg = state_snapshot.values["messages"][-1]
        tool_call_id = last_msg.tool_calls[0]["id"]
        tool_name = last_msg.tool_calls[0]["name"]
        
        rejection_message = ToolMessage(
            content=f"Error: The human manager rejected the execution of {tool_name}.",
            tool_call_id=tool_call_id
        )
        
        # Inject the rejection message into the history, bypassing the tool execution node entirely
        await graph.update_state(config, {"messages": [rejection_message]}, as_node="tools")
        
        # Resume the graph from the agent node so it can apologize or suggest alternatives to the user
        events = graph.astream(None, config, stream_mode="values")

    # Run the remaining stream to capture the post-approval/post-rejection agent behavior
    final_state = None
    index = 1
    async for event in events:
        print(f"\nEvent ${event}", event)
        final_state = event

    return {
        "status": "completed",
        "final_agent_response": final_state["messages"][-1].content if final_state else ""
    }




async def main():
    # Configure and start the local FastAPI web service in the background
    config = uvicorn.Config(app, host="127.0.0.1", port=8000, log_level="warning")
    server = uvicorn.Server(config)
 

if __name__ == "__main__":
    import uvicorn 
    uvicorn.run(app, host="0.0.0.0", port=8000)