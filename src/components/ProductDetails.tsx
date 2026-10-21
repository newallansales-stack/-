import { ArrowRight, Check, Columns2, ExternalLink, Info, Layers3, ScanLine, SlidersHorizontal } from 'lucide-react';
import type { Mode, Product } from '../types';
import './ProductDetails.css';

type ProductDetailsProps = {
  product: Product;
  products: Product[];
  mode: Mode;
  onSelect: (id: string) => void;
  onCompare?: (id: string) => void;
  comparedIds?: string[];
};

const categoryLabels: Record<Product['category'], string> = {
  memory: '内存',
  gpu: '显卡',
  cpu: 'CPU',
  storage: '存储',
};

function safeReferenceUrl(value: string): string | null {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && !url.username && !url.password ? url.href : null;
  } catch {
    return null;
  }
}

export default function ProductDetails({ product, products, mode, onSelect, onCompare, comparedIds = [] }: ProductDetailsProps) {
  const profile = product.profile;
  const comparisons = profile?.analysis.comparisons.flatMap((comparison) => {
    const other = products.find((candidate) => candidate.id === comparison.productId && candidate.id !== product.id && candidate.category === product.category);
    return other ? [{ product: other, note: comparison.note }] : [];
  }).slice(0, 4) ?? [];
  const references = profile?.analysis.references.flatMap((reference) => {
    const url = safeReferenceUrl(reference.url);
    return url ? [{ ...reference, url }] : [];
  }) ?? [];
  const dataRate = profile?.facets.rateMt;
  const sticks = profile?.facets.sticks;
  const capacity = profile?.facets.capacityGb;

  return (
    <section className="panel product-details" aria-label={`${product.name}规格与分析`}>
      <header className="product-details-header">
        <div className="product-details-heading">
          <span className="product-details-heading-icon"><ScanLine size={19} aria-hidden="true" /></span>
          <div><h2>型号分析</h2><p>{product.brand} · {product.name}</p></div>
        </div>
        <div className="product-details-header-actions">
          <span className="product-details-analysis-label">基于规格分析 · 非实测跑分</span>
          {onCompare && <button className={`product-details-compare-button ${comparedIds.includes(product.id) ? 'active' : ''}`} aria-pressed={comparedIds.includes(product.id)} onClick={() => onCompare(product.id)}><Columns2 size={15} aria-hidden="true" />{comparedIds.includes(product.id) ? '取消对比' : '加入对比'}</button>}
        </div>
      </header>

      {profile ? <>
        <div className="product-details-section-label"><SlidersHorizontal size={14} aria-hidden="true" /><span>核心规格</span><span className="product-details-series">{profile.series}</span></div>
        <dl className="product-details-spec-grid">
          {profile.fields.map((field) => <div className="product-details-spec" key={field.key}><dt>{field.label}</dt><dd>{field.value}</dd></div>)}
        </dl>

        {product.category === 'memory' && <div className="product-details-memory-note">
          <Info size={16} aria-hidden="true" />
          <div>
            {typeof capacity === 'number' && typeof sticks === 'number' && sticks > 0 && <strong>{capacity} GB 总容量 · {sticks === 1 ? '单条' : `${sticks} 条套装`}{sticks > 1 && `（${Number((capacity / sticks).toFixed(2))} GB × ${sticks}）`}</strong>}
            <p>{typeof dataRate === 'number' ? `标称 ${dataRate.toLocaleString('zh-CN')} MT/s 是数据传输率，对应 DDR I/O 时钟约 ${(dataRate / 2).toLocaleString('zh-CN')} MHz。` : 'MT/s 是数据传输率；MHz 是时钟频率，两者含义不同。'}实际运行速率取决于 CPU、主板和内存设置；套装条数不等同于已启用的通道数。</p>
          </div>
        </div>}

        <div className="product-details-analysis">
          <div className="product-details-section-label"><Layers3 size={14} aria-hidden="true" /><span>型号解读</span></div>
          <p className="product-details-summary">{profile.analysis.summary}</p>
          <div className="product-details-guidance-grid">
            <section className="product-details-guidance"><h3><span className="product-details-guidance-dot fit" />适用场景</h3><ul>{profile.analysis.idealFor.map((item) => <li key={item}><Check size={13} aria-hidden="true" /><span>{item}</span></li>)}</ul></section>
            <section className="product-details-guidance"><h3><span className="product-details-guidance-dot tradeoff" />需要留意</h3><ul>{profile.analysis.tradeoffs.map((item) => <li key={item}><span className="product-details-bullet">·</span><span>{item}</span></li>)}</ul></section>
          </div>
        </div>

        {comparisons.length > 0 && <section className="product-details-related" aria-label="相关型号对照">
          <div className="product-details-related-heading"><h3>放在一起看，差别更清楚</h3><span>同品类型号对照</span></div>
          <div className="product-details-related-grid">
            {comparisons.map(({ product: other, note }) => <article className="product-details-related-card" key={other.id}>
              <button className="product-details-related-main" onClick={() => onSelect(other.id)} aria-label={`查看 ${other.name} 的规格与价格`}>
                <div className="product-details-related-title"><strong>{other.name}</strong><ArrowRight size={15} aria-hidden="true" /></div>
                <span className="product-details-related-spec">{other.spec}</span>
                <p>{note}</p>
              </button>
              {onCompare && <button className="product-details-related-compare" aria-pressed={comparedIds.includes(other.id)} onClick={() => onCompare(other.id)} aria-label={`${comparedIds.includes(other.id) ? '取消对比' : '加入对比'} ${other.name}`}><Columns2 size={13} aria-hidden="true" />{comparedIds.includes(other.id) ? '取消对比' : '加入对比'}</button>}
            </article>)}
          </div>
        </section>}

        <footer className="product-details-footer">
          <p>{mode === 'demo' ? '演示模式：分析依据规格，不以演示价格判断性价比。' : '兼容性和可用功能请结合实际平台与厂商文档确认。'}</p>
          {references.length > 0 && <div className="product-details-references"><span>参数参考</span>{references.map((reference) => <a key={reference.url} href={reference.url} target="_blank" rel="noopener noreferrer">{reference.label}<ExternalLink size={11} aria-hidden="true" /></a>)}</div>}
        </footer>
      </> : <div className="product-details-unstructured">
        <span className="product-details-section-label">原始规格</span>
        <p className="product-details-original-spec">{product.spec || '来源未提供规格说明'}</p>
        <dl className="product-details-raw-grid"><div><dt>品类</dt><dd>{categoryLabels[product.category]}</dd></div><div><dt>品牌</dt><dd>{product.brand}</dd></div><div><dt>型号标识</dt><dd>{product.id}</dd></div></dl>
        <div className="product-details-unknown-note"><Info size={16} aria-hidden="true" /><p>未收录结构化参数，规格以原始来源为准。导入的型号可查看价格历史；暂不生成未经核实的硬件分析。</p></div>
      </div>}
    </section>
  );
}
