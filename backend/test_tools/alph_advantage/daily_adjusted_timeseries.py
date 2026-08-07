import os
from alpha_vantage.timeseries import TimeSeries

# 1. Initialize your free token (Replace with your actual key string)
API_KEY = os.getenv("ALPHA_VANTAGE_KEY", "652YEM8GFKRTSOR0")

# 2. Instantiate TimeSeries with pandas output format configuration
ts = TimeSeries(key=API_KEY, output_format='pandas')

try:
    # 3. Pull daily historical metrics for your target ticker symbol
    ticker = 'AAPL'
    data, meta_data = ts.get_daily_adjusted(symbol=ticker, outputsize='compact')
    
    # 4. View your formatted structural DataFrame
    print(f"--- Top 5 Data Rows for {ticker} ---")
    print(data.head())

except Exception as e:
    print(f"Error fetching data: {e}")
