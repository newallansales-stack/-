import { ArrowRight, ArrowLeftRight, X } from 'lucide-react';
import type { Mode, Product } from '../types';
import {priceBasis} from '../market';
import './ProductComparison.css';

type Props = {products: Product[]; mode: Mode; onRemove: (id: string) => void; onClear: () => void; onSelect: (id: string) => void};
const money = (value: number | null) => value == null ? '待核验' : `¥${value.toLocaleString('zh-CN')}`;

export default function ProductComparison({products, mode, onRemove, onClear, onSelect}: Props) {
  if (!products.length) return null;
  const fields = [...new Map(products.flatMap(p => p.profile?.fields || []).map(field => [field.key, field])).values()];
  return <section className="panel product-comparison" aria-labelledby="comparison-heading">
    <div className="comparison-heading"><div><ArrowLeftRight size={20}/><h2 id="comparison-heading">规格并排对比</h2><span className="tag">{products.length} / 3 款</span></div><button className="button secondary" onClick={onClear}>清空对比</button></div>
    <p className="comparison-caption">{products.length === 1 ? '再点击其他型号旁的“对比”，并排查看不同规格。' : '同一行查看参数差异；空白参数标为未收录，不据此推断性能高低。'}{mode === 'demo' && ' 此处价格为演示值。'}{mode === 'historical' && ' 历史报价来自不同文章日期与优惠条件，不能据此判断当前性价比。'}</p>
    <div className="comparison-scroll"><table><thead><tr><th scope="col">比较维度</th>{products.map(product => <th key={product.id} scope="col"><div className="comparison-product"><strong>{product.name}</strong><button className="icon-button" aria-label={`从对比中移除 ${product.name} ${product.spec}`} onClick={() => onRemove(product.id)}><X size={14}/></button></div><span>{product.profile?.series || product.brand}</span></th>)}</tr></thead><tbody>
      <tr><th scope="row">具体规格</th>{products.map(p => <td key={p.id}>{p.spec}</td>)}</tr>
      {fields.map(field => {const values = products.map(p => p.profile?.fields.find(f => f.key === field.key)?.value || '未收录');const different = new Set(values).size > 1;return <tr key={field.key} className={different ? 'comparison-difference' : ''}><th scope="row">{field.label}{different && <span className="difference-tag">不同</span>}</th>{values.map((value,i) => <td key={products[i].id}>{value}</td>)}</tr>;})}
      <tr><th scope="row">{mode === 'historical' ? '最近历史报价' : '最新记录价'}{mode === 'demo' && <small>演示价格</small>}</th>{products.map(p => <td className="comparison-price" key={p.id}>{money(p.currentPrice)}{(mode === 'historical'||mode === 'market') && <small>{p.updatedAt||'暂无价格日期'} · {priceBasis(p)}</small>}</td>)}</tr>
      <tr><th scope="row">型号定位</th>{products.map(p => <td className="comparison-summary" key={p.id}>{p.profile?.analysis.summary || '尚未收录型号分析，参数以原始来源为准。'}</td>)}</tr>
      <tr><th scope="row">适用场景</th>{products.map(p => <td key={p.id}>{p.profile?.analysis.idealFor.join(' / ') || '未收录'}</td>)}</tr>
      <tr><th scope="row">查看详情</th>{products.map(p => <td key={p.id}><button className="text-link comparison-select" onClick={() => onSelect(p.id)}>查看该型号分析 <ArrowRight size={14}/></button></td>)}</tr>
    </tbody></table></div>
    <div className="comparison-footnote">高频不一定代表整机更快，显存更大也不等于游戏性能更高。专业卡与消费级卡需按各自软件、驱动和任务评估。</div>
  </section>;
}
