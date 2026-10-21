import test from 'node:test';
import assert from 'node:assert/strict';
import { openDatabase, seedDemo, getMetadata } from '../server/database.mjs';
import { createApp } from '../server/app.mjs';
import { aggregateDaily, exportCsv, getDashboard, getHistory, getOffers, importCsv, importRecords, InputError } from '../server/prices.mjs';
import { chinaToday, nextChinaRun, periodStart, validDate } from '../server/dates.mjs';
import { collectOnce, nextCollectionDelay, validateFeedUrl, wasCollectedToday } from '../server/collector.mjs';

const TODAY = '2025-01-20';
const NOW = new Date(`${TODAY}T08:30:00+08:00`);
function fixture(overrides = {}) {
  return {
    product_id: 'test-ddr4-16', category: 'memory', brand: '测试品牌', name: '测试内存',
    spec: '16GB · DDR4 · 3200MHz', release_date: '2019-01-01', date: '2020-01-01',
    price: '199.99', source: '测试商城', url: 'https://example.com/item/123', ...overrides,
  };
}
function imported(db, records) { return importRecords(db, records, { today: TODAY }); }
const csvHeaders = 'product_id,category,brand,name,spec,release_date,date,price,source,url';

test('China day, leap dates, Monday boundaries and daily schedule are timezone-correct', () => {
  assert.equal(chinaToday(new Date('2025-01-01T16:30:00Z')), '2025-01-02');
  assert.equal(validDate('2024-02-29'), true);
  assert.equal(validDate('2025-02-29'), false);
  assert.equal(periodStart('2025-01-05', 'week'), '2024-12-30');
  assert.equal(periodStart('2025-01-06', 'week'), '2025-01-06');
  assert.equal(nextChinaRun(NOW).toISOString(), '2025-01-20T01:00:00.000Z');
  assert.equal(nextCollectionDelay(NOW), 30 * 60 * 1000);
  assert.equal(nextChinaRun(new Date('2025-01-20T09:00:00+08:00')).toISOString(), '2025-01-21T01:00:00.000Z');
});

test('weekly OHLC uses first, maximum, minimum and last observed daily prices', () => {
  const points = aggregateDaily([
    {date:'2020-01-01',price:200}, {date:'2020-01-02',price:180}, {date:'2020-01-05',price:220},
    {date:'2020-01-06',price:210},
  ], 'week');
  assert.deepEqual(points, [
    {date:'2019-12-30',open:200,high:220,low:180,close:220,count:3},
    {date:'2020-01-06',open:210,high:210,low:210,close:210,count:1},
  ]);
});

test('real imports persist integer cents, deduplicate and update a source/day quote', () => {
  const db = openDatabase(':memory:');
  try {
    assert.deepEqual(imported(db,[fixture()]), {imported:1,updated:0,skipped:0,message:'新增 1 条，更新 0 条，跳过 0 条重复记录'});
    assert.equal(imported(db,[fixture()]).skipped,1);
    assert.equal(imported(db,[fixture({price:'188.88'})]).updated,1);
    assert.equal(db.prepare('SELECT price_cents FROM observations').get().price_cents,18888);
    assert.equal(getDashboard(db,'real').products[0].currentPrice,188.88);
    assert.equal(getDashboard(db,'demo').products.length,0);
  } finally { db.close(); }
});

test('whole batch validation prevents partial writes and rejects unsafe dates and ambiguous product specs', () => {
  const db = openDatabase(':memory:');
  try {
    assert.throws(() => imported(db,[fixture(),fixture({date:'2020-02-30'})]), /日期必须/);
    assert.equal(db.prepare('SELECT COUNT(*) n FROM products').get().n,0);
    for (const changes of [
      {price:'NaN'}, {price:'0'}, {price:'-1'}, {price:'1.001'}, {price:'1e3'}, {price:'1000000.01'},
      {date:'2019-12-31'}, {date:'2025-01-21'}, {date:'2020-01-01',release_date:'2020-01-02'},
      {category:'other'}, {url:'javascript:alert(1)'}, {url:'https://user:pass@example.com'}, {data_mode:'demo'},
    ]) assert.throws(() => imported(db,[fixture(changes)]), InputError);
    imported(db,[fixture()]);
    assert.throws(() => imported(db,[fixture({spec:'32GB'})]), /不同规格/);
    assert.throws(() => imported(db,[fixture({product_id:'new-one'}), fixture({product_id:'new-one',name:'other'})]), /不同规格/);
    assert.equal(db.prepare('SELECT COUNT(*) n FROM products').get().n,1);
  } finally { db.close(); }
});

test('CSV handles BOM and quoted commas; missing columns and demo exports are rejected', () => {
  const db = openDatabase(':memory:');
  try {
    const csv = '\uFEFF'+csvHeaders+'\r\ntest-csv,memory,品牌,"内存,套装",16GB,2019-01-01,2020-01-01,199,商城,https://example.com\r\n';
    assert.equal(importCsv(db,csv,{today:TODAY}).imported,1);
    assert.equal(getDashboard(db,'real').products[0].name,'内存,套装');
    assert.throws(() => importCsv(db,'date,price\n2020-01-01,199'), /缺少列/);
    assert.throws(() => importCsv(db,csvHeaders+',data_mode\ntest-csv,memory,品牌,内存,16GB,2019-01-01,2020-01-01,199,商城,,demo'), /演示数据/);
    const exported = exportCsv(db,'real');
    assert.match(exported, /data_mode/);
    assert.match(exported, /"内存,套装"/);
    assert.equal(importCsv(db,exported,{today:TODAY}).skipped,1);
  } finally { db.close(); }
});

test('daily cross-vendor minima and history gaps remain honest; all-time low ignores selected range', () => {
  const db = openDatabase(':memory:');
  try {
    imported(db,[
      fixture({date:'2020-01-01',price:'100'}), fixture({date:'2020-01-01',price:'110',source:'另一商城'}),
      fixture({date:'2020-01-03',price:'120'}), fixture({date:'2020-01-05',price:'90'}),
      fixture({date:'2020-01-05',price:'95',source:'另一商城'}),
    ]);
    const history = getHistory(db,'test-ddr4-16','real',{from:'2020-01-01',to:'2020-01-06',interval:'week'},TODAY);
    assert.equal(history.coverage.expectedDays,6);
    assert.equal(history.coverage.observedDays,3);
    assert.equal(history.coverage.missingDays,3);
    assert.deepEqual(history.daily.map(item=>item.price),[100,120,90]);
    assert.deepEqual(history.points,[{date:'2019-12-30',open:100,high:120,low:90,close:90,count:5}]);
    const range = getHistory(db,'test-ddr4-16','real',{from:'2020-01-01',to:'2020-01-03'},TODAY);
    assert.equal(range.lowPrice,90);
    const product = getDashboard(db,'real').products[0];
    assert.equal(product.previousPrice,null);
    assert.equal(product.changePercent,null);
    assert.equal(product.lowDate,'2020-01-05');
    assert.deepEqual(getOffers(db,product.id,'real').offers.map(item=>item.price),[90,95]);
    assert.throws(() => getHistory(db,product.id,'real',{to:'2025-01-21'},TODAY), /晚于/);
  } finally { db.close(); }
});

test('period volume counts every vendor quote while coverage counts only observed days', () => {
  const db = openDatabase(':memory:');
  try {
    imported(db, [
      fixture({date:'2020-01-01',price:'100',source:'商城 A'}),
      fixture({date:'2020-01-01',price:'110',source:'商城 B'}),
      fixture({date:'2020-01-01',price:'120',source:'商城 C'}),
      fixture({date:'2020-01-03',price:'90',source:'商城 A'}),
      fixture({date:'2020-01-03',price:'95',source:'商城 B'}),
      fixture({date:'2020-01-03',price:'105',source:'商城 C'}),
    ]);
    const weekly = getHistory(db,'test-ddr4-16','real',{from:'2020-01-01',to:'2020-01-03',interval:'week'},TODAY);
    assert.equal(weekly.points.length,1);
    assert.equal(weekly.points[0].count,6);
    assert.deepEqual(weekly.daily.map(item=>item.count),[3,3]);
    assert.equal(weekly.coverage.observedDays,2);
    assert.equal(weekly.coverage.missingDays,1);
    const daily = getHistory(db,'test-ddr4-16','real',{from:'2020-01-01',to:'2020-01-03',interval:'day'},TODAY);
    assert.deepEqual(daily.points.map(item=>({date:item.date,count:item.count})),[
      {date:'2020-01-01',count:3},{date:'2020-01-03',count:3},
    ]);
  } finally { db.close(); }
});

test('release-date bounds exclude days before launch; missing real days are never generated', () => {
  const db = openDatabase(':memory:');
  try {
    imported(db,[fixture({release_date:'2020-01-05',date:'2020-01-06'})]);
    const history = getHistory(db,'test-ddr4-16','real',{from:'2020-01-01',to:'2020-01-07'},TODAY);
    assert.deepEqual(history.coverage,{expectedDays:3,observedDays:1,missingDays:2,earliestDate:'2020-01-06',latestDate:'2020-01-06'});
    const empty = getHistory(db,'test-ddr4-16','real',{from:'2020-01-01',to:'2020-01-04'},TODAY);
    assert.equal(empty.coverage.expectedDays,0);
    assert.equal(empty.coverage.missingDays,0);
  } finally { db.close(); }
});

test('demo seed is repeatable, extends existing days and never precedes launch', () => {
  const db = openDatabase(':memory:');
  try {
    const count = seedDemo(db,'2020-01-03');
    assert.ok(count>0);
    assert.equal(seedDemo(db,'2020-01-03'),0);
    assert.ok(seedDemo(db,'2020-01-04')>0);
    assert.equal(db.prepare("SELECT COUNT(*) n FROM observations o JOIN products p ON p.id=o.product_id AND p.mode=o.mode WHERE o.date<p.release_date OR o.date<'2020-01-01'").get().n,0);
    assert.equal(getDashboard(db,'real').summary.observationCount,0);
    assert.equal(getDashboard(db,'demo').summary.latestDate,'2020-01-04');
    const exportDemo=exportCsv(db,'demo');
    assert.throws(() => importCsv(db,exportDemo,{today:TODAY}), /演示数据/);
  } finally { db.close(); }
});

test('collector imports authenticated HTTPS feed, preserves errors safely and uses daily markers', async () => {
  const db = openDatabase(':memory:');
  try {
    let options;
    const result = await collectOnce(db,{
      url:'https://example.com/prices',token:'test-only-token',now:NOW,
      fetchImpl:async (_url,opts)=> {options=opts;return new Response(JSON.stringify({records:[fixture()]}),{headers:{'content-type':'application/json'}});},
    });
    assert.equal(result.imported,1);
    assert.equal(options.headers.authorization,'Bearer test-only-token');
    assert.equal(options.redirect,'error');
    assert.equal(wasCollectedToday(db,NOW),true);
    assert.equal(getMetadata(db,'collector_last_status'),'success');
    await assert.rejects(collectOnce(db,{url:'https://example.com',now:NOW,fetchImpl:async()=>new Response('',{status:403})}),/HTTP 403/);
    assert.equal(getMetadata(db,'collector_last_status'),'error');
    await assert.rejects(collectOnce(db,{url:'https://example.com',now:NOW,fetchImpl:async()=>{throw new Error('secret-value')}}),/网络、TLS/);
    assert.ok(!getMetadata(db,'collector_last_error').includes('secret-value'));
    assert.throws(()=>validateFeedUrl('http://example.com'),/HTTPS/);
    assert.throws(()=>validateFeedUrl('https://user:pass@example.com'),/用户名/);
  } finally { db.close(); }
});

test('HTTP API imports a CSV and serves dashboard/history/export/status without fake real data', async () => {
  const app = createApp({dbPath:':memory:',seed:false,now:()=>NOW,distPath:'/tmp/no-hardware-ui'});
  const server = app.listen(0,'127.0.0.1');
  await new Promise(resolve=>server.once('listening',resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  try {
    assert.equal((await (await fetch(`${base}/api/health`)).json()).ok,true);
    assert.equal((await (await fetch(`${base}/api/dashboard?mode=real`)).json()).products.length,0);
    const csv=csvHeaders+'\napi-product,cpu,AMD,CPU,8核,2019-01-01,2020-01-01,999,商城,https://example.com';
    const response=await fetch(`${base}/api/import`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({csv})});
    assert.equal(response.status,200);
    assert.equal((await response.json()).imported,1);
    const dashboard=await (await fetch(`${base}/api/dashboard?mode=real`)).json();
    assert.equal(dashboard.products[0].currentPrice,999);
    const history=await (await fetch(`${base}/api/products/api-product/history?mode=real&to=2020-01-07`)).json();
    assert.equal(history.coverage.missingDays,6);
    assert.match(await (await fetch(`${base}/api/export?mode=real`)).text(),/api-product/);
    assert.match(await (await fetch(`${base}/api/import/template`)).text(),/product_id/);
    assert.equal((await (await fetch(`${base}/api/status`)).json()).real.productCount,1);
    assert.equal((await fetch(`${base}/api/dashboard?mode=bogus`)).status,400);
    assert.equal((await fetch(`${base}/api/does-not-exist`)).status,404);
    assert.equal((await fetch(`${base}/api/import`,{method:'POST',headers:{'content-type':'application/json',origin:'https://other.example'},body:JSON.stringify({csv})})).status,403);
  } finally {
    await new Promise(resolve=>server.close(resolve));
    app.locals.db.close();
  }
});
