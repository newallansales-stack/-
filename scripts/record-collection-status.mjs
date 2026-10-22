import {readFileSync,writeFileSync} from 'node:fs';
const publicArchive=JSON.parse(readFileSync('datasets/public-prices.json','utf8'));
const history=JSON.parse(readFileSync('datasets/historical-prices.json','utf8'));
const publicOutcome=process.env.PUBLIC_COLLECTION_OUTCOME||'unknown';
const historyOutcome=process.env.HISTORY_COLLECTION_OUTCOME==='success'&&history.discovery.failedRequestsThisRun>0&&history.discovery.successfulRequestsThisRun===0?'failure':process.env.HISTORY_COLLECTION_OUTCOME||'unknown';
const outcomes=[publicOutcome,historyOutcome];
const sourcePartial=publicArchive.lastCollection.attempts.some(a=>a.status!=='ok')||history.discovery.throttled||history.discovery.failedRequestsThisRun>0;
const status={version:1,recordedAt:new Date().toISOString(),overall:outcomes.every(s=>s==='success')&&!sourcePartial?'success':outcomes.some(s=>s==='success')?'partial':'failed',
  runUrl:process.env.GITHUB_RUN_ID?`https://github.com/newallansales-stack/-/actions/runs/${process.env.GITHUB_RUN_ID}`:null,
  public:{outcome:publicOutcome,lastSuccessfulReadAt:publicArchive.updatedAt,successfulPages:publicArchive.lastCollection.successfulPages,failedPages:publicArchive.lastCollection.attempts.filter(a=>a.status!=='ok').length},
  history:{outcome:historyOutcome,lastArchiveWriteAt:history.updatedAt,records:history.records.length,scannedDays:history.discovery.scannedDays,checkedArticles:history.discovery.checkedArticles,failedRequestsThisRun:history.discovery.failedRequestsThisRun??null,successfulRequestsThisRun:history.discovery.successfulRequestsThisRun??null,throttled:Boolean(history.discovery.throttled)},
  note:'任务成功仅表示本次整理流程完成，不代表逐日历史完整或已核验交易。失败时保留旧价格及日期。'};
writeFileSync('datasets/collection-status.json',JSON.stringify(status,null,2)+'\n');
console.log(JSON.stringify(status));
