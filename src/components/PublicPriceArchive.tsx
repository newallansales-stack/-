import { useEffect, useMemo, useRef, useState } from 'react';
import { CalendarDays, Database, Download, ExternalLink, Info, Search, ShieldCheck } from 'lucide-react';
import { archiveCsv, archiveSeries, publicArchive, quoteKindLabel, type QuoteKind, type PublicQuote } from '../public-prices';
import type { Category, Interval } from '../types';
import PriceChart from './PriceChart';
import './PublicPriceArchive.css';

const labels={all:'全部品类',memory:'内存条',gpu:'显卡',cpu:'CPU',storage:'存储'};
const money=(n:number)=>`¥${n.toLocaleString('zh-CN',{maximumFractionDigits:2})}`;
const keyFor=(q:PublicQuote)=>`${q.productId}:${q.kind}:${q.merchantUrl??''}`;
const formatTime=(value:string)=>new Date(value).toLocaleString('zh-CN',{timeZone:'Asia/Shanghai',hour12:false});
export default function PublicPriceArchive({query,onQueryChange:setQuery,onOpenHistory}:{query:string;onQueryChange:(value:string)=>void;onOpenHistory:()=>void}) {
  const [category,setCategory]=useState<Category>('all');
  const [kind,setKind]=useState<QuoteKind>('retailer_relay'),[gpuClass,setGpuClass]=useState('all');
  const [selectedKey,setSelectedKey]=useState(''),[interval,setInterval]=useState<Interval>('week');
  const [page,setPage]=useState(0),[from,setFrom]=useState('2020-01-01');
  const [to,setTo]=useState(()=>new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Shanghai',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date()));
  const [sort,setSort]=useState('model');
  const chartRef=useRef<HTMLElement>(null);
  function choose(key:string){setSelectedKey(key);window.requestAnimationFrame(()=>chartRef.current?.scrollIntoView({behavior:'smooth',block:'start'}));}
  const filtered=useMemo(()=>{
    const map=new Map(publicArchive.products.map(p=>[p.id,p]));
    const latest=new Map<string,typeof publicArchive.observations[number]>();
    for(const q of publicArchive.observations) {
      if(q.kind!==kind)continue;
      const key=`${q.productId}:${q.kind}:${q.merchantUrl??''}`,previous=latest.get(key);
      if(!previous||q.date>previous.date)latest.set(key,q);
    }
    return [...latest.values()].map(quote=>({quote,product:map.get(quote.productId)!})).filter(({quote,product})=>
      (category==='all'||product.category===category)
      && (category!=='gpu'||gpuClass==='all'||gpuClass===product.gpuClass)
      && (!query.trim()||`${product.name} ${product.fields.map(f=>f.value).join(' ')} ${quote.source}`.toLowerCase().includes(query.trim().toLowerCase()))
    ).sort((a,b)=>sort==='price-asc'?a.quote.price-b.quote.price:sort==='price-desc'?b.quote.price-a.quote.price:a.product.name.localeCompare(b.product.name,'zh-CN'));
  },[query,category,kind,gpuClass,sort]);
  useEffect(()=>{setPage(0);},[query,category,kind,gpuClass,sort]);
  useEffect(()=>{if(!filtered.some(r=>keyFor(r.quote)===selectedKey))setSelectedKey(filtered[0]?keyFor(filtered[0].quote):'');},[filtered,selectedKey]);
  const selected=filtered.find(r=>keyFor(r.quote)===selectedKey)?.product;
  const selectedQuotes=useMemo(()=>publicArchive.observations.filter(q=>keyFor(q)===selectedKey).sort((a,b)=>a.date.localeCompare(b.date)),[selectedKey]);
  const validRange=Boolean(from&&to&&from<=to&&from>='2020-01-01'&&to<=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Shanghai',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date()));
  const series=useMemo(()=>archiveSeries(validRange?selectedQuotes.filter(q=>q.date>=from&&q.date<=to):[],interval),[selectedQuotes,from,to,interval,validRange]);
  const days=[...new Set(publicArchive.observations.map(q=>q.date))].sort();
  const observedDays=new Set(selectedQuotes.map(q=>q.date)).size;
  const latest=selectedQuotes.at(-1);
  const lowest=selectedQuotes.length?Math.min(...selectedQuotes.map(q=>q.price)):null;
  const shown=filtered.slice(page*12,(page+1)*12);
  const failed=publicArchive.lastCollection.attempts.filter(a=>a.status!=='ok');
  function download(type:'csv'|'json') {
    const blob=new Blob([type==='csv'?archiveCsv():JSON.stringify(publicArchive,null,2)],{type:type==='csv'?'text/csv;charset=utf-8':'application/json'});
    const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=`chipprice-public-quotes.${type}`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
  }
  return <div className="public-archive">
    <section className="archive-explanation" aria-label="报价记录口径"><ShieldCheck size={23}/><div><h2>已收录的公开报价</h2><p>以下数字来自实际读取的来源页。<strong>转引电商报价仍需到商家核实；网站参考价不代表现在能买到。</strong>没有订单凭据，不标作成交价。采集日期不等于价格生效日期。</p></div></section>
    <div className="archive-stat-grid">{[
      ['收录型号',publicArchive.products.length.toLocaleString('zh-CN')],['报价观察记录',publicArchive.observations.length.toLocaleString('zh-CN')],['收录日期',`${days.length} 天`],['成交凭据','0 条'],
    ].map(([label,value])=><div className="panel" key={label}><span>{label}</span><strong>{value}</strong></div>)}</div>
    <section className="panel archive-coverage"><div><CalendarDays size={19}/><h3>2020 年以来的数据覆盖</h3></div><p>本页观察日期：<strong>{days[0]||'暂无'} 至 {days.at(-1)||'暂无'}</strong>。完整逐日市场价仍未取得。另已从旧文章整理部分历史报价，按文章日期单独展示；缺口没有填成估价或模拟数据。</p><small>最近采集：{formatTime(publicArchive.updatedAt)}（北京时间） · {publicArchive.lastCollection.successfulPages} 个列表页成功，{failed.length} 个失败。来源失败时保留旧记录；旧记录继续显示原采集日期。</small><div className="archive-downloads"><button className="button secondary" onClick={onOpenHistory}><CalendarDays size={15}/>查看历史文章报价</button><button className="button secondary" onClick={()=>download('csv')}><Download size={15}/>下载全部报价 CSV</button><button className="button secondary" onClick={()=>download('json')}><Database size={15}/>下载原始整理数据</button><a className="text-link" href="https://github.com/newallansales-stack/-/blob/main/docs/public-data.md" target="_blank" rel="noreferrer">查看来源与覆盖说明 <ExternalLink size={14}/></a></div></section>
    <section className="panel archive-table-panel"><div className="archive-table-heading"><h2>型号与报价记录</h2><span>{filtered.length} 条匹配结果</span></div>
      <div className="archive-filters"><label className="archive-search"><Search size={16}/><input aria-label="搜索公开报价" placeholder="搜索型号、容量、频率、条数…" value={query} onChange={e=>setQuery(e.target.value)}/></label><select aria-label="报价品类" value={category} onChange={e=>{setCategory(e.target.value as Category);setGpuClass('all');}}>{Object.entries(labels).map(([id,label])=><option key={id} value={id}>{label}</option>)}</select><select aria-label="报价口径" value={kind} onChange={e=>setKind(e.target.value as QuoteKind)}><option value="retailer_relay">转引电商报价 · 待直核</option><option value="reference">网站参考价 · 非在售价</option></select>{category==='gpu'&&<select aria-label="显卡用途" value={gpuClass} onChange={e=>setGpuClass(e.target.value)}><option value="all">全部显卡</option><option value="consumer">消费级显卡</option><option value="professional">专业显卡</option><option value="unknown">用途待核实</option></select>}<select aria-label="报价排序" value={sort} onChange={e=>setSort(e.target.value)}><option value="model">按型号排序</option><option value="price-asc">报价从低到高</option><option value="price-desc">报价从高到低</option></select></div>
      <p className="archive-kind-note"><Info size={15}/>{kind==='retailer_relay'?'转引自来源页展示的电商价格，保留明确的商品链接。尚未验证商品页对应的容量版本、库存与结算条件。':'来源站的编辑参考报价，可能长期未更新，仅用于资料核对。不会与转引电商报价混合计算。'}</p>
      <div className="archive-rows">{shown.map(({product:p,quote:q})=><article key={q.id} className={`archive-row ${keyFor(q)===selectedKey?'selected':''}`}><div className="archive-model"><span className="archive-category">{labels[p.category]}{p.category==='gpu'?` · ${p.gpuClass==='professional'?'专业卡':p.gpuClass==='consumer'?'消费级':'用途待核实'}`:''}</span><button onClick={()=>choose(keyFor(q))}>{p.name}</button><p>{p.fields.length?p.fields.map(f=>`${f.label}：${f.value}`).join(' · '):'来源列表未完整标注规格；请打开型号资料核对，未知参数未推测。'}</p></div><div className="archive-quote"><strong>{money(q.price)}</strong><span>{quoteKindLabel(q.kind)}</span><time>{q.date} 收录</time></div><div className="archive-links"><button className="button secondary" onClick={()=>choose(keyFor(q))}>查看记录</button><a href={q.sourceUrl} target="_blank" rel="noreferrer">{q.source}证据页 <ExternalLink size={12}/></a>{q.merchantUrl&&<a href={q.merchantUrl} target="_blank" rel="noreferrer">去商家核实 <ExternalLink size={12}/></a>}<a href={p.url} target="_blank" rel="noreferrer">完整型号资料 <ExternalLink size={12}/></a></div></article>)}{!shown.length&&<p className="archive-empty">该筛选条件下暂无收录报价。可以更换报价口径或品类。</p>}</div>
      <div className="archive-pagination"><span>第 {page+1} / {Math.max(1,Math.ceil(filtered.length/12))} 页</span><button className="button secondary" disabled={!page} onClick={()=>setPage(v=>v-1)}>上一页</button><button className="button secondary" disabled={(page+1)*12>=filtered.length} onClick={()=>setPage(v=>v+1)}>下一页</button></div>
    </section>
    {selected&&<section ref={chartRef} className="panel archive-chart"><div className="archive-chart-heading"><div><span className="archive-category">{quoteKindLabel(kind)} · 独立统计</span><h2>{selected.name}</h2><p>最新收录：{latest?`${money(latest.price)}（${latest.date}）`:'暂无'} · 记录内最低：{lowest===null?'暂无':money(lowest)} · 实际覆盖 {observedDays} 天</p></div><div className="segmented">{[['day','日'],['week','周'],['month','月']].map(([v,label])=><button key={v} className={interval===v?'active':''} aria-pressed={interval===v} onClick={()=>setInterval(v as Interval)}>{label}线</button>)}</div></div>
      <div className="archive-date-range"><label>开始日期<input type="date" aria-label="档案开始日期" min="2020-01-01" max={to} value={from} onChange={e=>setFrom(e.target.value)}/></label><label>结束日期<input type="date" aria-label="档案结束日期" min={from} value={to} onChange={e=>setTo(e.target.value)}/></label></div>
      {validRange?<PriceChart points={series} interval={interval} kind="candle" productName={selected.name}/>:<p role="alert">请选择从 2020 年至今天之间的有效日期区间。</p>}
      <p className="archive-kind-note"><Info size={15}/>一周一根柱，只汇总实际收录日期的同口径报价。当前只有 {observedDays} 天记录，不代表完整历史，下面的柱形统计记录数而非成交量。</p>
      <details className="archive-evidence"><summary>查看每条记录、时间和证据链接（{selectedQuotes.length} 条）</summary>{selectedQuotes.map(q=><div key={q.id}><strong>{q.date} · {money(q.price)}</strong><span>{quoteKindLabel(q.kind)} · {q.source}</span><small>抓取：{formatTime(q.observedAt)} · 库存未核实 · 生效日期未知</small><a href={q.sourceUrl} target="_blank" rel="noreferrer">来源证据 <ExternalLink size={12}/></a><p>{q.conditions}</p></div>)}</details>
    </section>}
  </div>;
}
