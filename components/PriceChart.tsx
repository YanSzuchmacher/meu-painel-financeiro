
import React, { useEffect, useRef, memo } from 'react';
import { createChart, IChartApi, ISeriesApi, LineData, HistogramData, UTCTimestamp, ColorType, LineStyle, PriceScaleMargins } from 'lightweight-charts';
import { HistoricalDataPoint, AssetType } from '../types';

interface PriceChartProps {
  data: HistoricalDataPoint[];
  assetType: AssetType;
}

const isValidDataPoint = (point: HistoricalDataPoint): point is HistoricalDataPoint => 
  typeof point === 'object' && point !== null &&
  typeof point.time === 'number' && isFinite(point.time) &&
  typeof point.value === 'number' && isFinite(point.value) &&
  (typeof point.volume === 'number' ? isFinite(point.volume) : true); // Volume is optional but must be finite

// --- Indicator Calculations ---

const calculateSMA = (data: number[], period: number): (number | undefined)[] => {
  if (data.length < period) return data.map(() => undefined);
  const sma: (number | undefined)[] = Array(period - 1).fill(undefined);
  for (let i = period - 1; i < data.length; i++) {
    let sum = 0;
    for (let j = 0; j < period; j++) {
      sum += data[i - j];
    }
    sma.push(sum / period);
  }
  return sma;
};

const calculateEMA = (data: number[], period: number): (number | undefined)[] => {
    if (data.length < period) return data.map(() => undefined);
    const ema: (number | undefined)[] = Array(period -1).fill(undefined);
    let sum = 0;
    for(let i=0; i < period; i++) sum += data[i];
    ema.push(sum/period);

    const multiplier = 2 / (period + 1);
    for (let i = period; i < data.length; i++) {
        const currentEma = (data[i] - ema[ema.length -1]!) * multiplier + ema[ema.length -1]!;
        ema.push(currentEma);
    }
    return ema;
}


const calculateBollingerBands = (data: number[], period: number, stdDevMultiplier: number): { middle: (number | undefined)[], upper: (number | undefined)[], lower: (number | undefined)[] } => {
  const middleBand = calculateSMA(data, period);
  const upperBand: (number | undefined)[] = [];
  const lowerBand: (number | undefined)[] = [];

  for (let i = 0; i < data.length; i++) {
    if (i < period - 1 || middleBand[i] === undefined) {
      upperBand.push(undefined);
      lowerBand.push(undefined);
    } else {
      let sumSqDiff = 0;
      for (let j = 0; j < period; j++) {
        sumSqDiff += Math.pow(data[i - j] - middleBand[i]!, 2);
      }
      const stdDev = Math.sqrt(sumSqDiff / period);
      upperBand.push(middleBand[i]! + stdDevMultiplier * stdDev);
      lowerBand.push(middleBand[i]! - stdDevMultiplier * stdDev);
    }
  }
  return { middle: middleBand, upper: upperBand, lower: lowerBand };
};

const calculateRSI = (data: number[], period: number = 14): (number | undefined)[] => {
  if (data.length < period + 1) return data.map(() => undefined);
  const rsi: (number | undefined)[] = Array(period).fill(undefined);
  let avgGain = 0;
  let avgLoss = 0;

  for (let i = 1; i <= period; i++) {
    const change = data[i] - data[i-1];
    if (change > 0) avgGain += change;
    else avgLoss += Math.abs(change);
  }
  avgGain /= period;
  avgLoss /= period;

  for (let i = period; i < data.length; i++) {
    const change = data[i] - data[i-1];
    let gain = change > 0 ? change : 0;
    let loss = change < 0 ? Math.abs(change) : 0;
    
    avgGain = (avgGain * (period - 1) + gain) / period;
    avgLoss = (avgLoss * (period - 1) + loss) / period;

    if (avgLoss === 0) {
      rsi.push(100);
    } else {
      const rs = avgGain / avgLoss;
      rsi.push(100 - (100 / (1 + rs)));
    }
  }
  return rsi;
};

const calculateMACD = (data: number[], shortPeriod: number = 12, longPeriod: number = 26, signalPeriod: number = 9): 
  { macdLine: (number | undefined)[], signalLine: (number | undefined)[], histogram: (number | undefined)[] } => {
  
  const emaShort = calculateEMA(data, shortPeriod);
  const emaLong = calculateEMA(data, longPeriod);
  
  const macdLine = emaShort.map((shortVal, i) => {
    if (shortVal === undefined || emaLong[i] === undefined) return undefined;
    return shortVal - emaLong[i]!;
  });

  const macdValuesForSignal = macdLine.filter(val => val !== undefined) as number[];
  const signalLinePadded = calculateEMA(macdValuesForSignal, signalPeriod);
  
  // Pad signalLine to match macdLine length
  const signalLine: (number|undefined)[] = Array(macdLine.length - signalLinePadded.length).fill(undefined).concat(signalLinePadded);

  const histogram = macdLine.map((macdVal, i) => {
    if (macdVal === undefined || signalLine[i] === undefined) return undefined;
    return macdVal - signalLine[i]!;
  });

  return { macdLine, signalLine, histogram };
};


const PriceChartComponent: React.FC<PriceChartProps> = ({ data: rawData, assetType }) => {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  
  // Main Price Series
  const priceSeriesRef = useRef<ISeriesApi<'Line'> | null>(null);
  
  // Bollinger Bands
  const bbMiddleSeriesRef = useRef<ISeriesApi<'Line'> | null>(null);
  const bbUpperSeriesRef = useRef<ISeriesApi<'Line'> | null>(null);
  const bbLowerSeriesRef = useRef<ISeriesApi<'Line'> | null>(null);

  // Volume
  const volumeSeriesRef = useRef<ISeriesApi<'Histogram'> | null>(null);

  // RSI
  const rsiSeriesRef = useRef<ISeriesApi<'Line'> | null>(null);
  
  // MACD
  const macdLineSeriesRef = useRef<ISeriesApi<'Line'> | null>(null);
  const macdSignalSeriesRef = useRef<ISeriesApi<'Line'> | null>(null);
  const macdHistogramSeriesRef = useRef<ISeriesApi<'Histogram'> | null>(null);


  const data = rawData.filter(isValidDataPoint);
  const priceValues = data.map(d => d.value);

  useEffect(() => {
    if (!chartContainerRef.current || data.length < 2) { // Need at least 2 points for most indicators
        // Cleanup if chart exists and data becomes insufficient
        if (chartRef.current) {
             chartRef.current.remove(); chartRef.current = null;
        }
        return;
    };

    const chart = chartRef.current || createChart(chartContainerRef.current, {
      width: chartContainerRef.current.clientWidth,
      height: 350, // Adjusted height, consider making this prop based
      layout: { background: { type: ColorType.Solid, color: '#1f2937' }, textColor: '#d1d5db' },
      grid: { vertLines: { color: '#374151' }, horzLines: { color: '#374151' } },
      timeScale: { borderColor: '#4b5563', timeVisible: true, secondsVisible: false },
      rightPriceScale: { borderColor: '#4b5563', scaleMargins: { top: 0.1, bottom: 0.1 } }, // Price scale
      localization: { locale: 'pt-BR' },
    });
    if (!chartRef.current) chartRef.current = chart;
    
    // Price Formatting
    const lastPrice = data.length > 0 ? data[data.length-1].value : 0;
    const pricePrecision = (assetType === AssetType.FOREX || (assetType === AssetType.CRYPTO && lastPrice < 1)) ? 4 : 2;
    const priceMinMove = (assetType === AssetType.FOREX || (assetType === AssetType.CRYPTO && lastPrice < 1)) ? 0.0001 : 0.01;
    const priceFormat = { type: 'price' as const, precision: pricePrecision, minMove: priceMinMove };

    // --- Setup Series ---
    if (!priceSeriesRef.current) {
      priceSeriesRef.current = (chart as any).addLineSeries({ color: '#38bdf8', lineWidth: 2, priceFormat, title: 'Preço'});
    } else { priceSeriesRef.current.applyOptions({ priceFormat });}
    
    // Bollinger Bands
    const bbPeriod = 20, bbStdDev = 2;
    if (!bbMiddleSeriesRef.current) bbMiddleSeriesRef.current = (chart as any).addLineSeries({ color: '#f97316', lineWidth: 1, priceFormat, title: `MME(${bbPeriod})`, crosshairMarkerVisible: false, lastValueVisible: false });
    if (!bbUpperSeriesRef.current) bbUpperSeriesRef.current = (chart as any).addLineSeries({ color: '#eab308', lineWidth: 1, lineStyle: LineStyle.Dashed, priceFormat, title: 'BB Sup', crosshairMarkerVisible: false, lastValueVisible: false });
    if (!bbLowerSeriesRef.current) bbLowerSeriesRef.current = (chart as any).addLineSeries({ color: '#eab308', lineWidth: 1, lineStyle: LineStyle.Dashed, priceFormat, title: 'BB Inf', crosshairMarkerVisible: false, lastValueVisible: false });

    // Volume - new price scale
    if (!volumeSeriesRef.current) {
      volumeSeriesRef.current = (chart as any).addHistogramSeries({
        priceFormat: { type: 'volume' },
        priceScaleId: 'volume_scale', // Use a separate price scale
        color: '#4b5563',
        title: 'Volume'
      });
      chart.priceScale('volume_scale').applyOptions({ scaleMargins: { top: 0.8, bottom: 0 } }); // Place volume at bottom
    }

    // RSI - new price scale
    if (!rsiSeriesRef.current) {
      rsiSeriesRef.current = (chart as any).addLineSeries({
        priceFormat: { type: 'price', precision: 2, minMove: 0.01 },
        priceScaleId: 'rsi_scale',
        color: '#ec4899', // Pink
        lineWidth: 1,
        title: 'RSI(14)'
      });
       chart.priceScale('rsi_scale').applyOptions({ scaleMargins: { top: 0.7, bottom: 0.1 } });
    }
    
    // MACD - new price scale
    if(!macdLineSeriesRef.current){
      macdLineSeriesRef.current = (chart as any).addLineSeries({ priceScaleId: 'macd_scale', color: '#22c55e', lineWidth:1, title:'MACD(12,26)'});
      macdSignalSeriesRef.current = (chart as any).addLineSeries({ priceScaleId: 'macd_scale', color: '#ef4444', lineWidth:1, title:'Sinal(9)'});
      macdHistogramSeriesRef.current = (chart as any).addHistogramSeries({ priceScaleId: 'macd_scale', color: '#84cc16', title:'Hist. MACD'});
      chart.priceScale('macd_scale').applyOptions({scaleMargins: {top: 0.85, bottom: 0}});
    }


    // --- Set Data for Series ---
    const chartData = data.map(d => ({ time: d.time as UTCTimestamp, value: d.value }));
    priceSeriesRef.current.setData(chartData);

    const { middle, upper, lower } = calculateBollingerBands(priceValues, bbPeriod, bbStdDev);
    bbMiddleSeriesRef.current.setData(middle.map((val, i) => val !== undefined ? { time: data[i].time as UTCTimestamp, value: val } : undefined).filter(Boolean) as LineData[]);
    bbUpperSeriesRef.current.setData(upper.map((val, i) => val !== undefined ? { time: data[i].time as UTCTimestamp, value: val } : undefined).filter(Boolean) as LineData[]);
    bbLowerSeriesRef.current.setData(lower.map((val, i) => val !== undefined ? { time: data[i].time as UTCTimestamp, value: val } : undefined).filter(Boolean) as LineData[]);

    const volumeData = data.map(d => ({ time: d.time as UTCTimestamp, value: d.volume || 0, color: d.value > (data[data.indexOf(d)-1]?.value || d.value) ? 'rgba(34, 197, 94, 0.5)' : 'rgba(239, 68, 68, 0.5)' }));
    volumeSeriesRef.current.setData(volumeData);

    const rsiValues = calculateRSI(priceValues);
    rsiSeriesRef.current.setData(rsiValues.map((val, i) => val !== undefined ? { time: data[i].time as UTCTimestamp, value: val } : undefined).filter(Boolean) as LineData[]);
    
    const { macdLine, signalLine, histogram } = calculateMACD(priceValues);
    macdLineSeriesRef.current.setData(macdLine.map((v,i)=> v !== undefined ? {time: data[i].time as UTCTimestamp, value:v} : undefined).filter(Boolean) as LineData[]);
    macdSignalSeriesRef.current.setData(signalLine.map((v,i)=> v !== undefined ? {time: data[i].time as UTCTimestamp, value:v} : undefined).filter(Boolean) as LineData[]);
    macdHistogramSeriesRef.current.setData(histogram.map((v, i) => v !== undefined ? {time: data[i].time as UTCTimestamp, value:v, color: v > 0 ? 'rgba(34,197,94,0.5)' : 'rgba(239,68,68,0.5)'} : undefined).filter(Boolean) as HistogramData[]);


    chart.timeScale().fitContent();
    
    const handleResize = () => chart.resize(chartContainerRef.current!.clientWidth, chartContainerRef.current!.clientHeight);
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      // Only remove the chart if the component is truly unmounting
      // This effect runs on data change, so we don't want to destroy/recreate chart constantly
    };
  }, [data, assetType]); // Rerun if data or assetType changes

  // Effect for cleanup on unmount
  useEffect(() => {
    return () => {
      if (chartRef.current) {
        chartRef.current.remove();
        chartRef.current = null;
      }
      priceSeriesRef.current = null;
      bbMiddleSeriesRef.current = null; bbUpperSeriesRef.current = null; bbLowerSeriesRef.current = null;
      volumeSeriesRef.current = null; rsiSeriesRef.current = null;
      macdLineSeriesRef.current = null; macdSignalSeriesRef.current = null; macdHistogramSeriesRef.current = null;
    };
  }, []);

  if (data.length < 2) { // Or a higher number depending on min data for indicators
    return <div ref={chartContainerRef} className="chart-container w-full h-[350px] flex items-center justify-center text-gray-500">Dados insuficientes para exibir indicadores completos.</div>;
  }

  return <div ref={chartContainerRef} className="chart-container w-full h-[350px]" />;
};

const MemoizedPriceChart = memo(PriceChartComponent);
export { MemoizedPriceChart as default };
