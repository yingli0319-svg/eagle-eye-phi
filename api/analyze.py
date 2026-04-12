"""
天使鹰眼 - 股票技术分析API
Vercel Serverless Function
多源数据：yfinance + 东方财富 + AKShare
"""
import json
import yfinance as yf
import pandas as pd
import numpy as np
from datetime import datetime, timedelta
import requests

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
        
        # 多源获取数据
        df, stock_name, market = get_stock_data_multi_source(code)
        
        if df is None or df.empty:
            return {
                'statusCode': 404,
                'headers': headers,
                'body': json.dumps({'error': '未找到该股票数据，请检查代码是否正确'})
            }
        
        # 计算技术指标
        analysis = calculate_technical_analysis(df)
        
        # 获取最新价格
        latest = df.iloc[-1]
        prev = df.iloc[-2] if len(df) > 1 else latest
        
        result = {
            'code': code,
            'name': stock_name or code,
            'market': market,
            'price': round(latest['Close'], 2),
            'change': round((latest['Close'] - prev['Close']) / prev['Close'] * 100, 2),
            'volume': int(latest['Volume']) if 'Volume' in latest else 0,
            'analysis': analysis,
            'data_source': df.attrs.get('source', 'unknown')
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
            'body': json.dumps({'error': '数据获取失败: ' + str(e)})
        }

def get_stock_data_multi_source(code):
    """多源获取股票数据，失败自动切换"""
    code = str(code).strip()
    
    # 判断市场类型
    market = detect_market(code)
    
    # 第一源：yfinance
    try:
        df = get_yfinance_data(code, market)
        if df is not None and not df.empty:
            df.attrs['source'] = 'yfinance'
            name = get_yfinance_name(code, market)
            return df, name, market
    except Exception as e:
        print(f"yfinance failed: {e}")
    
    # 第二源：东方财富
    try:
        df, name = get_eastmoney_data(code, market)
        if df is not None and not df.empty:
            df.attrs['source'] = 'eastmoney'
            return df, name, market
    except Exception as e:
        print(f"eastmoney failed: {e}")
    
    # 第三源：AKShare (A股/港股)
    if market in ['A股', '港股']:
        try:
            df, name = get_akshare_data(code, market)
            if df is not None and not df.empty:
                df.attrs['source'] = 'akshare'
                return df, name, market
        except Exception as e:
            print(f"akshare failed: {e}")
    
    return None, None, market

def detect_market(code):
    """检测市场类型"""
    code = str(code).strip()
    
    # 港股 (纯数字，0-9开头，5位)
    if code.isdigit() and len(code) <= 5:
        return '港股'
    
    # A股 (6位数字)
    if len(code) == 6 and code.isdigit():
        return 'A股'
    
    # 美股 (字母)
    if code.isalpha():
        return '美股'
    
    return '未知'

def get_yfinance_data(code, market):
    """从yfinance获取数据"""
    ticker = convert_to_yfinance_ticker(code, market)
    stock = yf.Ticker(ticker)
    df = stock.history(period="3mo")
    return df if not df.empty else None

def get_yfinance_name(code, market):
    """从yfinance获取股票名称"""
    try:
        ticker = convert_to_yfinance_ticker(code, market)
        stock = yf.Ticker(ticker)
        info = stock.info
        return info.get('shortName') or info.get('longName') or code
    except:
        return code

def convert_to_yfinance_ticker(code, market):
    """转换为yfinance格式的ticker"""
    code = str(code).strip().upper()
    
    if market == '港股':
        return code + '.HK'
    elif market == 'A股':
        if code.startswith('6'):
            return code + '.SS'
        else:
            return code + '.SZ'
    else:
        return code

def get_eastmoney_data(code, market):
    """从东方财富获取数据"""
    if market == '港股':
        secid = f"116.{code}"
    elif market == 'A股':
        if code.startswith('6'):
            secid = f"1.{code}"
        else:
            secid = f"0.{code}"
    else:
        return None, None
    
    url = f"https://push2his.eastmoney.com/api/qt/stock/kline/get"
    params = {
        'secid': secid,
        'fields1': 'f1,f2,f3,f4,f5,f6',
        'fields2': 'f51,f52,f53,f54,f55,f56,f57',
        'klt': '101',
        'fqt': '0',
        'end': '20500101',
        'lmt': '90'
    }
    
    resp = requests.get(url, params=params, timeout=10)
    data = resp.json()
    
    if data.get('data') and data['data'].get('klines'):
        klines = data['data']['klines']
        name = data['data'].get('name', code)
        
        # 解析K线数据
        rows = []
        for k in klines:
            parts = k.split(',')
            rows.append({
                'Date': pd.to_datetime(parts[0]),
                'Open': float(parts[1]),
                'Close': float(parts[2]),
                'High': float(parts[3]),
                'Low': float(parts[4]),
                'Volume': int(float(parts[5]))
            })
        
        df = pd.DataFrame(rows)
        df.set_index('Date', inplace=True)
        return df, name
    
    return None, None

def get_akshare_data(code, market):
    """从AKShare获取数据（通过HTTP API）"""
    # AKShare需要通过Python调用，这里使用新浪API作为替代
    if market == 'A股':
        if code.startswith('6'):
            symbol = f"sh{code}"
        else:
            symbol = f"sz{code}"
        
        # 使用新浪财经API获取历史数据
        url = f"https://quotes.sina.cn/cn/api/quotes.php"
        params = {
            'symbol': symbol,
            'datasource': 'quotes'
        }
        
        try:
            resp = requests.get(url, timeout=10)
            # 新浪API返回格式较复杂，这里简化处理
            # 实际使用时需要解析返回数据
            pass
        except:
            pass
    
    # 暂时返回None，后续可以接入更多数据源
    return None, None

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
