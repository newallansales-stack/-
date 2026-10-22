import {useEffect, useMemo, useRef, useState} from 'react';
import {ArrowRight, Plus, Search, Star, X} from 'lucide-react';
import type {Product} from '../types';
import {priceBasis} from '../market';
import './Watchlist.css';

type Props = {products: Product[]; favorites: string[]; onToggle: (id:string)=>void; onOpen: (product:Product)=>void; loading: boolean; query:string; onQueryChange:(query:string)=>void};
const labels = {memory:'内存条',gpu:'显卡',cpu:'处理器',storage:'存储'};
const matches = (product: Product, query: string) => `${product.name} ${product.brand} ${product.spec} ${product.id} ${product.profile?.fields.map(f=>`${f.label} ${f.value}`).join(' ')||''}`.toLowerCase().includes(query.trim().toLowerCase());
function Quote({product}:{product:Product}) {
  return <div className="watchlist-quote"><strong>{product.currentPrice == null ? '报价待核验' : `¥${product.currentPrice.toLocaleString('zh-CN')}`}</strong><span>{priceBasis(product)} · {product.updatedAt||'暂无价格日期'}</span></div>;
}
export default function Watchlist({products,favorites,onToggle,onOpen,loading,query,onQueryChange:setQuery}:Props) {
  const [adding,setAdding] = useState(false);
  const saved = useMemo(()=>products.filter(p=>favorites.includes(p.id)),[products,favorites]);
  const shown = saved.filter(p=>matches(p,query));
  const missing = favorites.filter(id=>!products.some(p=>p.id===id));
  return <section className="watchlist-workspace" aria-label="自选管理">
    <div className="panel watchlist-toolbar"><div><h2><Star size={20}/>我的自选 <span className="count-badge">{favorites.length}</span></h2><p>点“添加自选”搜索市场总览型号，点“加入自选”收藏；也可在市场总览点击星标。自选保存在当前浏览器，同一浏览器再次打开会保留。</p></div><button className="button primary" onClick={()=>setAdding(true)}><Plus size={17}/>添加自选</button>
      <label className="catalog-search"><Search size={17}/><input type="search" aria-label="搜索我的自选" placeholder="搜索已收藏的型号、品牌、容量或频率…" value={query} onChange={e=>setQuery(e.target.value)}/>{query&&<button aria-label="清除自选搜索" onClick={()=>setQuery('')}><X size={15}/></button>}</label>
      <span className="watchlist-search-count">{query ? `找到 ${shown.length} 个匹配的自选型号` : `已收藏 ${saved.length} 个可查看型号`} · 公开报价、历史资料与导入一同显示</span>
    </div>
    {shown.length ? <div className="watchlist-cards">{shown.map(product=><article className="panel watchlist-card" key={product.id} data-watchlist-id={product.id}><div className="watchlist-card-heading"><span className="tag">{labels[product.category]}</span><button className="watchlist-remove" onClick={()=>onToggle(product.id)} aria-label={`移出自选 ${product.name}`}><Star size={15} fill="currentColor"/>移出自选</button></div><h3>{product.name}</h3><p>{product.spec}</p><dl className="spec-chips">{product.profile?.fields.slice(0,5).map(f=><div key={f.key}><dt>{f.label}</dt><dd>{f.value}</dd></div>)}</dl><Quote product={product}/><button className="button secondary watchlist-open" onClick={()=>onOpen(product)}>查看走势与详情<ArrowRight size={15}/></button></article>)}</div> : <div className="panel watchlist-empty"><Star size={35}/><h3>{loading ? '正在读取可选型号…' : saved.length ? '没有匹配的自选' : '还没有自选型号'}</h3><p>{saved.length ? '可以更换关键词，或添加其他型号。' : '点击下方按钮，搜索想关注的硬件，再点“加入自选”。'}</p><button className="button primary" onClick={()=>setAdding(true)}><Plus size={16}/>搜索并添加自选</button>{query&&<button className="text-link" onClick={()=>setQuery('')}>清除搜索</button>}</div>}
    {missing.length>0&&<div className="panel watchlist-unavailable"><h3>暂不可用的自选 · {missing.length}</h3><p>这些旧型号标识不在当前发布数据里；保留收藏供以后恢复，也可以移除。</p>{missing.map(id=><div key={id}><code>{id}</code><button onClick={()=>onToggle(id)} aria-label={`移除不可用自选 ${id}`}>移除</button></div>)}</div>}
    {adding&&<AddFavorites products={products} favorites={favorites} onToggle={onToggle} onClose={()=>setAdding(false)} loading={loading}/>}
  </section>;
}
function AddFavorites({products,favorites,onToggle,onClose,loading}:Pick<Props,'products'|'favorites'|'onToggle'|'loading'>&{onClose:()=>void}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [query,setQuery] = useState('');
  const [category,setCategory] = useState('all');
  const [limit,setLimit] = useState(12);
  useEffect(()=>{dialog.current?.showModal();},[]);
  useEffect(()=>setLimit(12),[query,category]);
  const found = products.filter(p=>(category==='all'||p.category===category)&&matches(p,query));
  return <dialog className="modal add-favorites-dialog" ref={dialog} aria-labelledby="add-favorites-title" onCancel={onClose}><header className="modal-header"><div><h2 id="add-favorites-title">搜索并添加自选</h2><p>搜索市场总览的公开报价、历史资料与规格目录型号，点击“加入自选”。不同容量、套装和报价类型独立收藏。</p></div><button className="icon-button" aria-label="关闭添加自选" onClick={onClose}><X size={20}/></button></header><div className="modal-body"><label className="catalog-search"><Search size={17}/><input autoFocus type="search" aria-label="搜索可添加的型号" placeholder="例如：980 PRO、RTX、DDR4、16GB…" value={query} onChange={e=>setQuery(e.target.value)}/>{query&&<button aria-label="清除添加搜索" onClick={()=>setQuery('')}><X size={14}/></button>}</label><div className="watchlist-picker-filter"><label>硬件品类<select aria-label="添加自选品类" value={category} onChange={e=>setCategory(e.target.value)}><option value="all">全部品类</option>{Object.entries(labels).map(([id,label])=><option key={id} value={id}>{label}</option>)}</select></label><span>{found.length} 个结果 · 已自选 {favorites.length} 个</span></div>
      <div className="watchlist-picker-results">{found.slice(0,limit).map(product=><article key={product.id} data-favorite-option-id={product.id}><div><span className="tag">{product.dataMode==='historical' ? '历史报价' : product.dataMode==='public' ? '公开来源报价' : product.dataMode==='catalog' ? '规格目录' : product.dataMode==='local' ? '本机导入' : '价格记录'}</span><h3>{product.name}</h3><p>{product.spec}</p><Quote product={product}/></div><button className={`button ${favorites.includes(product.id)?'secondary':'primary'}`} aria-label={`${favorites.includes(product.id)?'移出自选':'加入自选'} ${product.name} ${product.spec}`} aria-pressed={favorites.includes(product.id)} onClick={()=>onToggle(product.id)}><Star size={15} fill={favorites.includes(product.id)?'currentColor':'none'}/>{favorites.includes(product.id)?'已自选 · 移除':'加入自选'}</button></article>)}</div>
      {!found.length&&<p className="watchlist-picker-empty">{loading?'正在读取型号…':'没有匹配的已收录型号，请更换关键词。'}</p>}{limit<found.length&&<button className="button secondary watchlist-more" onClick={()=>setLimit(n=>n+12)}>再显示 12 个型号</button>}
    </div><footer className="modal-footer"><span>收藏后即可在“我的自选”查看</span><button className="button primary" onClick={onClose}>完成</button></footer></dialog>;
}
