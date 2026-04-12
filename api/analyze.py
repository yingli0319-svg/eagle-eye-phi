"""
天使鹰眼 - 股票技术分析API
Vercel Serverless Function
"""
import json
import yfinance as yf
import pandas as pd
import numpy as np
from datetime import datetime, timedelta

def handler(request):
    """Vercel Serverless Function Handler"""
    # 设置CORS头
    headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Content-Type': 'application/json'
    }
    
    # 处理OPTIONS预检请求
    if request.get('method') == 'OPTIONS':
        return {'statusCode': 200, 'headers': headers, 'body': ''}
    
    try:
        # 获取股票代码
        query = request.get('queryStringParameters', {})
        code = query.get('code', '')
        
        if not code:
            return {
                'statusCode': 400,
                'headers': headers,
                'body': json.dumps({'error': '请提供股票代码'})
            }
        
        # 转换股票代码为yfinance格式
        ticker = convert_code_to_ticker(code)
        
        # 获取股票数据
        stock = yf.Ticker(ticker)
        hist = stock.history(period="3mo")
        
        if hist.empty:
            return {
                'statusCode': 404,
                'headers': headers,
                'body': json.dumps({'error': '未找到该股票数据'})
            }
        
        # 计算技术指标
        analysis = calculate_technical_analysis(hist)
        
        # 获取最新价格
        latest = hist.iloc[-1]
        prev = hist.iloc[-2] if len(hist) > 1 else latest
        
        result = {
            'code': code,
            'name': stock.info.get('shortName', code),
            'price': round(latest['Close'], 2),
            'change': round((latest['Close'] - prev['Close']) / prev['Close'] * 100, 2),
            'volume': int(latest['Volume']),
            'analysis': analysis
        }
        
        return {
            'statusCode': 200,
            'headers': headers,
            'body': json.dumps(result)
        }
        
    except Exception as e:
        return {
            'statusCode': 500,
            'headers': headers,
            'body': json.dumps({'error': str(e)})
        }

def convert_code_to_ticker(code):
    """转换股票代码为yfinance格式"""
    code = str(code).strip().upper()
    
    # 港股 (0-9开头)
    if code.isdigit():
        return code + '.HK'
    
    # A股 (6位数字)
    if len(code) == 6 and code.isdigit():
        if code.startswith('6'):
            return code + '.SS'  # 上海
        else:
            return code + '.SZ'  # 深圳
    
    # 美股 (字母)
    return code

def calculate_technical_analysis(df):
    """计算技术分析指标"""
    close = df['Close']
    high = df['High']
    low = df['Low']
    
    # 均线
    ma5 = close.rolling(window=5).mean().iloc[-1]
    ma10 = close.rolling(window=10).mean().iloc[-1]
    ma20 = close.rolling(window=20).mean().iloc[-1]
    ma60 = close.rolling(window=60).mean().iloc[-1]
    
    # RSI
    delta = close.diff()
    gain = (delta.where(delta > 0, 0)).rolling(window=14).mean()
    loss = (-delta.where(delta < 0, 0)).rolling(window=14).mean()
    rs = gain / loss
    rsi = 100 - (100 / (1 + rs))
    rsi_value = rsi.iloc[-1]
    
    # MACD
    exp1 = close.ewm(span=12).mean()
    exp2 = close.ewm(span=26).mean()
    macd = exp1 - exp2
    signal = macd.ewm(span=9).mean()
    macd_value = macd.iloc[-1]
    signal_value = signal.iloc[-1]
    
    # 布林带
    ma20_line = close.rolling(window=20).mean()
    std20 = close.rolling(window=20).std()
    upper_band = ma20_line + (std20 * 2)
    lower_band = ma20_line - (std20 * 2)
    
    latest_close = close.iloc[-1]
    
    # 计算评分
    trend_score = calculate_trend_score(latest_close, ma5, ma10, ma20, ma60)
    momentum_score = calculate_momentum_score(rsi_value, macd_value, signal_value)
    volatility_score = calculate_volatility_score(latest_close, upper_band.iloc[-1], lower_band.iloc[-1])
    
    total_score = int((trend_score + momentum_score + volatility_score) / 3)
    
    # 交易信号
    signal_text = generate_signal(trend_score, momentum_score, macd_value, signal_value, rsi_value)
    
    # 支撑阻力位
    support = round(lower_band.iloc[-1], 2)
    resistance = round(upper_band.iloc[-1], 2)
    
    return {
        'score': total_score,
        'trend': {'score': trend_score, 'label': get_score_label(trend_score)},
        'momentum': {'score': momentum_score, 'label': get_score_label(momentum_score)},
        'volatility': {'score': volatility_score, 'label': get_score_label(volatility_score)},
        'signal': signal_text,
        'support': support,
        'resistance': resistance,
        'rsi': round(rsi_value, 1),
        'macd': round(macd_value, 2),
        'signal_line': round(signal_value, 2),
        'ma5': round(ma5, 2),
        'ma10': round(ma10, 2),
        'ma20': round(ma20, 2),
        'ma60': round(ma60, 2),
        'upper_band': round(upper_band.iloc[-1], 2),
        'lower_band': round(lower_band.iloc[-1], 2)
    }

def calculate_trend_score(close, ma5, ma10, ma20, ma60):
    """趋势评分 0-100"""
    score = 50
    if close > ma5: score += 10
    if close > ma10: score += 10
    if close > ma20: score += 10
    if close > ma60: score += 10
    if ma5 > ma10: score += 5
    if ma10 > ma20: score += 5
    return min(100, max(0, score))

def calculate_momentum_score(rsi, macd, signal):
    """动量评分 0-100"""
    score = 50
    if rsi > 50: score += 15
    if rsi > 70: score += 10
    if macd > signal: score += 15
    if macd > 0: score += 10
    return min(100, max(0, score))

def calculate_volatility_score(close, upper, lower):
    """波动评分 0-100 (基于布林带位置)"""
    if upper == lower:
        return 50
    position = (close - lower) / (upper - lower)
    score = int(position * 100)
    return min(100, max(0, score))

def get_score_label(score):
    """评分标签"""
    if score >= 80: return '优秀'
    if score >= 60: return '良好'
    if score >= 40: return '中性'
    if score >= 20: return '偏弱'
    return '弱势'

def generate_signal(trend, momentum, macd, signal, rsi):
    """生成交易信号"""
    bullish = 0
    bearish = 0
    
    if trend > 60: bullish += 1
    if trend < 40: bearish += 1
    if momentum > 60: bullish += 1
    if momentum < 40: bearish += 1
    if macd > signal: bullish += 1
    if macd < signal: bearish += 1
    if rsi > 50: bullish += 1
    if rsi < 50: bearish += 1
    
    if bullish >= 3: return '买入'
    if bearish >= 3: return '卖出'
    return '观望'
