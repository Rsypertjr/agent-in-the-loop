from alpha_vantage.timeseries import TimeSeries
import pandas as pd
import json
import requests

# Initialize with your free API key
ts = TimeSeries(key='652YEM8GFKRTSOR0', output_format='pandas')

# Get daily stock data for Apple (AAPL) 
data, meta_data = ts.get_daily(symbol='AAPL', outputsize='compact')

# Print the latest rows 
print(data.head())
print(meta_data.keys())
print(meta_data['1. Information'])
print("First Key of Meta Data:",list(meta_data.keys())[0])

meta_data_str = json.dumps(meta_data)
meta_data_json = json.loads(meta_data_str)
print(meta_data_json)
json_data_str = data.to_json(orient='records')
#print(data)
json_data = json.loads(json_data_str)
#print(json_data[0])

"""
url = 'https://alphavantage.co'
r = requests.get(url)
data = r.json()

#print(data['Time Series (Daily)'])
"""