import os
import asyncio
import random
from copilot import CopilotClient # Sourced via github-copilot-sdk

from copilot.tools import Tool, ToolInvocation, ToolResult
from langchain_core.tools import tool
import httpx
import uvicorn
from fastapi import FastAPI, Query
from fastapi.responses import HTMLResponse



# Configuration from your GitHub OAuth App Registration
CLIENT_ID = "Ov23liXydNmtlhl31eFc"
CLIENT_SECRET = "8430b8cfa425baeb9fa9ea93cb425d6e6c385b3e"
REDIRECT_URI = "http://localhost:8000/callback"



# Global state to share the token across threads safely
auth_state = {"access_token": None}

app = FastAPI()


@app.get("/")
def login():
    """Step 1: Redirect user to GitHub to log in and authorize scopes."""
    # Ensure copilot permissions are requested in the scope array
    github_auth_url = (
        f"https://github.com"
        f"?client_id={CLIENT_ID}"
        f"&redirect_uri={REDIRECT_URI}"
        f"&scope=read:user,copilot"
    )
    return HTMLResponse(f'Click here to authenticate: <a href="{github_auth_url}">Login with GitHub</a>')

@app.get("/callback")
async def callback(code: str = Query(...)):
    """Step 2 & 3: Handle the callback code and exchange it for a gho_ token."""
    token_url = "https://github.com"
    headers = {"Accept": "application/json"}
    payload = {
        "client_id": CLIENT_ID,
        "client_secret": CLIENT_SECRET,
        "code": code,
        "redirect_uri": REDIRECT_URI
    }
    
    async with httpx.AsyncClient() as client:
        response = await client.post(token_url, json=payload, headers=headers)
        data = response.json()
        
    if "access_token" in data:
        auth_state["access_token"] = data["access_token"]
        return HTMLResponse("<h3>Authentication successful! You can close this tab and return to your terminal.</h3>")
    else:
        return HTMLResponse(f"<h3>Authentication failed: {data.get('error_description', 'Unknown error')}</h3>")


# COMPLEX TOOL: Generates structured financial data points
@tool
def fetch_market_data(ticker: str) -> dict:
    """Fetches historical price data points and metadata for a given stock ticker symbol."""
    # Simulating complex, nested database/API output
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


async def main():
    # Initialize the client using your authenticated key
    api_key = os.getenv("COPILOT_API_KEY")
    client = CopilotClient(github_token=api_key)

    # 1. Define your tool using the exact expected dictionary configuration
    # Do NOT pass this list through json.dumps() later!


    # 2. Build the keyword arguments unpacking payload correctly
    # Note: `create_session` expects dictionary unpacking (**kwargs), not an index-based positional argument
    session_config = {
        "model": "claude-sonnet-4.5", # Or your preferred supported engine like gpt-4o
        "tools":[
            Tool(
                name="fetch_market_data",
                description="Fetches historical price data points for a given stock ticker.",
                parameters={
                    "type": "object",
                    "properties": {
                        "ticker": {"type": "string", "description": "The stock ticker symbol"}
                    },
                    "required": ["ticker"],
                },
                handler=fetch_market_data_handler, # Required for auto-invocation
            )
        ],
    }

    try:
        # Create an active agent session
        session = await client.create_session(**session_config)
        print("Successfully initiated Copilot session with execution tools attached.")

        # 3. Dispatch your prompt payload to wait for tool invocation hooks
        response = await session.send_and_wait("Analyze NVDA stock metrics using the fetch_market_data tool.")
        
        print("Copilot Response:", response)

    except Exception as e:
        print(f"Error calling Copilot AI: {e}")

if __name__ == "__main__":
    asyncio.run(main())
