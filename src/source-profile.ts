import type {Product,ProductProfile} from './types';
const brands=['金士顿','金百达','金泰克','三星','英睿达','芝奇','威刚','宏碁','海盗船','影驰','光威','阿斯加特','十铨','华硕','微星','技嘉','七彩虹','索泰','丽台','耕升','映众','蓝宝石','讯景','盈通','撼讯','铭瑄','英特尔','Intel','AMD','西部数据','西数','铠侠','闪迪','希捷','致态','梵想','爱国者','雷克沙','浦科特'];
export const sourceBrand=(name:string)=>brands.find(b=>name.toLowerCase().includes(b.toLowerCase()))||'来源未注明品牌';
export function sourceProfile({name,category,fields,url,gpuClass}:{name:string;category:Product['category'];fields:{label:string;value:string}[];url:string;gpuClass?:string|null}){
  const facets:ProductProfile['facets']={};
  const normalized:ProductProfile['fields']=[];
  let conflict=false;
  const add=(key:string,label:string,value:string)=>normalized.push({key,label,value});
  const text=[name,...fields.map(f=>f.value)].join(' ');
  const field=(pattern:RegExp)=>fields.filter(f=>pattern.test(f.label)).map(f=>f.value).join(' ');
  const capacity=(value:string)=>{const m=value.match(/(\d+(?:\.\d+)?)\s*(G|T)(?:B)?/i);return m?Number(m[1])*(m[2].toUpperCase()==='T'?1000:1):undefined;};
  if(category==='memory'){
    const gens=[...new Set(text.match(/DDR[345]/gi)?.map(s=>s.toUpperCase())||[])];
    if(gens.length>1)conflict=true;
    add('generation','内存代际',gens.length>1?`来源冲突：${gens.join(' / ')}`:gens[0]||'来源未注明');
    const kit=text.match(/(\d+)\s*G(?:B)?\s*[×x*]\s*([1248])(?!\d)/i);
    const reversed=field(/容量描述|条数|套装/).match(/([1248])\s*[×x*]\s*(\d+)\s*G/i);
    const sticks=kit?Number(kit[2]):reversed?Number(reversed[1]):/双条|双根/.test(text)?2:/单条|单根/.test(text)?1:undefined;
    const kitCapacity=kit?Number(kit[1])*Number(kit[2]):reversed?Number(reversed[1])*Number(reversed[2]):undefined;
    const total=capacity(field(/总容量|^内存容量$/))||kitCapacity||capacity(name);
    if(total&&kitCapacity&&total!==kitCapacity)conflict=true;
    if(total&&!conflict)facets.capacityGb=total;
    if(sticks)facets.sticks=sticks;
    const rateText=field(/主频|频率|速率/)||name;
    const rates=[...new Set([...rateText.matchAll(/(?:DDR[345][\s-]*)(\d{4,5})|\b(\d{4,5})\s*(?:MHz|MT\/?s)/gi)].map(m=>Number(m[1]||m[2])))];
    if(rates.length===1)facets.rateMt=rates[0];else if(rates.length>1)conflict=true;
    add('capacity','总容量',total?`${total}GB${total&&kitCapacity&&total!==kitCapacity?'（来源冲突）':''}`:'来源未注明');
    add('sticks','单条 / 套装',sticks?`${sticks} 条${total&&total%sticks===0?` · ${total/sticks}GB × ${sticks}`:''}`:'来源未注明');
    add('rate','标称速率',rates.length===1?`${rates[0]} MT/s`:rates.length>1?'来源冲突':'来源未注明');
    add('latency','时序 / CL',field(/工作时序|延迟|时序/)||name.match(/CL\s*[=:-]?\s*\d+(?:-\d+)*/i)?.[0]||'来源未注明');
  }else if(category==='gpu'){
    if(gpuClass==='consumer'||gpuClass==='professional')facets.gpuClass=gpuClass;
    facets.vramGb=capacity(field(/显存容量/))||capacity(name);
    add('gpuClass','显卡用途',gpuClass==='professional'?'专业显卡':gpuClass==='consumer'?'消费级显卡':'用途未核实');
    add('vram','显存容量',facets.vramGb?`${facets.vramGb}GB`:'来源未注明');
  }else if(category==='storage'){
    facets.capacityGb=capacity(field(/硬盘容量|存储容量|总容量/))||capacity(name);
    add('capacity','存储容量',facets.capacityGb?facets.capacityGb>=1000?`${facets.capacityGb/1000}TB`:`${facets.capacityGb}GB`:'来源未注明');
  }
  for(const f of fields)normalized.push({key:`source:${f.label}`,label:f.label,value:f.value});
  if(!normalized.length)add('reported','原始规格',name);
  const profile:ProductProfile={kind:category,tierRank:9999,series:'公开来源型号',fields:normalized,facets,analysis:{summary:conflict?'来源标题和参数存在冲突，需先查看原文核对。':'依据来源页标注的规格整理；未借用相似型号填补未知参数。',idealFor:[],tradeoffs:[],comparisons:[],references:[{label:'原始参数页',url}]}};
  return {profile,conflict};
}
