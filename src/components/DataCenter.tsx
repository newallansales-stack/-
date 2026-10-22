import {useEffect,useRef,useState} from 'react';
import {Check,Database,Download,FileSpreadsheet,Info,Loader2,Upload} from 'lucide-react';
import {loadLocalRecords,localRecords,localStorageError,localCsv,localTemplate,parseLocalCsv,parseWorkspaceBackup,restoreWorkspaceBackup,saveLocalRecords,workspaceBackup,type LocalRecord} from '../local-data';
import {downloadText} from '../quote-book';
import {publicArchive,archiveCsv} from '../public-prices';
import {historicalArchive,historicalCsv} from '../historical-prices';
import DataHealth from './DataHealth';
import './DataCenter.css';
type Props={favorites:string[];onChanged:(message:string,favorites?:string[])=>void;onOpenMarket:()=>void};
export default function DataCenter({favorites,onChanged,onOpenMarket}:Props){
  const [csv,setCsv]=useState(''),[fileName,setFileName]=useState(''),[error,setError]=useState(''),[message,setMessage]=useState(''),[busy,setBusy]=useState(false),[preview,setPreview]=useState<LocalRecord[]|null>(null),[count,setCount]=useState(localRecords().length);
  const input=useRef<HTMLInputElement>(null),backup=useRef<HTMLInputElement>(null);
  useEffect(()=>{void loadLocalRecords().then(rows=>{setCount(rows.length);if(localStorageError())setError(localStorageError());});},[]);
  async function readFile(file?:File){
    if(!file)return;setError('');setPreview(null);
    if(!/\.csv$/i.test(file.name)||file.size>20*1024*1024){setError('请选择不超过 20 MB 的 CSV UTF-8 文件。');return;}
    try{setCsv(await file.text());setFileName(file.name);}catch{setError('无法读取文件。');}
  }
  function validate(){setError('');setMessage('');try{setPreview(parseLocalCsv(csv));}catch(e){setPreview(null);setError(e instanceof Error?e.message:'CSV 格式无效。');}}
  async function importData(){
    if(!preview||busy)return;setBusy(true);setError('');
    try{const result=await saveLocalRecords(preview);setCount(result.total);setMessage(`导入完成：新增 ${result.added} 条，更新 ${result.updated} 条。已进入市场总览、图表和自选搜索。`);setPreview(null);setCsv('');setFileName('');onChanged('本机价格已保存并接入市场总览。');}catch(e){setError(e instanceof Error?e.message:'保存失败。');}finally{setBusy(false);}
  }
  async function restore(file?:File){
    if(!file)return;setBusy(true);setError('');
    try{if(file.size>32*1024*1024)throw new Error('备份文件上限 32 MB。');const parsed=parseWorkspaceBackup(await file.text());const restored=await restoreWorkspaceBackup(parsed);setCount(localRecords().length);onChanged('备份已合并恢复，原有记录与收藏保留。',[...new Set([...favorites,...restored])]);setMessage('已恢复备份中的价格与自选，原有记录未删除。');}catch(e){setError(e instanceof Error?e.message:'备份恢复失败。');}finally{setBusy(false);if(backup.current)backup.current.value='';}
  }
  return <div className="data-center">
    <DataHealth detailed/>
    <section className="panel data-import" aria-labelledby="browser-import-title"><h2 id="browser-import-title"><FileSpreadsheet size={21}/>网页直接导入历史价格</h2><p>数据保存在当前浏览器的本机数据库，刷新后保留。导入后立即进入市场总览、周线图和自选搜索。不会上传或公开你的文件；换设备请先导出备份。</p>
      <div className="data-actions"><button className="button secondary" onClick={()=>downloadText(localTemplate(),'chipprice-import-template.csv')}><Download size={16}/>下载 CSV 模板</button><button className="button secondary" disabled={busy} onClick={()=>input.current?.click()}><Upload size={16}/>选择 CSV 文件</button><span>{fileName||'UTF-8 CSV · 每批 20 MB / 100,000 行'}</span><input ref={input} type="file" accept=".csv,text/csv" hidden onChange={e=>void readFile(e.target.files?.[0])}/></div>
      <label htmlFor="local-price-csv">或粘贴带表头的 CSV</label><textarea id="local-price-csv" aria-label="历史价格 CSV 内容" value={csv} onChange={e=>{setCsv(e.target.value);setPreview(null);setError('');}} placeholder="product_id,category,brand,name,spec,release_date,date,price,source,url,price_basis,conditions,currency,data_mode" spellCheck={false}/>
      <p className="data-rules">未知上市日期可留空；容量、频率、条数、CL、包装不同须使用独立型号编号。必须有 HTTPS 证据链接。挂牌、优惠与用户提供的成交记录分开统计；公共档案和演示导出不可改作用户真实价格导入。整批验证失败不会写入任何行。</p>
      <div className="data-actions"><button className="button secondary" disabled={busy||!csv.trim()} onClick={validate}>检查并预览</button>{preview&&<button className="button primary" disabled={busy} onClick={()=>void importData()}>{busy?<Loader2 size={16} className="spin"/>:<Database size={16}/>}确认导入 {preview.length} 条</button>}</div>
      {preview&&<div className="data-preview"><h3>预览 · {preview.length} 条有效记录</h3>{preview.slice(0,5).map(r=><div key={r.key}><strong>{r.name}</strong><span>{r.spec}</span><span>{r.date} · ¥{r.price.toLocaleString('zh-CN')} · {r.price_basis}</span></div>)}{preview.length>5&&<small>仅展示前 5 条；确认后导入全部已验证记录。</small>}</div>}
      {error&&<div className="import-error" role="alert"><Info size={16}/>{error}</div>}{message&&<div className="data-success" role="status"><Check size={17}/><span>{message}</span><button className="text-link" onClick={onOpenMarket}>打开市场总览</button></div>}
    </section>
    <section className="panel data-backup"><h2><Database size={21}/>备份与恢复</h2><p>本机现有 {count.toLocaleString('zh-CN')} 条导入记录、{favorites.length} 个自选。JSON 备份包含这些数据；恢复时只补入缺少的记录，同一证据已有记录优先，不用旧备份覆盖后来的编辑。清除浏览器站点数据会删除本机记录，请定期备份。</p><div className="data-actions"><button className="button primary" onClick={()=>downloadText(workspaceBackup(favorites),'chipprice-workspace-backup.json','application/json')}><Download size={16}/>备份价格与自选</button><button className="button secondary" disabled={busy} onClick={()=>backup.current?.click()}><Upload size={16}/>恢复 JSON 备份</button><button className="button secondary" disabled={!count} onClick={()=>downloadText(localCsv(),'chipprice-user-prices.csv')}><Download size={16}/>导出本机价格 CSV</button><a className="button secondary" href="./index.html" download="芯价看板.html">下载离线网页</a><input ref={backup} type="file" accept=".json,application/json" hidden onChange={e=>void restore(e.target.files?.[0])}/></div></section>
    <section className="panel data-backup"><h2><Download size={21}/>完整公共资料下载</h2><p>公开页面观察和历史文章日期分别保留，下载包含全部已找到的记录、价格依据、来源及条件。私有数据不混入公共档案。</p><div className="data-actions"><button className="button secondary" onClick={()=>downloadText(archiveCsv(),'chipprice-public-observations.csv')}>全部公开观察 CSV</button><button className="button secondary" onClick={()=>downloadText(historicalCsv(),'chipprice-historical-articles.csv')}>全部历史文章 CSV</button><button className="button secondary" onClick={()=>downloadText(JSON.stringify({publicArchive,historicalArchive},null,2),'chipprice-public-archives.json','application/json')}>公共原始资料 JSON</button></div></section>
  </div>;
}
