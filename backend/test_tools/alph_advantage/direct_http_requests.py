import requests
import pandas as pd

url = 'https://www.alphavantage.co/query'
params = {
    'function': 'TIME_SERIES_DAILY',
    'symbol': 'MSFT',
    'apikey':  '652YEM8GFKRTSOR0'
}

response = requests.get(url, params=params).json()
df = pd.DataFrame.from_dict(response['Time Series (Daily)'], orient='index')
print(df.head())
