from massive import RESTClient
import pandas as pd
import json

client = RESTClient(api_key="yrZ3RBoikVqP2RhoDmavrW6D4L1XKFdX")

ticker = "AAPL"

# List Aggregates (Bars)
aggs = []
for a in client.list_aggs(ticker=ticker, multiplier=1, timespan="minute", from_="2026-01-01", to="2026-06-13", limit=50000):
    aggs.append(a)

#print(aggs)

# Sample DataFrame 
df = pd.DataFrame(aggs)
print("DataFrame: ", df.head())
head = df.head()

# Print Dates
print("Print Timestamps: ", df['timestamp'])

# Convert directly to YYYY-MM-DD date objects
df['date-only'] = pd.to_datetime(df['timestamp'], unit='ms').dt.date

# Drop and Modify In-Place
clean_df = df.drop(columns=['timestamp']) 
print("Clean DF: ", clean_df)

df.drop(columns=['timestamp'], inplace=True)
print("DataFrame converted to Dates; ",df.head())

# Select the first row, first column (0, 0)
print("Integer-based location first row, first column (0, 0) :",head.iloc[0, 0])

# Select the 7th row
print("Integer-based location, 7th Row: ", clean_df.iloc[4])

# Convert to JSON string
json_string = df.head().to_json(orient="records", date_format='iso')
print(json.loads(json_string))

"""

# Get Last Trade
trade = client.get_last_trade(ticker=ticker)
print(trade)
    
"""
"""
# List Trades
trades = client.list_trades(ticker=ticker, timestamp="2026-01-04")
for trade in trades:
    print(trade)


# Get Last Quote
quote = client.get_last_quote(ticker=ticker)
print(quote)


# List Quotes
quotes = client.list_quotes(ticker=ticker, timestamp="2026-01-04")
for quote in quotes:
    print(quote)
"""