import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { Activity, ArrowDownRight, ArrowRight, ArrowUpDown, ArrowUpRight, BarChart3, Bell, CalendarDays, Check, ChevronDown, ChevronLeft, ChevronRight, Cpu, Database, Download, ExternalLink, FileSpreadsheet, HardDrive, Info, Layers3, LayoutDashboard, Loader2, MemoryStick, Monitor, Plus, RefreshCw, Search, ShieldCheck, Star, Upload, X } from 'lucide-react';
import PriceChart from './components/PriceChart';
import { api, downloadHref, IS_STANDALONE } from './api';
import type { Category, CollectorStatus, Dashboard, History, Interval, Mode, Offer, Product } from './types';

type Page = 'market' | 'watchlist' | 'sources';
type SortKey = 'name' | 'currentPrice' | 'changePercent' | 'lowPrice';
const categories = [
  {id: 'memory' as const, name: '内存条', en: 'MEMORY', icon: MemoryStick, color: 'violet'},
  {id: 'gpu' as const, name: '显卡', en: 'GRAPHICS', icon: Monitor, color: 'blue'},
  {id: 'cpu' as const, name: '处理器', en: 'PROCESSOR', icon: Cpu, color: 'amber'},
  {id: 'storage' as const, name: '存储', en: 'STORAGE', icon: HardDrive, color: 'teal'},
];
const emptyDashboard: Dashboard = {mode: 'demo', products: [], sources: [], summary: {productCount: 0, observationCount: 0, recordedDays: 0, earliestDate: null, latestDate: null, sourceCount: 0}};
const money = (v: number | null | undefined) => v == null ? '—' : new Intl.NumberFormat('zh-CN', {maximumFractionDigits: 2}).format(v);
const integer = (v: number) => new Intl.NumberFormat('zh-CN').format(v);
const percent = (v: number | null | undefined) => v == null ? '—' : `${v > 0 ? '+' : ''}${v.toFixed(2)}%`;
const trendClass = (v: number | null | undefined) => v == null || v === 0 ? 'neutral' : v > 0 ? 'up' : 'down';
const today = () => new Intl.DateTimeFormat('en-CA', {timeZone: 'Asia/Shanghai', year: 'numeric', month: '2-digit', day: '2-digit'}).format(new Date());
function beforeMonths(months: number) { const d = new Date(`${today()}T00:00:00Z`); d.setUTCMonth(d.getUTCMonth() - months); return d.toISOString().slice(0, 10); }
function saved<T>(key: string, fallback: T): T { try { const value = localStorage.getItem(key); return value ? JSON.parse(value) as T : fallback; } catch { return fallback; } }
function Trend({value, arrow = true}: {value: number | null | undefined; arrow?: boolean}) {
  const Icon = value && value > 0 ? ArrowUpRight : ArrowDownRight;
  return <span className={`trend ${trendClass(value)}`}>{arrow && value != null && value !== 0 && <Icon size={14}/>} {percent(value)}</span>;
}

export default function App() {
  const [page, setPage] = useState<Page>('market');
  const [mode, setMode] = useState<Mode>(() => saved<Mode>('chip-price-mode', 'demo') === 'real' ? 'real' : 'demo');
  const [category, setCategory] = useState<Category>('all');
  const [brand, setBrand] = useState('all');
  const [spec, setSpec] = useState('all');
  const [query, setQuery] = useState('');
  const [dashboardData, setDashboard] = useState<Dashboard>(emptyDashboard);
  const dashboard = dashboardData.mode === mode ? dashboardData : {...emptyDashboard, mode};
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [refresh, setRefresh] = useState(0);
  const [selectedId, setSelectedId] = useState('');
  const [history, setHistory] = useState<History | null>(null);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState('');
  const [offers, setOffers] = useState<Offer[]>([]);
  const [interval, setIntervalValue] = useState<Interval>('week');
  const [kind, setKind] = useState<'candle' | 'line'>('candle');
  const [period, setPeriod] = useState('6m');
  const [from, setFrom] = useState(beforeMonths(6));
  const [to, setTo] = useState(today());
  const [favorites, setFavorites] = useState<string[]>(() => { const value = saved<unknown>('chip-price-favorites', []); return Array.isArray(value) ? value.filter(x => typeof x === 'string') : []; });
  const [sort, setSort] = useState<{key: SortKey; direction: number}>({key: 'name', direction: 1});
  const [tablePage, setTablePage] = useState(0);
  const [importOpen, setImportOpen] = useState(false);
  const [staticInfoOpen, setStaticInfoOpen] = useState(false);
  const [notice, setNotice] = useState('');
  const [status, setStatus] = useState<CollectorStatus | null>(null);
  const [statusError, setStatusError] = useState('');
  const searchRef = useRef<HTMLInputElement>(null);
  const chartRef = useRef<HTMLElement>(null);

  useEffect(() => { try { localStorage.setItem('chip-price-mode', JSON.stringify(mode)); } catch {} }, [mode]);
  useEffect(() => { try { localStorage.setItem('chip-price-favorites', JSON.stringify(favorites)); } catch {} }, [favorites]);
  useEffect(() => { const id = window.setInterval(() => setRefresh(v => v + 1), 300000); return () => window.clearInterval(id); }, []);
  useEffect(() => { if (!notice) return; const id = window.setTimeout(() => setNotice(''), 5000); return () => window.clearTimeout(id); }, [notice]);
  useEffect(() => { const listener = (e: KeyboardEvent) => { if ((e.metaKey || e.ctrlKey) && e.key === 'k') {e.preventDefault(); searchRef.current?.focus();} }; window.addEventListener('keydown', listener); return () => window.removeEventListener('keydown', listener); }, []);
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true); setError('');
    api<Dashboard>(`/api/dashboard?mode=${mode}`, {signal: controller.signal}).then(setDashboard).catch(e => {if (e.name !== 'AbortError') {setError(e.message); setDashboard(emptyDashboard);}}).finally(() => {if (!controller.signal.aborted) setLoading(false);});
    return () => controller.abort();
  }, [mode, refresh]);
  useEffect(() => {
    const controller = new AbortController();
    api<CollectorStatus>('/api/status', {signal: controller.signal}).then(v => {setStatus(v);setStatusError('');}).catch(e => {if (e.name !== 'AbortError') setStatusError(e.message);});
    return () => controller.abort();
  }, [refresh, mode]);

  const categoryProducts = useMemo(() => dashboard.products.filter(p => category === 'all' || p.category === category), [dashboard.products, category]);
  const brands = useMemo(() => [...new Set(categoryProducts.map(p => p.brand))].sort(), [categoryProducts]);
  const specs = useMemo(() => [...new Set(categoryProducts.filter(p => brand === 'all' || p.brand === brand).map(p => p.spec))].sort(), [categoryProducts, brand]);
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return categoryProducts.filter(p => (page !== 'watchlist' || favorites.includes(p.id)) && (brand === 'all' || p.brand === brand) && (spec === 'all' || p.spec === spec) && (!q || `${p.name} ${p.brand} ${p.spec} ${p.id}`.toLowerCase().includes(q))).sort((a,b) => {
      const x = a[sort.key], y = b[sort.key];
      if (x == null) return y == null ? 0 : 1;
      if (y == null) return -1;
      return (typeof x === 'string' ? x.localeCompare(String(y), 'zh-CN') : Number(x) - Number(y)) * sort.direction;
    });
  }, [categoryProducts, page, favorites, brand, spec, query, sort]);
  useEffect(() => setTablePage(0), [category, brand, spec, query, page, mode, sort]);
  useEffect(() => { if (!filtered.some(p => p.id === selectedId)) setSelectedId(filtered[0]?.id || ''); }, [filtered, selectedId]);
  const selected = dashboard.products.find(p => p.id === selectedId);
  useEffect(() => {
    setHistory(null); setOffers([]); setHistoryError('');
    if (!selectedId) return;
    if (!from || !to || from > to || from < '2020-01-01' || to > today()) {setHistoryError('请选择 2020-01-01 至今天之间的有效日期区间。');return;}
    const controller = new AbortController();
    setHistoryLoading(true);
    const params = new URLSearchParams({mode, from, to, interval});
    Promise.all([
      api<History>(`/api/products/${encodeURIComponent(selectedId)}/history?${params}`, {signal: controller.signal}),
      api<{offers: Offer[]}>(`/api/products/${encodeURIComponent(selectedId)}/offers?mode=${mode}`, {signal: controller.signal}),
    ]).then(([h,o]) => {setHistory(h);setOffers(o.offers);}).catch(e => {if (e.name !== 'AbortError') setHistoryError(e.message);}).finally(() => {if (!controller.signal.aborted) setHistoryLoading(false);});
    return () => controller.abort();
  }, [selectedId, mode, from, to, interval, refresh]);
  function pickCategory(value: Category) { setCategory(value);setBrand('all');setSpec('all'); }
  function openImport() { if (IS_STANDALONE) setStaticInfoOpen(true); else setImportOpen(true); }
  function pickPeriod(value: string) {setPeriod(value);setTo(today());setFrom(value === 'all' ? '2020-01-01' : beforeMonths(Number(value.replace('m',''))));}
  function toggleFavorite(id: string) {setFavorites(value => value.includes(id) ? value.filter(i => i !== id) : [...value, id]);}
  function changeSort(key: SortKey) {setSort(value => ({key, direction: value.key === key ? -value.direction : 1}));}
  const shown = filtered.slice(tablePage * 8, (tablePage + 1) * 8);
  const minOffer = offers.length ? Math.min(...offers.map(o => o.price)) : null;
  const activeCategory = categories.find(c => c.id === selected?.category);
  const dateLabel = new Intl.DateTimeFormat('zh-CN', {timeZone: 'Asia/Shanghai',month: 'long', day: 'numeric', weekday: 'long'}).format(new Date());

  return <div className="app-shell">
    <a className="skip-link" href="#main-content">跳转到主内容</a>
    <aside className="sidebar">
      <a className="brand" href="#" onClick={e => {e.preventDefault();setPage('market');pickCategory('all');}} aria-label="芯价首页"><span className="brand-symbol"><Cpu size={24}/></span><span>芯价<span className="brand-en">CHIPPRICE</span></span></a>
      <div className="workspace-label">个人工作台 <span>免费版</span></div>
      <nav aria-label="主导航">
        <span className="nav-label">工作空间</span>
        <button className={`nav-item ${page === 'market' ? 'active' : ''}`} onClick={() => setPage('market')}><LayoutDashboard size={18}/>市场总览{page === 'market' && <span className="nav-active-dot"/>}</button>
        <button className={`nav-item ${page === 'watchlist' ? 'active' : ''}`} onClick={() => setPage('watchlist')}><Star size={18}/>我的自选 <span className="nav-count">{favorites.length}</span></button>
        <button className={`nav-item ${page === 'sources' ? 'active' : ''}`} onClick={() => setPage('sources')}><Database size={18}/>数据来源</button>
        <span className="nav-label second">数据管理</span>
        <button className="nav-item" onClick={openImport}><Upload size={18}/>导入历史记录</button>
        <a className={`nav-item ${!dashboard.products.length ? 'disabled' : ''}`} href={downloadHref(`/api/export?mode=${mode}`)} download={IS_STANDALONE ? `chipprice-${mode}-daily-minima.csv` : undefined} onClick={e => {if (!dashboard.products.length) e.preventDefault();}} aria-disabled={!dashboard.products.length}><Download size={18}/>导出价格数据</a>
      </nav>
      <div className="sidebar-bottom">
        <div className="sidebar-note"><Layers3 size={22}/><strong>让价格有迹可循</strong><p>追踪每一次波动，<br/>发现更合适的入手时机。</p><button onClick={() => setPage('sources')}>了解数据口径 <ArrowRight size={14}/></button></div>
        <div className="sidebar-user"><span className="avatar">观</span><span>硬件观察者<small>{IS_STANDALONE ? "在线展示版" : "本地价格数据库"}</small></span><ShieldCheck size={17}/></div>
      </div>
    </aside>

    <div className="main-shell">
      <header className="topbar"><div className="breadcrumb"><span>工作台</span><ChevronRight size={14}/><strong>{page === 'market' ? '市场总览' : page === 'watchlist' ? '我的自选' : '数据来源'}</strong></div><div className="topbar-actions"><label className="global-search"><Search size={16}/><input ref={searchRef} placeholder="搜索型号、品牌或规格…" aria-label="搜索型号、品牌或规格" value={query} onChange={e => {setQuery(e.target.value);if (page === 'sources') setPage('market');}}/><kbd>⌘ K</kbd></label><button className="icon-button" title="查看数据更新状态" aria-label="查看数据更新状态" onClick={() => setPage('sources')}><Bell size={18}/><span className={`notification-dot ${status?.collector.configured ? 'connected' : ''}`}/></button><span className="avatar small">观</span></div></header>
      <main id="main-content" className="main-content">
        <div className="page-heading"><div><div className="eyebrow"><span className="live-dot"/> HARDWARE MARKET OBSERVATORY</div><h1>{page === 'market' ? '硬件行情，一目了然' : page === 'watchlist' ? '关注你的下一次升级' : '每一个价格，都有出处'}<span className="heading-dot">.</span></h1><p>{page === 'sources' ? '了解数据覆盖范围、采集状态与历史价格的计算方式。' : '内存、显卡、处理器与存储，持续记录价格的每一次变化。'}</p></div><div className="heading-actions"><span className="today"><CalendarDays size={15}/>{dateLabel}</span><button className="button secondary" onClick={openImport}><Plus size={16}/>导入数据</button></div></div>

        <div className={`data-banner ${mode === 'demo' ? 'demo' : 'real'}`}><div><span className="banner-icon">{mode === 'demo' ? <Info size={17}/> : <ShieldCheck size={17}/>}</span><span><strong>{mode === 'demo' ? '演示工作区' : '真实记录工作区'}</strong><span className="banner-detail">{mode === 'demo' ? '当前价格为模拟数据，用于体验看板；不代表真实市场行情。' : '仅展示已导入或采集的真实记录；缺失日期保持为空。'}</span></span></div><div className="mode-switch" aria-label="数据工作区"><button className={mode === 'demo' ? 'active' : ''} aria-pressed={mode === 'demo'} onClick={() => setMode('demo')}>演示数据</button><button className={mode === 'real' ? 'active' : ''} aria-pressed={mode === 'real'} onClick={() => setMode('real')}>真实记录</button></div></div>
        {IS_STANDALONE && <div className="hosted-notice"><span><ShieldCheck size={15}/> 免费在线展示版 · 快照日期 {dashboard.summary.latestDate || '读取中'} · 导出内容为每日最低价</span><a href="./index.html" download="芯价看板.html"><Download size={14}/>保存离线看板</a></div>}
        {error && <div className="error-banner" role="alert">{error}<button onClick={() => setRefresh(v => v + 1)}>重新加载</button></div>}

        {page !== 'sources' ? <>
          <section className="category-grid" aria-label="按硬件品类筛选">{categories.map(c => {
            const products = dashboard.products.filter(p => p.category === c.id);
            const prices = products.filter(p => p.changePercent != null);
            const average = prices.length ? prices.reduce((sum,p) => sum + (p.changePercent || 0), 0) / prices.length : null;
            const Icon = c.icon;
            return <button key={c.id} className={`category-card ${category === c.id ? 'selected' : ''} ${c.color}`} aria-pressed={category === c.id} onClick={() => pickCategory(category === c.id ? 'all' : c.id)}><div className="category-top"><span className={`category-icon ${c.color}`}><Icon size={20}/></span><span className="category-en">{c.en}</span><ArrowUpRight size={15} className="category-arrow"/></div><div className="category-bottom"><div><h2>{c.name}</h2><p><strong>{loading ? '—' : products.length}</strong> 款在库型号</p></div><div className="category-change"><Trend value={average}/><small>最新两日均变动</small></div></div>{category === c.id && <span className="category-selected-line"/>}</button>;
          })}</section>

          <div className="section-heading"><div className="section-title"><Activity size={18}/><h2>{page === 'watchlist' ? '自选行情' : '价格观察'}</h2><span className="tag subtle">CNY / 人民币</span></div><span className="update-note"><span className="live-dot"/>{loading ? '正在读取记录' : dashboard.summary.latestDate ? `最新记录 ${dashboard.summary.latestDate}` : '等待导入记录'}<button className="icon-button compact" aria-label="刷新价格记录" onClick={() => setRefresh(v => v + 1)}><RefreshCw size={13} className={loading ? 'spin' : ''}/></button></span></div>
          {selected ? <div className="analysis-grid">
            <section className="panel chart-panel" ref={chartRef} aria-label="价格走势图">
              <div className="chart-heading"><div className="selected-product"><span className={`product-icon ${activeCategory?.color}`}>{activeCategory && <activeCategory.icon size={23}/>}</span><div><div className="product-title"><h2>{selected.name}</h2><span className="tag">{activeCategory?.name}</span><button className={`star-button ${favorites.includes(selected.id) ? 'starred' : ''}`} aria-label={`${favorites.includes(selected.id) ? '取消关注' : '关注'} ${selected.name}`} aria-pressed={favorites.includes(selected.id)} onClick={() => toggleFavorite(selected.id)}><Star size={17}/></button></div><p>{selected.brand} <span>·</span> {selected.spec}</p></div></div><a className="icon-button" aria-label="导出当前型号历史记录" title="导出当前型号历史记录" href={downloadHref(`/api/export?mode=${mode}&productId=${encodeURIComponent(selected.id)}`)} download={IS_STANDALONE ? `${selected.id}-daily-minima.csv` : undefined}><Download size={17}/></a></div>
              <div className="quote-row"><div><span className="quote-label">最新记录最低价</span><div className="main-quote"><span className="currency">¥</span>{money(selected.currentPrice)}<Trend value={selected.changePercent}/></div></div><div className="quote-meta"><div><span>记录内历史最低</span><strong className="down">¥{money(selected.lowPrice)}</strong></div><div><span>最低价日期</span><strong>{selected.lowDate || '—'}</strong></div></div></div>
              <div className="chart-toolbar"><div className="segmented" aria-label="图表周期">{(['day','week','month'] as const).map(v => <button key={v} className={interval === v ? 'active' : ''} aria-pressed={interval === v} onClick={() => setIntervalValue(v)}>{v === 'day' ? '日线' : v === 'week' ? '周线' : '月线'}</button>)}</div><div className="periods" aria-label="时间范围">{[['1m','1个月'],['3m','3个月'],['6m','6个月'],['12m','1年'],['all','全部']].map(([v,label]) => <button key={v} className={period === v ? 'active' : ''} aria-pressed={period === v} onClick={() => pickPeriod(v)}>{label}</button>)}</div><div className="chart-kind segmented"><button className={kind === 'candle' ? 'active' : ''} aria-label="K线图" title="K线图" aria-pressed={kind === 'candle'} onClick={() => setKind('candle')}><BarChart3 size={16}/></button><button className={kind === 'line' ? 'active' : ''} aria-label="折线图" title="折线图" aria-pressed={kind === 'line'} onClick={() => setKind('line')}><Activity size={16}/></button></div></div>
              {historyError ? <div className="chart-error" role="alert"><Info size={20}/><p>{historyError}</p><button className="button secondary" onClick={() => pickPeriod('6m')}>重置日期</button></div> : <PriceChart points={history?.points || []} interval={interval} kind={kind} loading={historyLoading} productName={selected.name}/>}
              <div className="chart-footer"><span><span className="legend-dot violet"/> 每日跨来源最低价的{interval === 'week' ? '周' : interval === 'month' ? '月' : '日'}线</span><div className="date-range"><input type="date" aria-label="开始日期" min="2020-01-01" max={to} value={from} onChange={e => {setPeriod('custom');setFrom(e.target.value);}}/><ArrowRight size={12}/><input type="date" aria-label="结束日期" min={from} max={today()} value={to} onChange={e => {setPeriod('custom');setTo(e.target.value);}}/></div></div>
            </section>
            <aside className="detail-column">
              <section className="panel buying-panel"><div className="small-panel-heading"><h3>价格位置</h3><span className="tag green">{mode === 'demo' ? '演示' : '记录内'}</span></div><div className="position-label">距记录内历史最低</div><div className="position-value">{selected.currentPrice != null && selected.lowPrice ? <>{((selected.currentPrice / selected.lowPrice - 1) * 100).toFixed(1)}<span>%</span><ArrowUpRight size={22}/></> : '—'}</div><div className="price-range"><span/><i style={{left: `${Math.min(95, Math.max(5, selected.currentPrice && selected.lowPrice ? (selected.currentPrice / selected.lowPrice - 1) * 100 : 5))}%`}}/></div><div className="range-labels"><span>历史低位</span><span>高于低价</span></div><div className="buying-note"><Info size={14}/><span>以已记录价格为准，{mode === 'demo' ? '演示数据仅供体验。' : '不代表全网历史最低。'}</span></div></section>
              <section className="panel offers-panel"><div className="small-panel-heading"><h3>最新报价</h3><span className="muted">{offers.length} 个来源</span></div><p className="panel-caption">{selected.updatedAt || '—'} · 按价格排序</p><div className="offers-list">{offers.length ? [...offers].sort((a,b) => a.price - b.price).slice(0,5).map((offer,i) => <div className="offer" key={`${offer.source}-${i}`}><span className={`source-logo logo-${i % 4}`}>{offer.source.slice(0,1)}</span><div className="offer-name"><strong>{offer.source}</strong><small>{offer.date}</small></div><div className="offer-value"><strong>¥{money(offer.price)}</strong>{offer.price === minOffer && <span>最低报价</span>}</div>{offer.url && /^https:\/\//i.test(offer.url) && <a href={offer.url} target="_blank" rel="noreferrer" className="offer-link" aria-label={`打开${offer.source}报价来源`}><ExternalLink size={13}/></a>}</div>) : <p className="muted">暂无来源报价</p>}</div></section>
              <div className="coverage-note"><ShieldCheck size={17}/><div><strong>尊重真实数据的边界</strong><p>{history ? `所选区间 ${history.coverage.observedDays} / ${history.coverage.expectedDays} 天有记录` : '正在读取覆盖情况'}<br/>{history?.coverage.missingDays ? `缺失 ${history.coverage.missingDays} 天，保持为空` : '统计区间从型号上市日开始'}</p></div></div>
            </aside>
          </div> : <section className="panel empty-state">{loading ? <Loader2 className="spin" size={30}/> : page === 'watchlist' && !favorites.length ? <Star size={36}/> : <Database size={36}/>}<h2>{loading ? '正在读取价格数据库' : page === 'watchlist' && !favorites.length ? '把想买的硬件放进自选' : mode === 'real' && !dashboard.products.length ? (IS_STANDALONE ? '真实历史数据尚未发布' : '从第一条真实价格开始') : '没有找到匹配的型号'}</h2><p>{loading ? '首次启动会准备演示记录，请稍候。' : page === 'watchlist' && !favorites.length ? '点击型号旁的星标，集中观察它们的价格变化。' : mode === 'real' && !dashboard.products.length ? (IS_STANDALONE ? '当前网站仅发布演示数据；真实价格需要经验证的数据源与独立采集服务。' : '支持导入 2020 年起的 CSV 历史记录，已有日期不会自动补齐。') : '试试其他关键词，或清除品牌和规格筛选。'}</p>{!loading && <button className="button primary" onClick={() => {if (mode === 'real' && !dashboard.products.length) {if (IS_STANDALONE) setPage('sources'); else openImport();}else {setPage('market');setQuery('');pickCategory('all');}}}>{mode === 'real' && !dashboard.products.length ? <>{IS_STANDALONE ? <Database size={16}/> : <Upload size={16}/>} {IS_STANDALONE ? '查看数据来源' : '导入历史数据'}</> : '浏览全部型号'}</button>}</section>}

          <section className="panel market-table-panel" aria-label="硬件价格列表"><div className="table-top"><div className="section-title"><h2>{page === 'watchlist' ? '我的关注' : '市场行情'}</h2><span className="count-badge">{filtered.length}</span></div><div className="table-filters"><label className="select-wrap"><select aria-label="选择品类" value={category} onChange={e => pickCategory(e.target.value as Category)}><option value="all">全部品类</option>{categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select><ChevronDown size={13}/></label><label className="select-wrap"><select aria-label="选择品牌" value={brand} onChange={e => {setBrand(e.target.value);setSpec('all');}}><option value="all">全部品牌</option>{brands.map(v => <option key={v}>{v}</option>)}</select><ChevronDown size={13}/></label><label className="select-wrap spec-select"><select aria-label="选择规格" value={spec} onChange={e => setSpec(e.target.value)}><option value="all">全部规格</option>{specs.map(v => <option key={v}>{v}</option>)}</select><ChevronDown size={13}/></label></div></div>
            <div className="table-scroll"><table><thead><tr><th className="star-cell"><Star size={13}/></th><th><button onClick={() => changeSort('name')}>产品型号 <ArrowUpDown size={12}/></button></th><th>规格</th><th className="right"><button onClick={() => changeSort('currentPrice')}>最新最低价 <ArrowUpDown size={12}/></button></th><th className="right"><button onClick={() => changeSort('changePercent')}>较上次记录 <ArrowUpDown size={12}/></button></th><th className="right"><button onClick={() => changeSort('lowPrice')}>历史最低价 <ArrowUpDown size={12}/></button></th><th>最新来源</th><th className="right">查看</th></tr></thead><tbody>{shown.map(p => {const c = categories.find(c => c.id === p.category)!;const Icon = c.icon; return <tr key={p.id} className={p.id === selectedId ? 'selected' : ''}><td className="star-cell"><button className={`star-button ${favorites.includes(p.id) ? 'starred' : ''}`} aria-label={`${favorites.includes(p.id) ? '取消关注' : '关注'} ${p.name}`} aria-pressed={favorites.includes(p.id)} onClick={() => toggleFavorite(p.id)}><Star size={16}/></button></td><td><button className="table-product" onClick={() => {setSelectedId(p.id);chartRef.current?.scrollIntoView({behavior: 'smooth',block: 'start'});}}><span className={`table-product-icon ${c.color}`}><Icon size={18}/></span><span><strong>{p.name}</strong><small>{p.brand} <span className="table-category">{c.name}</span></small></span></button></td><td><span className="spec-text">{p.spec}</span></td><td className="right price-cell">¥{money(p.currentPrice)}</td><td className="right"><Trend value={p.changePercent} arrow={false}/></td><td className="right low-cell">¥{money(p.lowPrice)}<small>{p.lowDate || '—'}</small></td><td><span className="table-source">{p.source || '—'}</span></td><td className="right"><button className="row-open" aria-label={`查看${p.name}价格走势`} onClick={() => {setSelectedId(p.id);chartRef.current?.scrollIntoView({behavior:'smooth',block:'start'});}}><ArrowUpRight size={17}/></button></td></tr>;})}{!shown.length && <tr><td colSpan={8} className="table-empty">{loading ? '正在加载…' : '暂无匹配记录'}</td></tr>}</tbody></table></div>
            <div className="table-bottom"><span>共 {filtered.length} 个型号{filtered.length ? `，显示 ${tablePage * 8 + 1}–${Math.min((tablePage + 1) * 8, filtered.length)}` : ''}<span className="table-bottom-tip">点击型号查看走势</span></span><div className="pagination"><button className="icon-button" aria-label="上一页" disabled={tablePage === 0} onClick={() => setTablePage(v => Math.max(0,v - 1))}><ChevronLeft size={16}/></button><span>{tablePage + 1} / {Math.max(1,Math.ceil(filtered.length / 8))}</span><button className="icon-button" aria-label="下一页" disabled={(tablePage + 1) * 8 >= filtered.length} onClick={() => setTablePage(v => v + 1)}><ChevronRight size={16}/></button></div></div>
          </section>
        </> : <SourcesPage dashboard={dashboard} mode={mode} status={status} error={statusError} onImport={openImport} onRefresh={() => setRefresh(v => v + 1)}/>}
        <footer className="page-footer"><span><span className="footer-mark"><Cpu size={13}/></span> 芯价 · 为每一次理性升级</span><span>价格单位 CNY <span className="footer-divider">/</span> 北京时间 UTC+8 <span className="footer-divider">/</span> {mode === 'demo' ? '模拟行情，仅供体验' : '价格以来源记录为准'}</span></footer>
      </main>
    </div>
    {importOpen && <ImportDialog onClose={() => setImportOpen(false)} onImported={message => {setMode('real');setRefresh(v => v + 1);setNotice(message);setImportOpen(false);setQuery('');pickCategory('all');setPage('market');}}/>}
    {staticInfoOpen && <StandaloneInfoDialog onClose={() => setStaticInfoOpen(false)}/>}
    {notice && <div className="toast" role="status"><Check size={18}/>{notice}<button aria-label="关闭提示" onClick={() => setNotice('')}><X size={14}/></button></div>}
  </div>;
}

function SourcesPage({dashboard, mode, status, error, onImport, onRefresh}: {dashboard: Dashboard; mode: Mode; status: CollectorStatus | null; error: string; onImport: () => void; onRefresh: () => void}) {
  const summary = dashboard.summary;
  return <div className="sources-page">
    <section className="source-stats">{[{label:'在库型号', value:integer(summary.productCount), icon:Cpu}, {label:'价格观测记录',value:integer(summary.observationCount),icon:Database}, {label:'有记录的日期',value:integer(summary.recordedDays),icon:CalendarDays}, {label:'报价来源',value:integer(summary.sourceCount),icon:Layers3}].map(s => <div className="panel source-stat" key={s.label}><s.icon size={20}/><span>{s.label}</span><strong>{s.value}</strong></div>)}</section>
    <div className="sources-grid"><section className="panel source-list"><div className="small-panel-heading"><h2>已接入的记录来源</h2><span className={`tag ${mode === 'demo' ? '' : 'green'}`}>{mode === 'demo' ? '演示数据' : '真实记录'}</span></div><p className="muted">{summary.earliestDate ? `${summary.earliestDate} 至 ${summary.latestDate}` : '尚未导入真实价格数据'} · 仅统计实际有记录的日期</p>{dashboard.sources.length ? <div className="source-rows">{dashboard.sources.map((s,i) => <div className="source-row" key={s.name}><span className={`source-logo logo-${i % 4}`}>{s.name.slice(0,1)}</span><div><strong>{s.name}</strong><p>{integer(s.observationCount)} 条记录</p></div><span className="source-row-date">最新 {s.latestDate}</span><span className="tag">{mode === 'demo' ? '模拟' : '已入库'}</span></div>)}</div> : <div className="empty-source"><FileSpreadsheet size={35}/><h3>等待第一份真实数据</h3><p>导入你有权使用的价格记录，保留日期和来源。</p><button className="button primary" onClick={onImport}><Upload size={16}/>导入 CSV</button></div>}</section>
    <section className="panel collector-panel"><div className="small-panel-heading"><h2>{IS_STANDALONE ? '数据更新方式' : '每日采集'}</h2><button className="icon-button" onClick={onRefresh} aria-label="刷新采集状态"><RefreshCw size={16}/></button></div>{error ? <p className="error-text" role="alert">{error}</p> : <><span className={`collector-badge ${status?.collector.configured ? 'configured' : ''}`}><span className="live-dot"/>{IS_STANDALONE ? '发布时的价格快照' : status?.collector.configured ? '已配置数据源' : '尚未配置数据源'}</span><p>{IS_STANDALONE ? '当前为独立展示版，图表不依赖临时服务器；更新随网站重新发布，不在浏览器中采集价格。' : '配置获授权的 HTTPS 价格接口后，可每日自动同步到真实记录工作区。'}</p><dl className="collector-details"><div><dt>时区</dt><dd>Asia/Shanghai</dd></div><div><dt>计划</dt><dd>{status?.collector.schedule || '每日 09:00'}</dd></div><div><dt>上次执行</dt><dd>{status?.collector.lastRunAt ? new Date(status.collector.lastRunAt).toLocaleString('zh-CN',{timeZone:'Asia/Shanghai'}) : '尚未执行'}</dd></div><div><dt>执行结果</dt><dd>{status?.collector.lastStatus || '等待数据源'}</dd></div></dl>{status?.collector.lastError && <p className="error-text">{status.collector.lastError}</p>}<div className="inline-info"><Info size={16}/><span>{IS_STANDALONE ? '在线导入与自动采集需要另行部署完整版；当前不会将演示价格当作真实行情。' : '配置接口与运行采集服务的步骤见项目 README。配置状态不代表进程正在运行。'}</span></div></>}</section></div>
    <section className="panel methodology"><div className="small-panel-heading"><h2>我们如何计算价格</h2><span className="tag">透明数据口径</span></div><div className="method-grid"><div><span className="method-number">01</span><h3>同规格，才可比较</h3><p>每个型号独立记录品牌、容量、频率、接口等规格。同一天多个来源的报价取最低值；优惠券、二手成色等差异应在型号或来源中明确区分。</p></div><div><span className="method-number">02</span><h3>一周，一根 K 线</h3><p>每周一开始：首个有记录日为开盘价，末日为收盘价；最高、最低取当周每日最低报价。下方柱形表示报价记录数量，不是成交量。</p></div><div><span className="method-number">03</span><h3>记录缺口，如实保留</h3><p>支持 2020 年起的历史记录，上市之前不计入覆盖率。缺失日期不会填成零或推算；“历史最低”仅指已收录记录的最低价。</p></div></div></section>
    <section className="panel public-sources"><div className="small-panel-heading"><h2>公开数据源调查</h2><span className="tag">已核查 · 2026-10-20</span></div><div className="inline-info"><Info size={17}/><span>已读取候选项目的数据文件、接口实现及许可证。目前未找到可验证的、2020 年起完整逐日中国全网价格；以下来源的覆盖范围各不相同。</span></div><div className="research-cards">{[
      {name:'PC Part Dataset', url:'https://github.com/docyx/pc-part-dataset', tag:'MIT · 可下载', detail:'28,063 条 CPU / 内存 / 显卡 / 存储产品记录。2025-07-23 美元快照，可参考型号规格，不能作为人民币每日历史价。', kind:'green'},
      {name:'骨价 · guidajia', url:'https://github.com/xulicheng1224-arch/guidajia', tag:'MIT · 采集代码', detail:'包含京东与淘宝官方 API 接入实现；没有公开历史价格数据库。需申请应用权限，适合接入后积累真实报价。', kind:''},
      {name:'HW Price Tracker', url:'https://github.com/1742264121/hw-price-tracker', tag:'未作为真实源', detail:'只有 2026 年部分日期；部分文件明确标记模拟数据，未找到许可证，真实性与再分发权限尚未确认。', kind:''},
      {name:'中国电商价格接口', url:'https://union.jd.com/openplatform', tag:'待验证授权', detail:'京东联盟与淘宝联盟主要提供当前商品报价，不能据此承诺逐日回溯。当前环境对这些站点的访问受网络策略限制。', kind:''},
    ].map(s => <a className="research-card" href={s.url} key={s.name} target="_blank" rel="noreferrer"><div><strong>{s.name}</strong><ExternalLink size={14}/></div><span className={`tag ${s.kind}`}>{s.tag}</span><p>{s.detail}</p></a>)}</div><p className="muted">更完整的来源、固定提交与核查证据见项目 docs/research.md。模拟报价未导入真实记录。</p></section>
  </div>;
}

function StandaloneInfoDialog({onClose}: {onClose: () => void}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {const dialog = ref.current;dialog?.showModal();return () => dialog?.close();}, []);
  return <dialog ref={ref} className="import-dialog standalone-dialog" aria-labelledby="standalone-title" onCancel={onClose} onClick={e => {if (e.target === e.currentTarget) onClose();}}><div className="modal-header"><span className="modal-icon"><Database size={23}/></span><button className="icon-button" onClick={onClose} aria-label="关闭展示版说明"><X size={20}/></button></div><h2 id="standalone-title">当前为免费在线展示版</h2><p className="modal-description">查看图表、筛选型号和管理自选都可以直接使用。在线导入、共享数据库与定时采集需要另行运行完整版。</p><div className="inline-info"><Info size={17}/><span>这里展示发布时生成的演示快照。完整应用代码已保留，不会把导入记录或密钥包含在公开网页中。</span></div><div className="modal-footer"><a className="button secondary" href="https://github.com/newallansales-stack/-#readme" target="_blank" rel="noreferrer"><ExternalLink size={15}/>查看完整版说明</a><button className="button primary" onClick={onClose}>继续查看行情</button></div></dialog>;
}

function ImportDialog({onClose, onImported}: {onClose: () => void; onImported: (message: string) => void}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [csv, setCsv] = useState('');
  const [fileName, setFileName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [dragging, setDragging] = useState(false);
  const [acknowledged, setAcknowledged] = useState(false);
  useEffect(() => {const dialog = dialogRef.current;dialog?.showModal();return () => dialog?.close();}, []);
  async function readFile(file?: File) {
    if (!file) return;
    setError('');
    if (!/\.csv$/i.test(file.name)) {setError('请选择 CSV 文件。Excel 表格可另存为 CSV UTF-8 后导入。');return;}
    if (file.size > 5 * 1024 * 1024) {setError('单次文件上限为 5 MB，请分批导入。');return;}
    try {setCsv(await file.text());setFileName(file.name);} catch {setError('无法读取文件，请重新选择。');}
  }
  async function submit(e: FormEvent) {
    e.preventDefault(); if (!csv.trim() || !acknowledged || busy) return;
    setBusy(true);setError('');
    try {
      const result = await api<{imported: number; updated: number; skipped?: number; message?: string}>('/api/import', {method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({csv})});
      onImported(`导入完成：新增 ${result.imported} 条，更新 ${result.updated} 条${result.skipped ? `，未变 ${result.skipped} 条` : ''}。`);
    } catch (e) {setError(e instanceof Error ? e.message : '导入失败，请检查 CSV 格式。');} finally {setBusy(false);}
  }
  return <dialog ref={dialogRef} className="import-dialog" onCancel={e => {if (busy) e.preventDefault();else onClose();}} onClick={e => {if (e.target === e.currentTarget && !busy) onClose();}} aria-labelledby="import-title"><form onSubmit={submit}><div className="modal-header"><span className="modal-icon"><Upload size={23}/></span><button type="button" className="icon-button" onClick={onClose} disabled={busy} aria-label="关闭导入窗口"><X size={20}/></button></div><h2 id="import-title">把历史价格，带进看板</h2><p className="modal-description">导入 2020 年起的真实价格记录，自动生成每日行情与周 K 线。</p><div className="import-guide"><span><FileSpreadsheet size={16}/> UTF-8 CSV · 最大 5 MB</span><a href={downloadHref("/api/import/template")} className="text-link"><Download size={14}/>下载格式模板</a></div><div className={`upload-area ${dragging ? 'dragging' : ''}`} onDragOver={e => {e.preventDefault();setDragging(true);}} onDragLeave={() => setDragging(false)} onDrop={e => {e.preventDefault();setDragging(false);void readFile(e.dataTransfer.files[0]);}}><Upload size={27}/><strong>{fileName || '拖放文件到这里，或点击选择'}</strong><span>{fileName ? `已读取 ${integer(csv.length)} 个字符` : 'Excel 文件请先另存为 CSV UTF-8'}</span><button type="button" className="button secondary" onClick={() => inputRef.current?.click()} disabled={busy}>{fileName ? '重新选择文件' : '选择 CSV 文件'}</button><input ref={inputRef} type="file" accept=".csv,text/csv" hidden onChange={e => void readFile(e.target.files?.[0])}/></div><label className="csv-label" htmlFor="csv-content">或直接粘贴 CSV 内容 <span>包含表头</span></label><textarea id="csv-content" className="csv-textarea" value={csv} onChange={e => {setCsv(e.target.value);setFileName('');}} placeholder={'product_id,category,brand,name,spec,release_date,date,price,source,url\n…'} spellCheck={false}/><div className="import-rules"><ShieldCheck size={16}/><p>按型号、来源与日期去重。格式有误时整批拒绝，保留原有记录；不会覆盖演示数据。</p></div><label className="acknowledge"><input type="checkbox" checked={acknowledged} onChange={e => setAcknowledged(e.target.checked)}/><span>我确认导入的是有权使用的真实报价，模板样例不作为真实行情。</span></label>{error && <div className="import-error" role="alert"><Info size={16}/>{error}</div>}<div className="modal-footer"><button type="button" className="button secondary" disabled={busy} onClick={onClose}>取消</button><button type="submit" className="button primary" disabled={busy || !csv.trim() || !acknowledged}>{busy ? <Loader2 size={16} className="spin"/> : <Upload size={16}/>} {busy ? '正在导入…' : '导入真实记录'}</button></div></form></dialog>;
}
