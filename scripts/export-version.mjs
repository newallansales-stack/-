import {createHash} from 'node:crypto';
import {readFileSync,writeFileSync} from 'node:fs';
const pub=JSON.parse(readFileSync('datasets/public-prices.json','utf8'));
const history=JSON.parse(readFileSync('datasets/historical-prices.json','utf8'));
const version={version:1,htmlSha256:createHash('sha256').update(readFileSync('pages/index.html')).digest('hex'),publicUpdatedAt:pub.updatedAt,historyUpdatedAt:history.updatedAt,builtAt:new Date().toISOString()};
writeFileSync('pages/data-version.json',JSON.stringify(version)+'\n');
console.log('[version]',JSON.stringify(version));
