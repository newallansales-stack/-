import test from 'node:test';
import assert from 'node:assert/strict';
import { DEMO_CATALOG_VERSION, DEMO_PRODUCTS } from '../server/catalog.mjs';
import { getMetadata, openDatabase, seedDemo, setMetadata } from '../server/database.mjs';
import { getDashboard, importRecords } from '../server/prices.mjs';
import { validDate } from '../server/dates.mjs';

const byId = new Map(DEMO_PRODUCTS.map(product => [product.id,product]));
const val = (product,key) => product.profile.fields.find(field=>field.key===key)?.value;

test('catalogue has differentiated representative specifications and analysis for every model', () => {
  assert.equal(DEMO_PRODUCTS.length,66);
  assert.equal(byId.size,DEMO_PRODUCTS.length);
  assert.equal(new Set(DEMO_PRODUCTS.map(p=>p.profile.analysis.summary)).size,DEMO_PRODUCTS.length);
  for(const p of DEMO_PRODUCTS) {
    assert.ok(validDate(p.releaseDate),p.id);
    assert.ok(Number.isFinite(p.profile.tierRank),p.id);
    assert.ok(p.profile.series.length>0,p.id);
    assert.ok(p.profile.fields.length>=6,p.id);
    assert.equal(new Set(p.profile.fields.map(f=>f.key)).size,p.profile.fields.length,p.id);
    assert.ok(p.profile.fields.every(f=>f.key&&f.label&&f.value&&!/undefined|null|NaN/.test(f.value)),p.id);
    const a=p.profile.analysis;
    assert.ok(a.summary.length>30,p.id);
    assert.ok(a.idealFor.length>=2&&a.tradeoffs.length>=3,p.id);
    assert.ok(a.comparisons.length>=2,p.id);
    assert.equal(new Set(a.comparisons.map(c=>c.productId)).size,a.comparisons.length,p.id);
    for(const c of a.comparisons) {
      assert.ok(byId.has(c.productId),`${p.id} -> ${c.productId}`);
      assert.notEqual(c.productId,p.id);
      assert.ok(c.note.length>30,p.id);
    }
    assert.ok(a.references.length>0,p.id);
    assert.ok(a.references.every(r=>r.label&&new URL(r.url).protocol==='https:'),p.id);
  }
});

test('memory exposes correct MT/s versus I/O clock, module capacity and same-capacity single/dual variants', () => {
  const memory=DEMO_PRODUCTS.filter(p=>p.profile.kind==='memory');
  assert.equal(memory.length,16);
  for(const p of memory) {
    const {capacityGb,sticks,rateMt}=p.profile.facets;
    assert.ok([1,2].includes(sticks),p.id);
    assert.ok([16,32,48,64].includes(capacityGb),p.id);
    assert.match(val(p,'moduleCapacity'),new RegExp(`${capacityGb/sticks}GB`),p.id);
    assert.equal(val(p,'dataRate'),`${rateMt} MT/s`);
    assert.equal(val(p,'clock'),`约 ${rateMt/2} MHz`);
    assert.match(p.spec,/MT\/s/);
    assert.ok(val(p,'latency')&&val(p,'formFactor'),p.id);
  }
  for(const ids of [
    ['kingston-ddr4-3200-16-single','kingston-ddr4-3200-16'],
    ['kingston-ddr4-3200-32-single','kingston-ddr4-3200-32-dual'],
    ['kingston-ddr5-6000-32-single','kingston-ddr5-6000-32'],
  ]) {
    const [a,b]=ids.map(id=>byId.get(id));
    assert.equal(a.profile.facets.capacityGb,b.profile.facets.capacityGb);
    assert.equal(a.profile.facets.sticks,1);
    assert.equal(b.profile.facets.sticks,2);
    assert.notEqual(a.spec,b.spec);
  }
  assert.match(val(byId.get('kingston-ddr5-5600-32-sodimm'),'formFactor'),/SO-DIMM/);
});

test('consumer GPU ladder has over ten distinct models and remains separate from professional workstation cards', () => {
  const consumer=DEMO_PRODUCTS.filter(p=>p.profile.kind==='consumer-gpu');
  const pro=DEMO_PRODUCTS.filter(p=>p.profile.kind==='professional-gpu');
  assert.equal(consumer.length,23);
  assert.equal(pro.length,5);
  assert.ok(new Set(consumer.map(p=>val(p,'gpuChip'))).size>=10);
  assert.equal([...consumer].sort((a,b)=>a.profile.tierRank-b.profile.tierRank)[0].id,'nvidia-rtx-5090');
  for(const p of [...consumer,...pro]) {
    assert.ok(p.profile.facets.vramGb>0,p.id);
    for(const key of ['gpuClass','vram','memoryType','memoryBus','boostClock','boardPower','architecture']) assert.ok(val(p,key),`${p.id} ${key}`);
    assert.equal(p.profile.facets.gpuClass,pro.includes(p)?'professional':'consumer');
  }
  for(const prefix of ['nvidia-rtx-5060-ti','nvidia-rtx-4060-ti']) {
    const a=byId.get(`${prefix}-8`),b=byId.get(`${prefix}-16`);
    assert.equal(a.profile.facets.vramGb,8);
    assert.equal(b.profile.facets.vramGb,16);
    assert.equal(val(a,'gpuChip'),val(b,'gpuChip'));
    assert.notEqual(a.name,b.name);
    assert.ok(a.profile.analysis.comparisons.some(c=>c.productId===b.id));
  }
  assert.match(val(byId.get('nvidia-rtx-5090'),'marketVersion'),/全球.*非大陆/);
  assert.match(byId.get('nvidia-rtx-pro-6000-blackwell').profile.analysis.tradeoffs.join(' '),/Max-Q.*Server/);
});

test('CPU and storage profiles expose platform, core/thread and medium-specific limits', () => {
  const cpus=DEMO_PRODUCTS.filter(p=>p.profile.kind==='cpu');
  const drives=DEMO_PRODUCTS.filter(p=>['ssd','hdd'].includes(p.profile.kind));
  assert.equal(cpus.length,10);
  assert.equal(drives.length,12);
  for(const p of cpus) for(const key of ['cores','threads','baseClock','boostClock','socket','baseTdp','integratedGraphics']) assert.ok(val(p,key),`${p.id} ${key}`);
  for(const p of drives) {
    assert.ok(p.profile.facets.capacityGb>=1000);
    for(const key of ['capacity','driveType','interface','formFactor',...(p.profile.kind==='ssd'?['flash','sequentialRead','sequentialWrite','dram','endurance']:['rpm','recording'])]) assert.ok(val(p,key),`${p.id} ${key}`);
  }
  assert.equal(val(byId.get('seagate-barracuda-8tb'),'recording'),'SMR');
  assert.equal(val(byId.get('seagate-ironwolf-8tb'),'recording'),'CMR');
});

test('current-date seeded databases gain new catalogue models without duplicates or changes to real records', () => {
  const db=openDatabase(':memory:');
  const today='2026-10-21';
  try {
    seedDemo(db,today);
    // Simulate a previous published catalogue: dates already current, expanded models absent.
    const addedId='nvidia-rtx-5090';
    db.prepare("DELETE FROM observations WHERE product_id=? AND mode='demo'").run(addedId);
    db.prepare("DELETE FROM products WHERE id=? AND mode='demo'").run(addedId);
    setMetadata(db,'demo_catalog_version','old-catalogue');
    assert.equal(getMetadata(db,'demo_seeded_through'),today);
    const keptId='corsair-ddr4-3200-32';
    db.prepare("UPDATE observations SET price_cents=12345 WHERE product_id=? AND mode='demo' AND date='2020-01-01' AND source=?").run(keptId,'京东自营（演示）');
    // A real SKU can reuse a demo ID without inheriting its metadata or profile.
    importRecords(db,[{product_id:addedId,category:'gpu',brand:'REAL_BRAND',name:'REAL_MODEL',spec:'REAL_SPEC',release_date:'2025-01-30',date:today,price:'123.45',source:'REAL_SOURCE',url:'https://example.com/real'}],{today});
    const beforeReal=JSON.stringify(db.prepare("SELECT * FROM observations WHERE mode='real'").all());
    assert.ok(seedDemo(db,today)>0);
    const demo=getDashboard(db,'demo');
    assert.equal(demo.products.length,66);
    assert.ok(demo.products.every(p=>p.profile&&p.profile.analysis.summary));
    assert.equal(getMetadata(db,'demo_catalog_version'),DEMO_CATALOG_VERSION);
    assert.equal(db.prepare("SELECT price_cents FROM observations WHERE product_id=? AND mode='demo' AND date='2020-01-01' AND source=?").get(keptId,'京东自营（演示）').price_cents,12345);
    assert.equal(JSON.stringify(db.prepare("SELECT * FROM observations WHERE mode='real'").all()),beforeReal);
    const real=getDashboard(db,'real').products[0];
    assert.equal(real.name,'REAL_MODEL');
    assert.equal(real.profile,undefined);
    const count=db.prepare('SELECT COUNT(*) n FROM observations').get().n;
    assert.equal(seedDemo(db,today),0);
    assert.equal(db.prepare('SELECT COUNT(*) n FROM observations').get().n,count);
    assert.equal(db.prepare("SELECT COUNT(*) n FROM observations o JOIN products p ON p.id=o.product_id AND p.mode=o.mode WHERE o.mode='demo' AND o.date<p.release_date").get().n,0);
  } finally {db.close();}
});
