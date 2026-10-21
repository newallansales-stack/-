import {useEffect,useMemo,useRef,useState} from 'react';
import {CalendarDays,Download,ExternalLink,FileClock,Info,Search} from 'lucide-react';
import {historicalArchive,historicalCsv,historicalSeries,type HistoricalQuote} from '../historical-prices';
import type {Category,Interval} from '../types';
import PriceChart from './PriceChart';
import './PublicPriceArchive.css';
import './HistoricalPrices.css';

const labels={all:'全部品类',memory:'内存条',gpu:'显卡',cpu:'CPU',storage:'存储'};
const keyFor=(r:HistoricalQuote)=>`${r.productKey}:${r.quoteType}`;
const money=(v:number)=>`¥${v.toLocaleString('zh-CN',{maximumFractionDigits:2})}`;
export default function HistoricalPrices({query,onQueryChange}:{query:string;onQueryChange:(s:string)=>void}){
  const [category,setCategory]=useState<Category>('all'),[year,setYear]=useState('all'),[kind,setKind]=useState('all');
  const [page,setPage]=useState(0),[key,setKey]=useState(''),[interval,setInterval]=useState<Interval>('week');
  const chartRef=useRef<HTMLElement>(null);
  const {records,discovery}=historicalArchive;
  const dates=[...new Set(records.map(r=>r.publicationDate))].sort();
  const years=[...new Set(records.map(r=>r.publicationDate.slice(0,4)))].sort();
  const filtered=useMemo(()=>records.filter(r=>(category==='all'||r.category===category)&&(year==='all'||r.publicationDate.startsWith(year))&&(kind==='all'||r.quoteType===kind)
    &&(!query.trim()||`${r.name} ${r.reportedSpecification??''} ${r.sourceTitle} ${r.platform}`.toLowerCase().includes(query.trim().toLowerCase()))).sort((a,b)=>b.publicationDate.localeCompare(a.publicationDate)||a.name.localeCompare(b.name,'zh-CN')),[records,category,year,kind,query]);
  useEffect(()=>{setPage(0);},[category,year,kind,query]);
  useEffect(()=>{if(!filtered.some(r=>keyFor(r)===key))setKey(filtered[0]?keyFor(filtered[0]):'');},[filtered,key]);
  const selected=filtered.find(r=>keyFor(r)===key);
  // Keep every observation for the selected reported configuration; the year
  // filter narrows the list, not the definition of its recorded historical low.
  const history=records.filter(r=>keyFor(r)===key);
  const points=historicalSeries(history,interval);
  function download(type:'csv'|'json'){
    const url=URL.createObjectURL(new Blob([type==='csv'?historicalCsv():JSON.stringify(historicalArchive,null,2)],{type:type==='csv'?'text/csv;charset=utf-8':'application/json'}));
    const a=document.createElement('a');a.href=url;a.download=`chipprice-historical-articles.${type}`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
  }
  function choose(value:string){setKey(value);requestAnimationFrame(()=>chartRef.current?.scrollIntoView({behavior:'smooth',block:'start'}));}
  return <div className="public-archive historical-archive">
    <section className="archive-explanation"><FileClock size={24}/><div><h2>从旧文章找回的历史报价</h2><p>这些记录来自有明确发布时间的公开原文，保留商品卡片金额和当时的促销说明。<strong>日期是文章标示的发布日期，价格生效日期未知；它们不是成交记录，也不是今天的售价。</strong>预售、领券、开始时间等条件请打开原文核对。</p></div></section>
    <section className="archive-stat-grid">{[['历史报价',String(records.length)],['有记录的日期',`${dates.length} 天`],['最早文章',dates[0]??'暂无'],['最新文章',dates.at(-1)??'暂无']].map(([label,value])=><div className="panel" key={label}><span>{label}</span><strong>{value}</strong></div>)}</section>
    <section className="panel archive-coverage"><div><CalendarDays size={18}/><h3>免费历史资料的覆盖进度</h3></div><p>已检查 {discovery.scannedDays.toLocaleString('zh-CN')} 个新闻日历页，核查 {discovery.checkedArticles.toLocaleString('zh-CN')} 篇候选文章。只收入人民币商品卡片中的明确单件 / 单套金额；海外换算价、整机、多规格起售价、定金与主板套装价不填入单个配件。</p><p>当前覆盖 {years.join('、')||'暂无'} 年的部分日期。<strong>缺失的日子没有价格；完整逐日历史仍未补齐。</strong>同名型号可能有不同容量、条数与包装，来源规格不完整时保持未知，不自动合并。</p><div className="archive-downloads"><button className="button secondary" onClick={()=>download('csv')}><Download size={15}/>下载全部历史 CSV</button><button className="button secondary" onClick={()=>download('json')}><Download size={15}/>下载历史 JSON</button><a className="text-link" href="https://github.com/newallansales-stack/-/blob/main/docs/historical-data.md" target="_blank" rel="noreferrer">历史资料口径 <ExternalLink size={14}/></a></div></section>
    <section className="panel archive-table-panel"><div className="archive-table-heading"><h2>历史文章中的型号与金额</h2><span>{filtered.length} 条</span></div><div className="archive-filters"><label className="archive-search"><Search size={16}/><input aria-label="搜索历史报价" placeholder="搜索型号、容量、频率或平台…" value={query} onChange={e=>onQueryChange(e.target.value)}/></label><select aria-label="历史报价品类" value={category} onChange={e=>setCategory(e.target.value as Category)}>{Object.entries(labels).map(([id,label])=><option value={id} key={id}>{label}</option>)}</select><select aria-label="历史报价年份" value={year} onChange={e=>setYear(e.target.value)}><option value="all">全部年份</option>{years.map(y=><option key={y} value={y}>{y} 年</option>)}</select><select aria-label="历史报价类型" value={kind} onChange={e=>setKind(e.target.value)}><option value="all">全部文章报价</option><option value="promotion">促销 / 券后报价</option><option value="reported_listing">文章标示售价</option></select></div>
      <div className="archive-rows">{filtered.slice(page*12,(page+1)*12).map(r=><article className={`archive-row ${keyFor(r)===key?'selected':''}`} key={r.id}><div className="archive-model"><span className="archive-category">{labels[r.category]} · {r.platform} · {r.publicationDate} 文章</span><button onClick={()=>choose(keyFor(r))}>{r.name}</button>{r.reportedSpecification&&<p className="history-reported-spec">卡片说明：{r.reportedSpecification}</p>}<p>原文：{r.sourceTitle}</p><p className="history-conditions">条件：{r.conditions}</p><details><summary>展开当时的促销说明与证据</summary><p>商品卡片：{r.priceEvidence}</p>{r.articleContext&&<p>原文相关说明节选（完整条件请看原文，可能涉及多件商品）：{r.articleContext}</p>}<p>资料抓取：{new Date(r.observedAt).toLocaleString('zh-CN',{timeZone:'Asia/Shanghai',hour12:false})}（北京时间）；不代表在当年实际抓取。</p></details></div><div className="archive-quote"><strong>{money(r.price)}</strong><span>{r.quoteType==='promotion'?'历史促销记载':'文章标示售价'}</span><time>{r.publicationDate}</time><small>生效日期未知</small></div><div className="archive-links"><button className="button secondary" onClick={()=>choose(keyFor(r))}>查看记录</button><a href={r.sourceUrl} target="_blank" rel="noreferrer">打开历史原文 <ExternalLink size={12}/></a>{r.merchantUrl&&<a href={r.merchantUrl} target="_blank" rel="noreferrer">原文商品链接 <ExternalLink size={12}/></a>}</div></article>)}{!filtered.length&&<p className="archive-empty">该条件下尚未找到历史记录。</p>}</div>
      <div className="archive-pagination"><span>第 {page+1} / {Math.max(1,Math.ceil(filtered.length/12))} 页</span><button className="button secondary" disabled={!page} onClick={()=>setPage(p=>p-1)}>上一页</button><button className="button secondary" disabled={(page+1)*12>=filtered.length} onClick={()=>setPage(p=>p+1)}>下一页</button></div>
    </section>
    {selected&&<section ref={chartRef} className="panel archive-chart"><div className="archive-chart-heading"><div><span className="archive-category">同一来源规格 · 同一报价类型</span><h2>{selected.name}</h2><p>共 {history.length} 条文章记载，{new Set(history.map(r=>r.publicationDate)).size} 个日期 · 已收录金额最低 {money(Math.min(...history.map(r=>r.price)))}</p></div><div className="segmented">{[['day','日'],['week','周'],['month','月']].map(([v,label])=><button key={v} className={interval===v?'active':''} aria-pressed={interval===v} onClick={()=>setInterval(v as Interval)}>{label}线</button>)}</div></div><PriceChart points={points} interval={interval} kind="candle" productName={selected.name}/><p className="archive-kind-note"><Info size={15}/>按文章发布日期汇总金额，每周一根柱。只有原文记录的日期才有数据；这里不是每日市场成交 K 线，柱形数量也不是销量。</p></section>}
  </div>;
}
