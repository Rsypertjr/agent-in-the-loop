import yfinance as yf
import matplotlib.pyplot as plt
import pandas as pd
import numpy as np
from datetime import datetime, timedelta
import os

def generate_charts(ticker, output_dir):
    """Generate analytical charts for a given ticker"""
    
    # Create output directory if it doesn't exist
    os.makedirs(output_dir, exist_ok=True)
    
    # Fetch data
    stock = yf.Ticker(ticker.upper())
    df = stock.history(period="1y")
    
    if df.empty:
        print(f"No data found for ticker {ticker}")
        return
    
    # Set style
    plt.style.use('seaborn-v0_8-darkgrid')
    
    # 1. Price History Chart
    fig, ax = plt.subplots(figsize=(12, 6))
    ax.plot(df.index, df['Close'], linewidth=2, color='#1f77b4')
    ax.fill_between(df.index, df['Close'], alpha=0.3, color='#1f77b4')
    ax.set_title(f'{ticker.upper()} - Price History (1 Year)', fontsize=16, fontweight='bold')
    ax.set_xlabel('Date', fontsize=12)
    ax.set_ylabel('Price ($)', fontsize=12)
    ax.grid(True, alpha=0.3)
    plt.tight_layout()
    plt.savefig(f'{output_dir}/price_history.png', dpi=150, bbox_inches='tight')
    plt.close()
    print(f"✓ Generated: price_history.png")
    
    # 2. Price with Moving Averages
    df['MA20'] = df['Close'].rolling(window=20).mean()
    df['MA50'] = df['Close'].rolling(window=50).mean()
    df['MA200'] = df['Close'].rolling(window=200).mean()
    
    fig, ax = plt.subplots(figsize=(12, 6))
    ax.plot(df.index, df['Close'], label='Close Price', linewidth=2, color='#1f77b4')
    ax.plot(df.index, df['MA20'], label='20-Day MA', linewidth=1.5, color='#ff7f0e', linestyle='--')
    ax.plot(df.index, df['MA50'], label='50-Day MA', linewidth=1.5, color='#2ca02c', linestyle='--')
    ax.plot(df.index, df['MA200'], label='200-Day MA', linewidth=1.5, color='#d62728', linestyle='--')
    ax.set_title(f'{ticker.upper()} - Price with Moving Averages', fontsize=16, fontweight='bold')
    ax.set_xlabel('Date', fontsize=12)
    ax.set_ylabel('Price ($)', fontsize=12)
    ax.legend(loc='best')
    ax.grid(True, alpha=0.3)
    plt.tight_layout()
    plt.savefig(f'{output_dir}/moving_averages.png', dpi=150, bbox_inches='tight')
    plt.close()
    print(f"✓ Generated: moving_averages.png")
    
    # 3. Volume Chart
    fig, ax = plt.subplots(figsize=(12, 6))
    colors = ['green' if df['Close'].iloc[i] >= df['Open'].iloc[i] else 'red' 
              for i in range(len(df))]
    ax.bar(df.index, df['Volume'], color=colors, alpha=0.6)
    ax.set_title(f'{ticker.upper()} - Trading Volume', fontsize=16, fontweight='bold')
    ax.set_xlabel('Date', fontsize=12)
    ax.set_ylabel('Volume', fontsize=12)
    ax.grid(True, alpha=0.3)
    plt.tight_layout()
    plt.savefig(f'{output_dir}/volume.png', dpi=150, bbox_inches='tight')
    plt.close()
    print(f"✓ Generated: volume.png")
    
    # 4. Candlestick-style OHLC Chart (last 90 days)
    df_recent = df.tail(90)
    fig, (ax1, ax2) = plt.subplots(2, 1, figsize=(12, 8), gridspec_kw={'height_ratios': [3, 1]})
    
    # Price
    for i in range(len(df_recent)):
        date = df_recent.index[i]
        open_price = df_recent['Open'].iloc[i]
        close_price = df_recent['Close'].iloc[i]
        high = df_recent['High'].iloc[i]
        low = df_recent['Low'].iloc[i]
        
        color = 'green' if close_price >= open_price else 'red'
        ax1.plot([date, date], [low, high], color='black', linewidth=0.5)
        ax1.plot([date, date], [open_price, close_price], color=color, linewidth=3, solid_capstyle='round')
    
    ax1.set_title(f'{ticker.upper()} - OHLC Chart (Last 90 Days)', fontsize=16, fontweight='bold')
    ax1.set_ylabel('Price ($)', fontsize=12)
    ax1.grid(True, alpha=0.3)
    
    # Volume
    colors = ['green' if df_recent['Close'].iloc[i] >= df_recent['Open'].iloc[i] else 'red' 
              for i in range(len(df_recent))]
    ax2.bar(df_recent.index, df_recent['Volume'], color=colors, alpha=0.6)
    ax2.set_xlabel('Date', fontsize=12)
    ax2.set_ylabel('Volume', fontsize=12)
    ax2.grid(True, alpha=0.3)
    
    plt.tight_layout()
    plt.savefig(f'{output_dir}/ohlc_chart.png', dpi=150, bbox_inches='tight')
    plt.close()
    print(f"✓ Generated: ohlc_chart.png")
    
    # 5. Daily Returns Distribution
    df['Daily_Return'] = df['Close'].pct_change() * 100
    
    fig, ax = plt.subplots(figsize=(12, 6))
    ax.hist(df['Daily_Return'].dropna(), bins=50, color='#1f77b4', alpha=0.7, edgecolor='black')
    ax.axvline(df['Daily_Return'].mean(), color='red', linestyle='--', linewidth=2, label=f'Mean: {df["Daily_Return"].mean():.2f}%')
    ax.set_title(f'{ticker.upper()} - Daily Returns Distribution', fontsize=16, fontweight='bold')
    ax.set_xlabel('Daily Return (%)', fontsize=12)
    ax.set_ylabel('Frequency', fontsize=12)
    ax.legend()
    ax.grid(True, alpha=0.3)
    plt.tight_layout()
    plt.savefig(f'{output_dir}/returns_distribution.png', dpi=150, bbox_inches='tight')
    plt.close()
    print(f"✓ Generated: returns_distribution.png")
    
    # 6. Cumulative Returns
    df['Cumulative_Return'] = (1 + df['Daily_Return']/100).cumprod() - 1
    
    fig, ax = plt.subplots(figsize=(12, 6))
    ax.plot(df.index, df['Cumulative_Return'] * 100, linewidth=2, color='#2ca02c')
    ax.fill_between(df.index, df['Cumulative_Return'] * 100, alpha=0.3, color='#2ca02c')
    ax.axhline(y=0, color='black', linestyle='-', linewidth=0.5)
    ax.set_title(f'{ticker.upper()} - Cumulative Returns (1 Year)', fontsize=16, fontweight='bold')
    ax.set_xlabel('Date', fontsize=12)
    ax.set_ylabel('Cumulative Return (%)', fontsize=12)
    ax.grid(True, alpha=0.3)
    plt.tight_layout()
    plt.savefig(f'{output_dir}/cumulative_returns.png', dpi=150, bbox_inches='tight')
    plt.close()
    print(f"✓ Generated: cumulative_returns.png")
    
    print(f"\n✅ All charts generated successfully in {output_dir}")
    print(f"📊 Data range: {df.index[0].strftime('%Y-%m-%d')} to {df.index[-1].strftime('%Y-%m-%d')}")
    print(f"💰 Latest close: ${df['Close'].iloc[-1]:.2f}")
    print(f"📈 1-year return: {df['Cumulative_Return'].iloc[-1]*100:.2f}%")

if __name__ == "__main__":
    ticker = "wmt"
    output_dir = "/home/rsypert/agent-in-the-loop/frontend/public/wmt"
    generate_charts(ticker, output_dir)
