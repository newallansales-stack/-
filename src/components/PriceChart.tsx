import { useEffect, useId, useMemo, useRef, useState } from 'react';
import type { KeyboardEvent, PointerEvent } from 'react';
import './PriceChart.css';

export type PricePoint = {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  count: number;
};

type PriceChartProps = {
  points: PricePoint[];
  interval: 'day' | 'week' | 'month';
  kind: 'candle' | 'line';
  loading?: boolean;
  productName?: string;
};

const PLOT_TOP = 25;
const PLOT_BOTTOM = 274;
const VOLUME_TOP = 313;
const VOLUME_BOTTOM = 354;
const SVG_HEIGHT = 393;
const AXIS_WIDTH = 68;
const LEFT_PAD = 20;
const RIGHT_PAD = 24;
const DAY = 86_400_000;

function formatPrice(value: number) {
  return value.toLocaleString('zh-CN', {
    minimumFractionDigits: value < 100 ? 2 : 0,
    maximumFractionDigits: 2,
  });
}

function daysBetween(left: string, right: string) {
  return (Date.parse(`${right}T00:00:00Z`) - Date.parse(`${left}T00:00:00Z`)) / DAY;
}

function hasGap(left: string, right: string, interval: PriceChartProps['interval']) {
  if (interval === 'month') {
    const month = (date: string) => Number(date.slice(0, 4)) * 12 + Number(date.slice(5, 7));
    return month(right) - month(left) > 1;
  }
  return daysBetween(left, right) > (interval === 'week' ? 7 : 1);
}

export default function PriceChart({
  points,
  interval,
  kind,
  loading = false,
  productName = '商品',
}: PriceChartProps) {
  const gradientId = useId().replaceAll(':', '');
  const shellRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const [shellWidth, setShellWidth] = useState(760);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [showCrosshair, setShowCrosshair] = useState(false);
  const [scrollLeft, setScrollLeft] = useState(0);

  const data = useMemo(
    () => points.filter((point) => [point.open, point.high, point.low, point.close].every(Number.isFinite))
      .slice().sort((a, b) => a.date.localeCompare(b.date)),
    [points],
  );

  useEffect(() => {
    const element = shellRef.current;
    if (!element) return;
    const observer = new ResizeObserver(([entry]) => setShellWidth(entry.contentRect.width));
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  const viewportWidth = Math.max(190, shellWidth - AXIS_WIDTH);
  const minimumStep = interval === 'day' ? 8 : interval === 'week' ? 11 : 15;
  const width = Math.max(viewportWidth, data.length * minimumStep + LEFT_PAD + RIGHT_PAD);
  const plotWidth = width - LEFT_PAD - RIGHT_PAD;
  const step = plotWidth / Math.max(data.length, 1);
  const candleWidth = Math.max(2, Math.min(step * 0.58, 13));
  const canScroll = width > viewportWidth + 2;

  useEffect(() => {
    setActiveIndex(null);
    setShowCrosshair(false);
    const scroll = scrollRef.current;
    if (scroll) {
      scroll.scrollLeft = Math.max(0, width - scroll.clientWidth);
      setScrollLeft(scroll.scrollLeft);
    }
  }, [productName, interval, data[0]?.date, data[data.length - 1]?.date, width]);

  const { minimum, maximum, ticks } = useMemo(() => {
    if (!data.length) return { minimum: 0, maximum: 100, ticks: [100, 75, 50, 25, 0] };
    const lowest = Math.min(...data.map((point) => point.low));
    const highest = Math.max(...data.map((point) => point.high));
    const spread = Math.max(highest - lowest, highest * 0.04, 1);
    const minimum = Math.max(0, lowest - spread * 0.14);
    const maximum = highest + spread * 0.14;
    return {
      minimum,
      maximum,
      ticks: Array.from({ length: 5 }, (_, index) => maximum - (maximum - minimum) * index / 4),
    };
  }, [data]);

  const x = (index: number) => LEFT_PAD + (index + 0.5) * step;
  const y = (price: number) => PLOT_BOTTOM - (price - minimum) / (maximum - minimum) * (PLOT_BOTTOM - PLOT_TOP);
  const maximumCount = Math.max(1, ...data.map((point) => point.count));
  const selectedIndex = Math.min(activeIndex ?? Math.max(0, data.length - 1), data.length - 1);
  const selected = data[selectedIndex];
  const latest = data[data.length - 1];
  const selectedX = x(selectedIndex);
  const selectedViewportX = selectedX - scrollLeft;
  const tooltipWidth = Math.min(210, viewportWidth - 12);
  const tooltipLeft = Math.max(6, Math.min(selectedViewportX + 18, viewportWidth - tooltipWidth - 6));
  const gapCount = data.reduce((count, point, index) => count + (index > 0 && hasGap(data[index - 1].date, point.date, interval) ? 1 : 0), 0);

  const lineSegments: Array<{ path: string; startX: number; endX: number }> = [];
  if (kind === 'line' && data.length) {
    let segment = { path: '', startX: x(0), endX: x(0) };
    data.forEach((point, index) => {
      if (index > 0 && hasGap(data[index - 1].date, point.date, interval)) {
        lineSegments.push(segment);
        segment = { path: '', startX: x(index), endX: x(index) };
      }
      segment.path += `${segment.path ? ' L' : 'M'} ${x(index)} ${y(point.close)}`;
      segment.endX = x(index);
    });
    lineSegments.push(segment);
  }

  const updatePointer = (event: PointerEvent<SVGSVGElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const localX = (event.clientX - rect.left) * width / rect.width;
    const index = Math.max(0, Math.min(data.length - 1, Math.floor((localX - LEFT_PAD) / step)));
    setActiveIndex(index);
    setShowCrosshair(true);
  };

  const onKeyDown = (event: KeyboardEvent<SVGSVGElement>) => {
    let nextIndex = selectedIndex;
    if (event.key === 'ArrowLeft') nextIndex = Math.max(0, selectedIndex - 1);
    else if (event.key === 'ArrowRight') nextIndex = Math.min(data.length - 1, selectedIndex + 1);
    else if (event.key === 'Home') nextIndex = 0;
    else if (event.key === 'End') nextIndex = data.length - 1;
    else if (event.key === 'Escape') { setShowCrosshair(false); return; }
    else return;
    event.preventDefault();
    setActiveIndex(nextIndex);
    setShowCrosshair(true);
    const scroll = scrollRef.current;
    if (scroll) {
      const position = x(nextIndex);
      if (position < scroll.scrollLeft + 30 || position > scroll.scrollLeft + scroll.clientWidth - 30) {
        scroll.scrollLeft = Math.max(0, position - scroll.clientWidth / 2);
        setScrollLeft(scroll.scrollLeft);
      }
    }
  };

  const labelEvery = Math.max(1, Math.ceil(105 / step));
  const intervalLabel = interval === 'week' ? '周' : interval === 'month' ? '月' : '日';

  return (
    <div className="price-chart" ref={shellRef} aria-busy={loading}>
      <div className="price-chart-legend" aria-live={showCrosshair ? 'polite' : 'off'}>
        <span className="price-chart-date">{selected?.date ?? '—'}{interval !== 'day' && <span> · {intervalLabel}线</span>}</span>
        {(['open', 'high', 'low', 'close'] as const).map((key, index) => (
          <span key={key} className="price-chart-ohlc">
            <span>{['开', '高', '低', '收'][index]}</span>
            <b className={key === 'close' && selected ? selected.close > selected.open ? 'chart-rise' : selected.close < selected.open ? 'chart-fall' : '' : ''}>
              {selected ? formatPrice(selected[key]) : '—'}
            </b>
          </span>
        ))}
        <span className="price-chart-currency">CNY</span>
      </div>

      <div className={`price-chart-body${loading ? ' chart-is-loading' : ''}`}>
        {!data.length && !loading ? (
          <div className="price-chart-empty">
            <svg width="48" height="40" viewBox="0 0 48 40" aria-hidden="true"><path d="M4 4v32h40M10 27l9-10 8 5L41 8" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /><circle cx="41" cy="8" r="3" fill="currentColor" /></svg>
            <strong>此区间暂无价格记录</strong>
            <span>导入历史价格后即可查看走势；缺失日期不会补填。</span>
          </div>
        ) : (
          <>
            <div className="price-chart-scroll" ref={scrollRef} onScroll={(event) => setScrollLeft(event.currentTarget.scrollLeft)}>
              <svg
                ref={svgRef}
                width={width}
                height={SVG_HEIGHT}
                viewBox={`0 0 ${width} ${SVG_HEIGHT}`}
                className="price-chart-svg"
                role="img"
                tabIndex={data.length && !loading ? 0 : -1}
                aria-label={`${productName}${intervalLabel}线${kind === 'candle' ? '蜡烛' : '价格'}图，共 ${data.length} 个记录。左右方向键查看价格，Home、End 跳至首尾。${selected ? `当前 ${selected.date}，开盘 ${selected.open} 元，最高 ${selected.high} 元，最低 ${selected.low} 元，收盘 ${selected.close} 元。` : ''}`}
                onPointerMove={updatePointer}
                onPointerDown={updatePointer}
                onPointerLeave={() => { if (document.activeElement !== svgRef.current) setShowCrosshair(false); }}
                onFocus={() => setShowCrosshair(true)}
                onBlur={() => setShowCrosshair(false)}
                onKeyDown={onKeyDown}
              >
                <defs>
                  <linearGradient id={`${gradientId}-area`} x1="0" x2="0" y1="0" y2="1">
                    <stop offset="0%" stopColor="#a990ff" stopOpacity="0.19" />
                    <stop offset="100%" stopColor="#a990ff" stopOpacity="0" />
                  </linearGradient>
                </defs>
                {ticks.map((tick, index) => <line key={index} x1="0" y1={y(tick)} x2={width} y2={y(tick)} className="price-chart-grid" />)}
                <line x1="0" y1={301} x2={width} y2={301} className="price-chart-separator" />
                {data.map((point, index) => {
                  const color = point.close > point.open ? '#f87583' : point.close < point.open ? '#39c99b' : '#7f8b9e';
                  return <g key={point.date}>
                    {kind === 'candle' && <>
                      <line x1={x(index)} y1={y(point.high)} x2={x(index)} y2={y(point.low)} stroke={color} strokeWidth="1.2" />
                      <rect x={x(index) - candleWidth / 2} y={Math.min(y(point.open), y(point.close)) - (point.open === point.close ? 0.65 : 0)} width={candleWidth} height={Math.max(1.3, Math.abs(y(point.open) - y(point.close)))} fill={color} rx={0.7} />
                    </>}
                    <rect x={x(index) - candleWidth / 2} y={VOLUME_BOTTOM - (point.count / maximumCount) * (VOLUME_BOTTOM - VOLUME_TOP)} width={candleWidth} height={Math.max(1, point.count / maximumCount * (VOLUME_BOTTOM - VOLUME_TOP))} fill={color} opacity={index === selectedIndex && showCrosshair ? 0.9 : 0.24} rx={1} />
                    {(index % labelEvery === 0 || index === data.length - 1 && index % labelEvery > labelEvery * 0.65) && <text x={x(index)} y={380} textAnchor="middle" className="price-chart-x-label">{point.date.slice(2).replaceAll('-', '/')}</text>}
                  </g>;
                })}
                {kind === 'line' && lineSegments.map((segment, index) => <g key={index}>
                  <path d={`${segment.path} L ${segment.endX} ${PLOT_BOTTOM} L ${segment.startX} ${PLOT_BOTTOM} Z`} fill={`url(#${gradientId}-area)`} />
                  <path d={segment.path} fill="none" stroke="#b19aff" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
                </g>)}
                {kind === 'line' && data.length === 1 && <circle cx={x(0)} cy={y(data[0].close)} r={3} fill="#b19aff" />}
                {latest && <line x1="0" y1={y(latest.close)} x2={width} y2={y(latest.close)} className="price-chart-last-line" />}
                {showCrosshair && selected && <g className="price-chart-crosshair" pointerEvents="none">
                  <line x1={selectedX} y1={PLOT_TOP - 10} x2={selectedX} y2={VOLUME_BOTTOM + 7} />
                  <line x1="0" y1={y(selected.close)} x2={width} y2={y(selected.close)} />
                  <circle cx={selectedX} cy={y(selected.close)} r="3.4" fill="#c3afff" stroke="#10151e" strokeWidth="1.5" />
                  <rect x={selectedX - 42} y={364} width="84" height="24" rx="4" fill="#343047" stroke="none" />
                  <text x={selectedX} y={380} textAnchor="middle" fill="#e7ddff" stroke="none" fontSize="11">{selected.date}</text>
                </g>}
              </svg>
            </div>
            <div className="price-chart-axis" aria-hidden="true">
              <span className="price-chart-axis-title">价格 / 元</span>
              {ticks.map((tick, index) => <span key={index} style={{ top: y(tick) }} className="price-chart-axis-tick">{formatPrice(tick)}</span>)}
              {latest && <span className="price-chart-current" style={{ top: y(latest.close) }}>{formatPrice(latest.close)}</span>}
              <span className="price-chart-count-label" style={{ top: VOLUME_TOP - 8 }}>报价记录</span>
              <span className="price-chart-count-value" style={{ top: VOLUME_TOP + 15 }}>{selected?.count?.toLocaleString('zh-CN') ?? '—'}</span>
            </div>
            {showCrosshair && selected && !loading && <div className="price-chart-tooltip" style={{ left: tooltipLeft, width: tooltipWidth }} aria-hidden="true">
              <div>{selected.date}<span>{intervalLabel}线</span></div>
              <dl>
                <dt>开盘</dt><dd>¥ {formatPrice(selected.open)}</dd>
                <dt>最高</dt><dd>¥ {formatPrice(selected.high)}</dd>
                <dt>最低</dt><dd>¥ {formatPrice(selected.low)}</dd>
                <dt>收盘</dt><dd className={selected.close > selected.open ? 'chart-rise' : selected.close < selected.open ? 'chart-fall' : ''}>¥ {formatPrice(selected.close)}</dd>
              </dl>
              <small>{selected.count.toLocaleString('zh-CN')} 条报价记录</small>
            </div>}
          </>
        )}
        {loading && <div className="price-chart-loading" role="status"><span />正在读取价格记录</div>}
      </div>
      <div className="price-chart-footnote">
        <span><i className="price-chart-key-up" />上涨<i className="price-chart-key-down" />下跌<span className="price-chart-footnote-divider">·</span>{intervalLabel}线以每日最低报价汇总</span>
        <span>{canScroll ? '左右滚动查看全部记录' : '移动指针查看价格'}{gapCount > 0 && ` · ${gapCount} 处数据缺口`}</span>
      </div>
    </div>
  );
}
