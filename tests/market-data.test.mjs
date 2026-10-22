import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,readFileSync,writeFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,dirname,resolve} from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import ts from 'typescript';
import {parse} from 'csv-parse/sync';
import {createCatalogSnapshot} from '../scripts/export-snapshot.mjs';

const root=fileURLToPath(new URL('../',import.meta.url)),out=mkdtempSync(join(tmpdir(),'chipprice-market-test-')),compiled=new Map();
function compile(input){
  const path=resolve(root,input);if(compiled.has(path))return compiled.get(path);
  const output=join(out,path.slice(root.length).replace(/\.ts$/,'.mjs'));compiled.set(path,pathToFileURL(output).href);mkdirSync(dirname(output),{recursive:true});
  let source=readFileSync(path,'utf8').replace(/import\s+(\w+)\s+from\s+['"]([^'"]+\.json)['"];?/g,(_,name,file)=>`const ${name}=${file.endsWith('snapshot.json')?JSON.stringify(createCatalogSnapshot()):readFileSync(resolve(dirname(path),file),'utf8')};`);
  let code=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText;
  const specs=[];
  const ast=ts.createSourceFile(path,code,ts.ScriptTarget.Latest,true,ts.ScriptKind.JS);
  function visit(node){
    if(ts.isImportDeclaration(node)&&ts.isStringLiteral(node.moduleSpecifier))specs.push(node.moduleSpecifier.text);
    if(ts.isCallExpression(node)&&node.expression.kind===ts.SyntaxKind.ImportKeyword&&ts.isStringLiteral(node.arguments[0]))specs.push(node.arguments[0].text);
    ts.forEachChild(node,visit);
  }
  visit(ast);
  for(const spec of new Set(specs)){
    const target=spec.startsWith('.')?compile(resolve(dirname(path),spec+'.ts')):import.meta.resolve(spec);
    code=code.replaceAll(`'${spec}'`,`'${target}'`).replaceAll(`"${spec}"`,`"${target}"`);
  }
  writeFileSync(output,code);return pathToFileURL(output).href;
}
process.on('exit',()=>rmSync(out,{recursive:true,force:true}));
const local=await import(compile('src/local-data.ts'));
const {sourceProfile}=await import(compile('src/source-profile.ts'));
const {createPublicMarket,publicMarketId}=await import(compile('src/public-market.ts'));
const market=await import(compile('src/market.ts'));
const {quoteHistory}=await import(compile('src/quote-book.ts'));
const row={product_id:'TEST_ONLY_EXACT_KIT',category:'memory',brand:'TEST_FIXTURE',name:'TEST_ONLY_MEMORY',spec:'32GB(16GB×2) DDR5-6000 CL36',release_date:'',date:'2020-01-03',price:'300.50',source:'TEST_FIXTURE_SOURCE',url:'https://example.com/fixture-price-evidence',price_basis:'listing',conditions:'TEST ONLY, no actual price',currency:'CNY',data_mode:'local'};

test('browser import preserves exact identity, optional launch dates, quote basis and HTTPS evidence',()=>{
  const [record]=local.validateLocalRows([row],[],'2026-10-22');
  assert.equal(record.price,300.5);assert.equal(record.release_date,'');assert.equal(record.price_basis,'listing');
  assert.equal(record.data_mode,'local');assert(record.key.includes('TEST_ONLY_EXACT_KIT'));
  const book=local.createLocalMarket([record]);const p=book.dashboard.products[0];
  assert.equal(p.releaseDate,null);assert.equal(p.profile.facets.sticks,2);assert.equal(p.profile.facets.capacityGb,32);
  assert.equal(p.profile.facets.rateMt,6000);assert.equal(p.dataMode,'local');
  assert.equal(book.history(p.id,'2020-01-01','2020-01-31','week').coverage.observedDays,1);
});
test('invalid imports are rejected as a complete batch, including currency, future dates, changed kit, fake archives and conflicting duplicates',()=>{
  for(const change of [{price:'0'},{price:'1e3'},{price:'1.234'},{currency:'USD'},{date:'2020-02-30'},{date:'2099-01-01'},{release_date:'2021-01-01'},{url:'javascript:alert(1)'},{url:'https://secret@example.com/'},{data_mode:'demo'},{data_mode:'public_quote_archive'},{data_mode:'historical_article_archive'}])assert.throws(()=>local.validateLocalRows([row,{...row,...change}],[],'2026-10-22'));
  const existing=local.validateLocalRows([row],[],'2026-10-22');
  assert.throws(()=>local.validateLocalRows([{...row,spec:'32GB(32GB×1) DDR5-6000 CL36'}],existing,'2026-10-22'),/规格不一致/);
  assert.throws(()=>local.validateLocalRows([row,{...row,price:'999'}],[],'2026-10-22'),/冲突/);
  assert.equal(local.validateLocalRows([row,row],[],'2026-10-22').length,1);
  assert.equal(local.localRecords().length,0,'validation alone must not save prices');
});
test('browser CSV supports BOM and quoted conditions; all export values retain provenance and formula protection',()=>{
  const record=local.validateLocalRows([{...row,source:'=TEST_FORMULA'}],[],'2026-10-22')[0];
  const csv=local.localCsv([record]);const rows=parse(csv,{bom:true,columns:true,skip_empty_lines:true});
  assert.equal(rows[0].source,"'=TEST_FORMULA");assert.equal(rows[0].conditions,row.conditions);
  assert.equal(rows[0].data_mode,'local');assert.equal(rows[0].release_date,'');
  const parsed=local.parseLocalCsv(local.localCsv(local.validateLocalRows([row])));
  assert.equal(parsed[0].name,row.name);assert.equal(parsed[0].conditions,row.conditions);
  const template=parse(local.localTemplate(),{bom:true,columns:true,skip_empty_lines:true});assert.equal(template[0].price,'');
});
test('backup restoration validates every record and favorite before writing, rejects public JSON and ignores untrusted record keys',()=>{
  const backup={schema:'chipprice-workspace',version:1,records:[{...row,key:'MALICIOUS_KEY'}],favorites:['history:test:promotion','history:test:promotion']};
  const parsed=local.parseWorkspaceBackup(JSON.stringify(backup));
  assert.equal(parsed.records.length,1);assert.notEqual(parsed.records[0].key,'MALICIOUS_KEY');assert.equal(parsed.favorites.length,1);
  assert.throws(()=>local.parseWorkspaceBackup(JSON.stringify({...backup,records:[row,{...row,price:-1}]})));
  assert.throws(()=>local.parseWorkspaceBackup(JSON.stringify({...backup,favorites:[{}]})));
  assert.throws(()=>local.parseWorkspaceBackup(JSON.stringify({records:[]})));
  assert.equal(local.parseWorkspaceBackup(local.workspaceBackup([])).records.length,0);
});
test('source specs distinguish reversed kit notation and preserve DDR generation conflicts',()=>{
  const base={name:'FIXTURE DDR5 6000 32GB',category:'memory',url:'https://example.com/spec'};
  const good=sourceProfile({...base,fields:[{label:'内存总容量',value:'32GB'},{label:'内存容量描述',value:'双条套装,2×16G'},{label:'内存主频',value:'DDR5 6000'},{label:'工作时序',value:'CL=36-38-38-80'}]});
  assert.equal(good.conflict,false);assert.equal(good.profile.facets.sticks,2);assert.equal(good.profile.facets.capacityGb,32);assert.equal(good.profile.facets.rateMt,6000);
  const bad=sourceProfile({...base,fields:[{label:'内存类型',value:'DDR4'},{label:'内存容量描述',value:'双条套装,2×16G'}]});
  assert.equal(bad.conflict,true);assert(bad.profile.fields.some(f=>f.value.includes('来源冲突')));
  const unknown=sourceProfile({...base,name:'FIXTURE 32GB memory',fields:[]});assert.equal(unknown.profile.facets.sticks,undefined);
});
test('public market keeps every quote type and retailer SKU separate, with exact latest dates and consecutive-day changes only',()=>{
  const publicArchive=JSON.parse(readFileSync(join(root,'datasets/public-prices.json')));
  const q=publicArchive.observations[0],p=publicArchive.products.find(p=>p.id===q.productId);
  const records=[{...q,id:'first',kind:'reference',merchantUrl:null,date:'2020-01-01',price:100},{...q,id:'latest',kind:'reference',merchantUrl:null,date:'2020-01-03',price:150},{...q,id:'relay',kind:'retailer_relay',merchantUrl:'https://item.jd.com/123.html',date:'2020-01-03',price:50},{...q,id:'other-sku',kind:'retailer_relay',merchantUrl:'https://item.jd.com/456.html',date:'2020-01-03',price:60}];
  const book=createPublicMarket({...publicArchive,products:[p],observations:records});
  assert.equal(book.dashboard.products.length,3);
  const model=book.dashboard.products.find(p=>p.id===publicMarketId(records[0]));
  assert.equal(model.currentPrice,150);assert.equal(model.lowPrice,100);assert.equal(model.updatedAt,'2020-01-03');assert.equal(model.changePercent,null);
  assert.equal(book.history(model.id,'2020-01-01','2020-01-31','week').daily.length,2);
  const adjacent=createPublicMarket({...publicArchive,products:[p],observations:[records[0],{...records[1],date:'2020-01-02'}]});
  assert.equal(adjacent.dashboard.products[0].changePercent,50);
});
test('unified market includes all public, historical and catalog records without changing their data modes or inventing prices',async()=>{
  const dashboard=await market.marketApi(new URL('https://example.test/api/dashboard?mode=market'));
  const publicArchive=JSON.parse(readFileSync(join(root,'datasets/public-prices.json'))),history=JSON.parse(readFileSync(join(root,'datasets/historical-prices.json')));
  assert.equal(dashboard.mode,'market');assert(dashboard.products.some(p=>p.dataMode==='public'));assert(dashboard.products.some(p=>p.dataMode==='historical'));assert.equal(dashboard.products.filter(p=>p.dataMode==='catalog').length,66);
  assert.equal(dashboard.summary.observationCount,publicArchive.observations.length+history.records.length);
  assert(dashboard.products.filter(p=>p.dataMode==='catalog').every(p=>p.currentPrice===null&&p.lowPrice===null));
  assert.equal(new Set(dashboard.products.map(p=>p.id)).size,dashboard.products.length);
  const historical=dashboard.products.find(p=>p.historical?.sku==='100008757393');
  const h=await market.marketApi(new URL(`https://example.test/api/products/${encodeURIComponent(historical.id)}/history?mode=market&from=2020-01-01&to=2026-10-22&interval=week`));
  assert.equal(h.points.length,2);assert.equal(h.lowPrice,559);
  const rows=parse(market.marketCsv(historical.id),{bom:true,columns:true,skip_empty_lines:true});
  assert(rows.every(r=>r.date_basis==='article_publication'&&r.verification==='published_article_only'&&r.data_mode==='market_quote_export'));
});
test('quote coverage and weekly bars leave missing days and periods absent while tracking observation counts',()=>{
  const rows=[{date:'2020-01-01',price:100,source:'A'},{date:'2020-01-01',price:90,source:'B'},{date:'2020-01-03',price:80,source:'A'},{date:'2020-01-24',price:120,source:'A'}];
  const h=quoteHistory(rows,'2020-01-01','2020-01-31','week');
  assert.equal(h.points.length,2);assert.deepEqual(h.points[0],{date:'2019-12-30',open:90,high:90,low:80,close:80,count:3});
  assert.equal(h.coverage.observedDays,3);assert.equal(h.coverage.missingDays,28);assert.equal(h.lowPrice,80);
});
