// These are representative specification profiles. All generated prices remain synthetic DEMO fixtures.
// Position order is a product-line navigation aid, never a benchmark/performance score.
export const DEMO_CATALOG_VERSION = '2026-10-21-spec-profiles-v2';
export const DEMO_SOURCES = ['京东自营（演示）', '天猫旗舰店（演示）', '品牌商城（演示）'];
const f = (key, label, value) => ({key, label, value: String(value)});
const ref = (label, url) => ({label, url});
const refs = {
  kingston4:'https://www.kingston.com/en/memory/gaming/kingston-fury-beast-ddr4-memory',
  kingston5:'https://www.kingston.com/en/memory/gaming/kingston-fury-beast-ddr5-memory',
  impact:'https://www.kingston.com/en/memory/gaming/kingston-fury-impact-ddr5-memory',
  corsair:'https://www.corsair.com/us/en/c/memory', gskill:'https://www.gskill.com/products/1/165/Desktop-Memory',
  nvidia50:'https://www.nvidia.com/en-us/geforce/graphics-cards/50-series/',
  nvidia40:'https://www.nvidia.com/en-us/geforce/graphics-cards/40-series/',
  nvidia30:'https://www.nvidia.com/en-us/geforce/graphics-cards/30-series/',
  nvidiaChina:'https://www.nvidia.cn/geforce/graphics-cards/50-series/',
  radeon:'https://www.amd.com/en/products/graphics/desktops/radeon.html',
  proBlackwell:'https://www.nvidia.com/en-us/design-visualization/rtx-pro-6000/',
  pro6000:'https://www.nvidia.com/en-us/design-visualization/rtx-6000/',
  pro5000:'https://www.nvidia.com/en-us/design-visualization/rtx-5000/',
  pro4000:'https://www.nvidia.com/en-us/design-visualization/rtx-4000/',
  proA4000:'https://www.nvidia.com/en-us/design-visualization/rtx-a4000/',
  amdCpu:'https://www.amd.com/en/products/processors/desktops/ryzen.html',
  intelCpu:'https://www.intel.com/content/www/us/en/products/details/processors/core.html',
  intelUltra:'https://www.intel.com/content/www/us/en/products/details/processors/core-ultra.html',
  samsung:'https://semiconductor.samsung.com/consumer-storage/',
  wd:'https://www.westerndigital.com/products/internal-drives', crucial:'https://www.crucial.com/products/ssd',
  seagateNas:'https://www.seagate.com/products/nas-drives/ironwolf-hard-drive/',
  seagateDesktop:'https://www.seagate.com/products/hard-drives/barracuda-hard-drive/',
};
const memoryRows = [
// id, brand, name, generation, totalGB, modules, MT/s, CL, form, observed-from catalogue date, demo target/launch, use, limitation
['corsair-ddr4-3200-32','海盗船','复仇者 LPX DDR4 32GB 双条','DDR4',32,2,3200,16,'UDIMM','2019-01-01',399,1299,'面向 DDR4 多任务与常规内容创作，低矮散热片便于部分大型风冷安装。','占用两个插槽；需要核对风冷与内存槽间隙。'],
['kingston-ddr4-3200-16','金士顿','FURY Beast DDR4 16GB 双条','DDR4',16,2,3200,16,'UDIMM','2021-04-12',229,699,'8GB×2 适合以轻量办公和主流游戏为主的 DDR4 系统。','总容量仅 16GB，大素材或多虚拟机可能需要扩容。'],
['gskill-ddr4-3600-32','芝奇','焰光戟 DDR4 32GB 双条','DDR4',32,2,3600,18,'UDIMM','2020-01-01',479,1499,'保留 32GB 容量并调校 DDR4-3600 的现有平台升级配置。','3600 MT/s 是超频档，需核对主板 QVL、控制器与散热片高度。'],
['kingston-ddr5-6000-32','金士顿','FURY Beast DDR5 32GB 双条','DDR5',32,2,6000,36,'UDIMM','2022-06-01',649,2799,'16GB×2 适合 DDR5 台式机游戏与多任务，可与 32GB 单条直接比较。','CL36 与 CL30 不能只按数字推导整机速度，需比较完整时序。'],
['gskill-ddr5-6000-32','芝奇','焰锋戟 DDR5 32GB CL30 双条','DDR5',32,2,6000,30,'UDIMM','2022-08-30',799,2199,'面向重视 DDR5-6000 时序、愿意核对 EXPO / XMP 与平台兼容表的用户。','同为 6000 MT/s，CL30 与 CL36 是不同套装，不可混合报价。'],
['corsair-ddr5-6400-64','海盗船','复仇者 DDR5 64GB 双条','DDR5',64,2,6400,32,'UDIMM','2023-05-01',1499,3299,'32GB×2 面向大型工程、多应用与 64GB 常驻数据需求。','大容量与 6400 MT/s 同时稳定对平台要求更高。'],
['kingston-ddr4-3200-16-single','金士顿','FURY Beast DDR4 16GB 单条','DDR4',16,1,3200,16,'UDIMM','2021-04-12',139,399,'单条 16GB 适合单槽需求或计划分阶段扩容的 DDR4 系统。','单条不会自动形成双 DIMM 双通道，后续混搭仍需核对料号。'],
['kingston-ddr4-3200-32-single','金士顿','FURY Beast DDR4 32GB 单条','DDR4',32,1,3200,16,'UDIMM','2021-04-12',299,899,'单条 32GB 保留更多空槽，适合后续继续扩容的 DDR4 主机。','旧主板须支持单条 32GB；与 16GB×2 通道布局不同。'],
['kingston-ddr4-3200-32-dual','金士顿','FURY Beast DDR4 32GB 双条','DDR4',32,2,3200,16,'UDIMM','2021-04-12',359,1099,'16GB×2 可按主板指定槽位配置双通道，并保留 32GB 多任务容量。','两条占用两槽；成套模块与分开购买的单条不应假定颗粒一致。'],
['kingston-ddr4-3200-64-dual','金士顿','FURY Beast DDR4 64GB 双条','DDR4',64,2,3200,16,'UDIMM','2021-04-12',699,1899,'32GB×2 适合 DDR4 大型图像工程、多虚拟机与 64GB 工作流。','确认应用确需 64GB，并核对主板每槽 32GB 的支持。'],
['gskill-ddr4-3600-16','芝奇','焰光戟 DDR4 16GB 双条','DDR4',16,2,3600,18,'UDIMM','2020-01-01',269,799,'8GB×2 面向不需要大容量、希望调校 DDR4-3600 档位的现有平台。','8GB 单条扩容空间有限，不要为传输速率忽略容量限制。'],
['kingston-ddr5-6000-16-single','金士顿','FURY Beast DDR5 16GB 单条','DDR5',16,1,6000,36,'UDIMM','2022-06-01',329,1099,'单条 16GB 提供 DDR5 入门与后续增加匹配模块的扩容路径。','DDR5 单 DIMM 的子通道不等于双 DIMM 平台配置。'],
['kingston-ddr5-6000-32-single','金士顿','FURY Beast DDR5 32GB 单条','DDR5',32,1,6000,36,'UDIMM','2022-06-01',579,1899,'单条 32GB 适合保留空槽并计划升级到更大 DDR5 总容量的台式机。','容量虽与 16GB×2 相同，物理条数及平台带宽布局仍不同。'],
['kingston-ddr5-6000-64-dual','金士顿','FURY Beast DDR5 64GB 双条','DDR5',64,2,6000,36,'UDIMM','2022-06-01',1199,2999,'32GB×2 面向 64GB DDR5 工作站内存需求，强调容量而非只看速率。','四条配置不能直接沿用两条的预期速率，须确认控制器和 BIOS。'],
['gskill-ddr5-7200-48','芝奇','幻锋戟 DDR5 48GB 双条','DDR5',48,2,7200,36,'UDIMM','2023-03-01',1299,2499,'24GB×2 在 32GB 与 64GB 之间提供容量选项，适合高频调校平台。','24GB DIMM 可能需要新 BIOS，7200 MT/s 对布线与控制器要求更高。'],
['kingston-ddr5-5600-32-sodimm','金士顿','FURY Impact DDR5 32GB SO-DIMM 双条','DDR5',32,2,5600,40,'SO-DIMM','2023-01-01',649,1299,'16GB×2 SO-DIMM 面向可更换 DDR5 内存的笔记本或迷你主机。','焊接内存设备不能安装，笔记本可能锁定速率及时序。'],
];
function makeMemory([id,brand,name,ddr,total,sticks,rate,cl,form,releaseDate,target,launch,intent,caution]) {
  const each = total / sticks;
  const kit = sticks === 1 ? `单条 ${each}GB` : `${sticks} 条套装（${each}GB×${sticks}）`;
  return {id,category:'memory',brand,name,spec:`${total}GB（${each}GB×${sticks}）· ${ddr}-${rate} MT/s · CL${cl} · ${form}`,releaseDate,target,launch,
    profile:{kind:'memory',tierRank:10000-rate+(ddr==='DDR4'?1000:0),series:ddr,facets:{capacityGb:total,rateMt:rate,sticks},
      fields:[f('capacity','总容量',`${total}GB`),f('modules','单条 / 套装',kit),f('dataRate','等效传输速率',`${rate} MT/s`),f('clock','I/O 时钟',`约 ${rate/2} MHz`),f('moduleCapacity','单条容量',`${each}GB`),f('latency','CAS 时序',`CL${cl}`),f('memoryType','内存代际',ddr),f('formFactor','模块形态',form==='UDIMM'?'UDIMM（台式机）':'SO-DIMM（笔记本 / 迷你机）')],
      analysis:{summary:`${brand}${name}：${total}GB、${kit}、${ddr}-${rate} CL${cl}。${intent}`,idealFor:[intent,`支持 ${ddr} ${form} 的对应平台`],tradeoffs:[caution,`${ddr} 不能与其他代际互换，${form} 形态也须与插槽一致。`,'标称 MT/s 需要 CPU 控制器、主板与 BIOS 配合，超频档不保证所有平台稳定。','条数仅描述物理 DIMM 数量；是否双通道取决于平台与插槽。DDR5 单条子通道不等于两条配置。'],comparisons:[],references:[ref('品牌官方内存规格入口',refs[brand==='金士顿'?form==='SO-DIMM'?'impact':ddr==='DDR4'?'kingston4':'kingston5':brand==='芝奇'?'gskill':'corsair'])]}}};
}
const gpuRows = [
// id, chip/version, VRAM, memory, bus, nominal boost GHz (null = not publicly unified), board W, architecture, date, demo target/launch, positioning order, professional, use, limitation, optional reference
['nvidia-rtx-5090','GeForce RTX 5090',32,'GDDR7',512,2.41,575,'Blackwell','2025-01-30',17999,16499,10,false,'面向较大消费级创作场景、光追游戏及已确认 CUDA 后端兼容的本地计算。','这是全球版本，不代表中国大陆官方销售或进口可获得性，须核实区域与保修。'],
['nvidia-rtx-5090d','GeForce RTX 5090 D',32,'GDDR7',512,2.41,575,'Blackwell','2025-01-30',16999,16499,11,false,'原始中国区域 32GB 5090 D 独立建档，方便与全球版分别追踪。','原始 5090 D 与后续其他 D 版本不是同一 SKU；供货、政策与计算限制需逐时核实。','nvidiaChina'],
['nvidia-rtx-5080','GeForce RTX 5080',16,'GDDR7',256,2.62,360,'Blackwell','2025-01-30',7999,8299,30,false,'适合需要新代消费级功能、并能接受 16GB 容量边界的高规格游戏与创作。','与 5090 的 32GB 不同，大模型和大场景应先测算显存需求。'],
['nvidia-rtx-5070-ti','GeForce RTX 5070 Ti',16,'GDDR7',256,2.45,300,'Blackwell','2025-02-20',5799,6299,60,false,'16GB、256-bit 与 12GB 5070 提供不同容量配置，适合按具体游戏和素材选型。','Ti 与非 Ti 不只是提频差别，供电、尺寸和板卡 Boost 都需核对。'],
['nvidia-rtx-5070','GeForce RTX 5070',12,'GDDR7',192,2.51,250,'Blackwell','2025-03-05',3899,4599,90,false,'12GB 消费级配置，适合能按游戏设置和素材规模控制显存使用的任务。','高分辨率贴图或大型创作项目可能触及 12GB 边界，不能与 16GB Ti 混同。'],
['nvidia-rtx-5060-ti-16','GeForce RTX 5060 Ti 16GB',16,'GDDR7',128,2.57,180,'Blackwell','2025-04-16',3199,3599,110,false,'同芯片 16GB 版本面向更关心显存容量、且已确认计算能力能满足任务的用户。','显存翻倍不等于计算性能或帧率翻倍，必须与 8GB 独立比较。'],
['nvidia-rtx-5060-ti-8','GeForce RTX 5060 Ti 8GB',8,'GDDR7',128,2.57,180,'Blackwell','2025-04-16',2599,2999,115,false,'8GB 版本适合能够控制贴图、场景和模型显存占用的消费级工作负载。','驱动不能把 8GB 升级成 16GB，报价条件必须保留容量后缀。'],
['nvidia-rtx-5060','GeForce RTX 5060',8,'GDDR7',128,2.50,145,'Blackwell','2025-05-19',2199,2499,140,false,'8GB 与 145W 参考功率配置适合按机箱、电源和具体游戏需求核对的台式机。','与 5060 Ti 不同，不能仅因同为 8GB 就假定相同性能。'],
['nvidia-rtx-4090','GeForce RTX 4090',24,'GDDR6X',384,2.52,450,'Ada Lovelace','2022-10-12',13999,14999,20,false,'24GB 面向较大渲染场景、本地计算与需要充足显存的游戏设置。','这是原始全球 4090，不是 4090 D，中国区域、来源、保修和供货需另行核实。'],
['nvidia-rtx-4080-super','GeForce RTX 4080 SUPER',16,'GDDR6X',256,2.55,320,'Ada Lovelace','2024-01-31',6499,8099,40,false,'16GB Ada SUPER 型号适合与原版 4080 分开记录并按目标应用比较。','SUPER 与原版不是同一型号，不能将报价和历史最低价合并。'],
['nvidia-rtx-4080','GeForce RTX 4080',16,'GDDR6X',256,2.51,320,'Ada Lovelace','2022-11-16',5999,9499,45,false,'原始 16GB RTX 4080，适合追踪同代不同发布版本的独立历史。','不能合并 4080 SUPER 或曾用相似名称的其他芯片记录。'],
['nvidia-rtx-4070-ti-super','GeForce RTX 4070 Ti SUPER',16,'GDDR6X',256,2.61,285,'Ada Lovelace','2024-01-24',4999,6499,70,false,'16GB 与 256-bit 配置适合显存需求明确的游戏及内容创作任务。','Ti SUPER、Ti、SUPER 后缀代表不同产品，不能省略后缀混价。'],
['nvidia-rtx-4070-super','GeForce RTX 4070 SUPER',12,'GDDR6X',192,2.48,220,'Ada Lovelace','2024-01-17',4299,4899,95,false,'12GB、192-bit 的 SUPER 型号适合按特定游戏或渲染器确认需求的系统。','SUPER 不是商家自定义后缀，与原版及 Ti SUPER 是不同 GPU 配置。'],
['nvidia-rtx-4070','GeForce RTX 4070',12,'GDDR6X',192,2.48,200,'Ada Lovelace','2023-04-13',3299,4799,100,false,'原版 GDDR6X 12GB 配置用于独立追踪 Ada 产品历史与旧平台升级。','本记录限定 GDDR6X，不可混入后续 GDDR6 版本。'],
['nvidia-rtx-4060-ti-16','GeForce RTX 4060 Ti 16GB',16,'GDDR6',128,2.54,165,'Ada Lovelace','2023-07-18',2499,3899,120,false,'16GB 版本适合显存敏感、且验证过此 GPU 计算能力的项目。','16GB 不会改变 128-bit 总线，不可只按容量与高阶卡等同比较。'],
['nvidia-rtx-4060-ti-8','GeForce RTX 4060 Ti 8GB',8,'GDDR6',128,2.54,160,'Ada Lovelace','2023-05-24',2199,3199,125,false,'8GB Ti 型号适合已确定场景上限的游戏与创作，并应单独比较 16GB 版本。','8GB 与 16GB 的容量及参考功率不同，不能只写 4060 Ti 合并记录。'],
['nvidia-rtx-4060','GeForce RTX 4060',8,'GDDR6',128,2.46,115,'Ada Lovelace','2023-06-29',1999,2399,145,false,'115W 参考功率与 8GB 显存，适合关注电源、散热和明确游戏需求的配置。','8GB 可能限制高分辨率材质，低功率也不保证所有非公版无需外部供电。'],
['nvidia-rtx-3080','GeForce RTX 3080',10,'GDDR6X',320,1.71,320,'Ampere','2020-09-17',3499,5499,130,false,'保留 2020 年发布 10GB 原版历史，便于研究旧代波动和既有系统升级。','10GB 与后来的 12GB 不同，旧卡还应核查使用状况、维修及保修。'],
['nvidia-rtx-3060','GeForce RTX 3060',12,'GDDR6',192,1.78,170,'Ampere','2021-02-25',1699,2499,160,false,'原始 12GB 版本为较早 CUDA 工作流和消费级游戏提供独立型号记录。','不可混入后续 8GB / 128-bit 版本；容量更大不自动代表更高帧率。'],
['amd-rx-9070xt','Radeon RX 9070 XT',16,'GDDR6',256,2.97,304,'RDNA 4','2025-03-06',4599,4999,50,false,'16GB RDNA 4 面向在目标游戏、图形 API 与计算后端完成兼容验证的用户。','CUDA 专用软件不能默认直接运行，模型和渲染器须核对 AMD 后端支持。'],
['amd-rx-9070','Radeon RX 9070',16,'GDDR6',256,2.52,220,'RDNA 4','2025-03-06',3999,4499,80,false,'非 XT 保留 16GB 容量，以 220W 参考功率定位形成与 XT 的配置区别。','显存相同不代表芯片配置相同，仍需比较任务表现、供电和散热。'],
['amd-rx-7900xtx','Radeon RX 7900 XTX',24,'GDDR6',384,2.5,355,'RDNA 3','2022-12-13',6499,7999,55,false,'24GB、384-bit RDNA 3 配置面向较大图形内存需求和已验证的软件。','24GB 不会消除 CUDA 依赖，RDNA 3 与 RDNA 4 功能也不能混为一谈。'],
['amd-rx-7800xt','Radeon RX 7800 XT',16,'GDDR6',256,2.43,263,'RDNA 3','2023-09-06',2999,4099,105,false,'16GB RDNA 3 型号适合已有 AMD 环境或按特定游戏 API 做升级选择。','与 9070 同容量不等于同代功能，编码、光追和驱动应单独核对。'],
['nvidia-rtx-pro-6000-blackwell','RTX PRO 6000 Blackwell Workstation Edition',96,'GDDR7 ECC',512,null,600,'Blackwell','2025-06-01',69999,79999,10,true,'96GB 大显存面向单卡常驻大型模型、复杂数字孪生和大型专业场景。','仅限定 600W Workstation Edition，不可与 300W Max-Q 或 Server Edition 合并。','proBlackwell'],
['nvidia-rtx-6000-ada','RTX 6000 Ada Generation',48,'GDDR6 ECC',384,null,300,'Ada Lovelace','2023-01-01',39999,54999,20,true,'48GB ECC 面向 CAD / DCC 大场景、专业可视化与认证驱动工作流。','与 RTX PRO 6000 Blackwell 不是同代产品，容量和平台要求不能混同。','pro6000'],
['nvidia-rtx-5000-ada','RTX 5000 Ada Generation',32,'GDDR6 ECC',256,null,250,'Ada Lovelace','2023-09-01',23999,32999,30,true,'32GB ECC 面向工程可视化、专业渲染及不适合拆分显存的数据场景。','专业认证价值取决于实际应用，不可用消费卡型号数字推导对应性能。','pro5000'],
['nvidia-rtx-4000-ada','RTX 4000 Ada Generation',20,'GDDR6 ECC',160,null,130,'Ada Lovelace','2023-09-01',10999,13999,40,true,'20GB ECC 与 130W 配置适合需要专业驱动且关注工作站供电和空间的工程任务。','这是标准版，不是功率和外形不同的 RTX 4000 SFF Ada。','pro4000'],
['nvidia-rtx-a4000','RTX A4000',16,'GDDR6 ECC',256,null,140,'Ampere','2021-04-12',5999,8999,50,true,'16GB ECC Ampere 专业卡适合已有认证应用与相应驱动生态的工作站维护。','与 RTX 4000 Ada 不同代，旧卡需核查驱动支持期、板卡状态和保修。','proA4000'],
];
function makeGpu([id,name,vram,memoryType,bus,boost,power,architecture,releaseDate,target,launch,tierRank,professional,intent,caution,refKey]) {
  const brand = name.startsWith('Radeon') ? 'AMD' : 'NVIDIA';
  const kind = professional ? 'professional-gpu' : 'consumer-gpu';
  const chip = name.replace(/ (8|16)GB$/, '');
  const series = professional ? `RTX 专业 ${architecture}` : brand==='AMD'?`Radeon ${architecture}`:`GeForce RTX ${architecture==='Blackwell'?'50':architecture==='Ada Lovelace'?'40':'30'} 系列`;
  const region = id==='nvidia-rtx-5090'?'全球版本，非大陆供货承诺':id==='nvidia-rtx-5090d'?'原始中国区域 5090 D 32GB':professional?'指定桌面工作站板卡版本':'参考配置，具体品牌与区域保修另行核对';
  return {id,category:'gpu',brand,name,spec:`${professional?'专业工作站':'消费级'} · ${vram}GB ${memoryType} · ${bus}-bit${id.includes('5090')?` · ${region}`:''}`,releaseDate,target,launch,
    profile:{kind,tierRank,series,facets:{gpuClass:professional?'professional':'consumer',vramGb:vram},
      fields:[f('gpuClass','显卡类别',professional?'专业工作站显卡':'消费级显卡'),f('vram','显存容量',`${vram}GB`),f('memoryType','显存类型',memoryType),f('memoryBus','显存位宽',`${bus}-bit`),f('boostClock','参考 Boost',boost?`${boost.toFixed(2)} GHz（非公版可不同）`:'厂商未统一公开，以具体板卡资料为准'),f('boardPower','参考整卡功率',`${power}W（不是整机功耗）`),f('architecture','架构',architecture),f('gpuChip','GPU 型号 / 版本',chip),f('marketVersion','版本 / 区域说明',region)],
      analysis:{summary:`${name} 属于${professional?'专业工作站':'消费级'}产品，配备 ${vram}GB ${memoryType} / ${bus}-bit。${intent}`,idealFor:[intent,professional?'需核对专业驱动、ECC 与软件认证支持的工作站':'根据目标游戏、创作软件和本地计算后端进行选型'],tradeoffs:[caution,`${power}W 是参考板卡功率，仍需核对电源、接口、机箱尺寸与散热；非公版可有不同设置。`,professional?'专业驱动、ECC 和认证不能直接换算为游戏帧率优势。':'容量、位宽和型号定位不能单独推导帧率，分辨率、软件和驱动均有影响。','演示报价不能用于真实性价比判断，具体品牌保修与散热条件需单独比较。'],comparisons:[],references:[ref('厂商产品与参考规格',refs[refKey || (professional?'pro6000':brand==='AMD'?'radeon':architecture==='Blackwell'?'nvidia50':architecture==='Ada Lovelace'?'nvidia40':'nvidia30')])]}}};
}
const cpuRows = [
// id,brand,name,cores,threads,layout,baseGHz,boostGHz,socket,TDP,maxTurboW,iGPU,date,target,launch,rank,series,use,limitation
['amd-ryzen-7800x3d','AMD','Ryzen 7 7800X3D',8,16,'同构核心','4.2',5.0,'AM5',120,null,'基础 AMD Radeon 核显','2023-04-06',2399,3299,40,'Ryzen 7000 X3D','3D V-Cache 面向缓存敏感游戏，应结合实际游戏清单而非只看核心数。','缓存优势随应用变化，多线程渲染不因 X3D 后缀自动超过更多核心型号。'],
['amd-ryzen-9800x3d','AMD','Ryzen 7 9800X3D',8,16,'同构核心','4.7',5.2,'AM5',120,null,'基础 AMD Radeon 核显','2024-11-07',3199,3699,30,'Ryzen 9000 X3D','8 核 X3D 适合以游戏为主并保留 AM5 平台升级路径的机器。','老 AM5 主板可能需更新 BIOS，代际差异应按具体游戏核对。'],
['amd-ryzen-5700x','AMD','Ryzen 7 5700X',8,16,'同构核心','3.4',4.6,'AM4',65,null,'无核显','2022-04-04',899,1999,80,'Ryzen 5000','8 核 16 线程适合保留 DDR4 / AM4 并增加多任务或轻创作余量。','AM4 与 AM5 CPU 不互换，新建平台和保留旧平台总成本需分开比较。'],
['intel-i5-12400f','Intel','Core i5-12400F',6,12,'6P + 0E','2.5',4.4,'LGA1700',65,117,'无核显','2022-01-04',699,1499,90,'Intel Core 第 12 代','6 核 12 线程适合已有独显的常规办公与游戏系统。','DDR4 或 DDR5 取决于主板版本；F 后缀无核显，主板视频接口不能替代独显。'],
['intel-i5-14600kf','Intel','Core i5-14600KF',14,20,'6P + 8E','P 3.5 / E 2.6',5.3,'LGA1700',125,181,'无核显','2023-10-17',1599,2349,60,'Intel Core 第 14 代','性能核与能效核适合游戏与并行后台任务共存的独显台式机。','KF 无核显，需合适散热；核对主板最新稳定 BIOS、微码与功耗建议。'],
['amd-ryzen-9950x','AMD','Ryzen 9 9950X',16,32,'同构核心','4.3',5.7,'AM5',170,null,'基础 AMD Radeon 核显','2024-08-15',3499,4899,10,'Ryzen 9000','16 核 32 线程面向可充分并行的编译、CPU 渲染、编码与生产力。','不是 X3D 游戏型号，5.7GHz 不是全核持续承诺，需匹配供电与散热。'],
['amd-ryzen-5600','AMD','Ryzen 5 5600',6,12,'同构核心','3.5',4.4,'AM4',65,null,'无核显','2022-04-04',599,1399,100,'Ryzen 5000','6 核 AM4 适合保留 DDR4 主板与独显的游戏和轻量工作流。','不等于有核显的 Ryzen 5 5600G，缓存与接口规格也不能照搬 G 型号。'],
['amd-ryzen-7600','AMD','Ryzen 5 7600',6,12,'同构核心','3.8',5.1,'AM5',65,null,'基础 AMD Radeon 核显','2023-01-10',1099,1549,70,'Ryzen 7000','6 核 AM5 适合构建 DDR5 平台，保留基础显示输出用于日常或排障。','AM5 需要 DDR5，基础核显主要用于显示输出，不等于强游戏核显。'],
['intel-i9-14900k','Intel','Core i9-14900K',24,32,'8P + 16E','P 3.2 / E 2.4',6.0,'LGA1700',125,253,'Intel UHD Graphics 770','2023-10-17',3299,4999,20,'Intel Core 第 14 代','24 核混合配置面向大量并行线程和可能使用 Quick Sync 的桌面工作流。','持续负载需合适散热和功耗限制，核对最新稳定 BIOS、微码及厂商运行建议。'],
['intel-core-ultra-7-265k','Intel','Core Ultra 7 265K',20,20,'8P + 12E','P 3.9 / E 3.3',5.5,'LGA1851',125,250,'Intel Graphics','2024-10-24',2299,3199,50,'Intel Core Ultra 200S','20 核 20 线程适合按特定生产力软件验证新平台的桌面配置。','LGA1851 不兼容 LGA1700 CPU，此代没有沿用超线程，20 核不是 40 线程。'],
];
function makeCpu([id,brand,name,cores,threads,layout,base,boost,socket,tdp,maxPower,graphics,releaseDate,target,launch,tierRank,series,intent,caution]) {
  return {id,category:'cpu',brand,name,spec:`${cores} 核 ${threads} 线程 · ${socket} · 盒装 · ${graphics==='无核显'?'无核显':'含核显'}`,releaseDate,target,launch,
    profile:{kind:'cpu',tierRank,series,facets:{},fields:[f('cores','核心数 / 结构',`${cores} 核（${layout}）`),f('threads','线程数',`${threads} 线程`),f('baseClock','基础频率',`${base} GHz`),f('boostClock','最高加速频率',`${boost.toFixed(1)} GHz（非全核保证）`),f('socket','CPU 插槽',socket),f('baseTdp',brand==='Intel'?'处理器基础功耗':'标称 TDP',`${tdp}W`),...(maxPower?[f('maxPower','最大睿频功耗',`${maxPower}W`)]:[]),f('integratedGraphics','核显',graphics),f('package','包装版本','盒装；不与散片混比')],
      analysis:{summary:`${name} 为 ${socket} 平台 ${cores} 核 ${threads} 线程型号。${intent}`,idealFor:[intent,graphics==='无核显'?'已有独立显卡且主板支持该 CPU 的台式机':'需要基础显示、故障排查或按需使用核显的台式机'],tradeoffs:[caution,`${socket} 与 BIOS 必须匹配；主板内存代际也须单独核对。`,graphics==='无核显'?'没有可用核显，主板视频接口通常不能在无独显时输出。':`${graphics} 不等于独立游戏显卡，重负载仍需核对图形需求。`,'TDP / 基础功耗不是整机峰值，加速取决于散热、主板限制与工作负载。'],comparisons:[],references:[ref('厂商处理器规格入口',refs[brand==='AMD'?'amdCpu':name.includes('Ultra')?'intelUltra':'intelCpu'])]}}};
}
const driveRows = [
// id,brand,name,decimalGB,kind,interface,form,flash/recording,readMBs/rpm,writeMBs,TBW,cache,date,target,launch,rank,use,limitation
['samsung-980pro-1tb','三星','980 PRO 1TB',1000,'ssd','PCIe 4.0×4 / NVMe','M.2 2280','TLC',7000,5000,600,'独立 DRAM','2020-09-22',599,1899,50,'适合有 PCIe 4.0 M.2 插槽的 1TB 系统盘或项目盘。','1TB 写入规格不能照搬 2TB，需核对固件与散热。'],
['samsung-990pro-2tb','三星','990 PRO 2TB',2000,'ssd','PCIe 4.0×4 / NVMe','M.2 2280','TLC',7450,6900,1200,'独立 DRAM','2022-11-01',1099,2399,10,'2TB 与独立 DRAM 面向较大游戏库、项目和较高强度的存储工作流。','峰值顺序速度需相应接口和散热，小文件访问不会始终达到上限。'],
['wd-sn850x-2tb','西部数据','WD_BLACK SN850X 2TB',2000,'ssd','PCIe 4.0×4 / NVMe','M.2 2280','TLC',7300,6600,1200,'独立 DRAM','2022-08-08',899,2199,20,'2TB 高规格 NVMe 面向较大游戏库和经常访问的项目素材。','有无原厂散热片是不同包装和尺寸条件，应固定版本比价。'],
['wd-sn770-1tb','西部数据','WD_BLACK SN770 1TB',1000,'ssd','PCIe 4.0×4 / NVMe','M.2 2280','TLC',5150,4900,600,'无独立 DRAM；支持 HMB','2022-02-02',399,1099,60,'1TB 无独立 DRAM NVMe 盘适合常规系统、游戏库和日常项目。','HMB 借用主机内存，与独立 DRAM 不同，持续写入须看缓存后表现。'],
['crucial-mx500-1tb','英睿达','MX500 1TB',1000,'ssd','SATA 6Gb/s','2.5 英寸','TLC',560,510,360,'独立 DRAM（需核对硬件修订）','2017-12-19',499,1099,80,'适合无 NVMe 插槽但有 SATA 数据与供电的旧平台升级。','受 SATA 链路限制，2.5 英寸盘需要对应盘位和线缆。'],
['seagate-ironwolf-4tb','希捷','酷狼 IronWolf 4TB ST4000VN006',4000,'hdd','SATA 6Gb/s','3.5 英寸','CMR',5400,null,null,null,'2022-01-01',629,999,20,'4TB CMR NAS 型号适合多盘存储与有额外备份计划的家庭文件服务。','固定 ST4000VN006，不同尾号的转速、缓存和修订不能混合。'],
['wd-sn580-1tb','西部数据','WD Blue SN580 1TB',1000,'ssd','PCIe 4.0×4 / NVMe','M.2 2280','TLC',4150,4150,600,'无独立 DRAM；支持 HMB','2023-06-27',349,599,70,'1TB 日常 NVMe 适合办公、系统和没有特殊持续写入需求的轻量任务。','与 SN770 不同系列，同为 TLC 不代表缓存策略或具体表现相同。'],
['crucial-t500-2tb','英睿达','T500 2TB',2000,'ssd','PCIe 4.0×4 / NVMe','M.2 2280','TLC',7400,7000,1200,'独立 DRAM','2023-10-31',999,1499,30,'2TB PCIe 4.0 高规格盘适合大型素材、游戏库和更多项目空间需求。','有无散热片需分开比价，温度与缓存用尽会影响持续速度。'],
['samsung-990evo-plus-2tb','三星','990 EVO Plus 2TB',2000,'ssd','PCIe 4.0×4 / PCIe 5.0×2 / NVMe','M.2 2280','TLC',7250,6300,1200,'无独立 DRAM；支持 HMB','2024-09-25',899,1499,40,'2TB 混合链路设计适合在核对插槽通道能力后的日常扩容。','PCIe 5.0×2 不等于 5.0×4 高带宽，EVO Plus 也不等于 PRO。'],
['samsung-870evo-1tb','三星','870 EVO 1TB',1000,'ssd','SATA 6Gb/s','2.5 英寸','TLC',560,530,600,'独立 DRAM','2021-01-19',549,999,90,'1TB SATA TLC 面向保留旧平台接口的系统升级与 2.5 英寸设备。','不是 M.2 NVMe，必须确认 SATA 接口、盘位高度和供电。'],
['seagate-ironwolf-8tb','希捷','酷狼 IronWolf 8TB ST8000VN004',8000,'hdd','SATA 6Gb/s','3.5 英寸','CMR',7200,null,null,null,'2019-01-01',1299,1999,10,'8TB 7200 RPM CMR NAS 盘面向多盘容量和频繁修改文件的工作流。','需接受相应噪声、振动和散热需求，其他尾号的 8TB 应另建记录。'],
['seagate-barracuda-8tb','希捷','酷鱼 BarraCuda 8TB ST8000DM004',8000,'hdd','SATA 6Gb/s','3.5 英寸','SMR',5400,null,null,null,'2017-10-01',999,1599,30,'8TB SMR 桌面盘适合低频改写、顺序归档并有额外备份的容量型用途。','SMR 持续随机改写和阵列重建可能波动，不可当作 CMR NAS 盘替代。'],
];
function makeDrive([id,brand,name,gb,kind,interfaceName,form,medium,readOrRpm,write,tbw,cache,releaseDate,target,launch,tierRank,intent,caution]) {
  const cap = `${gb/1000}TB`;
  const ssd = kind==='ssd';
  return {id,category:'storage',brand,name,spec:`${cap} · ${ssd?'SSD':'HDD'} · ${interfaceName} · ${medium}`,releaseDate,target,launch,
    profile:{kind,tierRank,series:ssd?interfaceName.startsWith('SATA')?'SATA SSD':'NVMe SSD':'机械硬盘',facets:{capacityGb:gb},fields:[f('capacity','标称容量',`${cap}（十进制，系统显示会不同）`),f('driveType','介质类型',ssd?'固态硬盘 SSD':'机械硬盘 HDD'),f('interface','接口 / 协议',interfaceName),f('formFactor','外形规格',form),...(ssd?[f('flash','闪存类型',medium),f('sequentialRead','最高顺序读取',`${readOrRpm} MB/s（厂商标称上限）`),f('sequentialWrite','最高顺序写入',`${write} MB/s（缓存内标称上限）`),f('dram','缓存设计',cache),f('endurance','标称写入耐久度',`${tbw} TBW`)]:[f('rpm','主轴转速',`${readOrRpm} RPM`),f('recording','磁记录方式',medium)])],
      analysis:{summary:`${brand}${name} 是 ${cap} ${ssd?`${interfaceName} ${medium} 固态盘`:`${readOrRpm} RPM ${medium} 机械盘`}。${intent}`,idealFor:[intent,ssd?`${interfaceName.startsWith('SATA')?'具备 SATA 供电和数据接口':'具备对应 PCIe / NVMe 插槽'}的平台`:'有 3.5 英寸盘位、SATA 供电且能接受机械盘声音的平台'],tradeoffs:[caution,ssd?'峰值顺序速度不等于所有任务速度，缓存用尽、温度和空闲空间会影响持续写入。':'机械盘随机访问、声音与震动不同于 SSD，容量不能替代全部体验指标。','具体料号、固件与保修条款须核对，任何单盘都不能替代备份。','同系列其他容量的性能和耐久度可能不同，此记录仅对应所列容量。'],comparisons:[],references:[ref('品牌官方存储规格入口',refs[brand==='三星'?'samsung':brand==='西部数据'?'wd':brand==='英睿达'?'crucial':name.includes('BarraCuda')?'seagateDesktop':'seagateNas'])]}}};
}
const compareIds = {
'kingston-ddr4-3200-16':['kingston-ddr4-3200-16-single','gskill-ddr4-3600-16'],
'kingston-ddr4-3200-16-single':['kingston-ddr4-3200-16','kingston-ddr4-3200-32-single'],
'kingston-ddr4-3200-32-single':['kingston-ddr4-3200-32-dual','corsair-ddr4-3200-32'],
'kingston-ddr4-3200-32-dual':['kingston-ddr4-3200-32-single','kingston-ddr4-3200-64-dual'],
'kingston-ddr5-6000-32':['kingston-ddr5-6000-32-single','gskill-ddr5-6000-32'],
'kingston-ddr5-6000-32-single':['kingston-ddr5-6000-32','kingston-ddr5-6000-64-dual'],
'kingston-ddr5-6000-64-dual':['corsair-ddr5-6400-64','kingston-ddr5-6000-32-single'],
'nvidia-rtx-5060-ti-16':['nvidia-rtx-5060-ti-8','nvidia-rtx-4060-ti-16'],
'nvidia-rtx-5060-ti-8':['nvidia-rtx-5060-ti-16','nvidia-rtx-5060'],
'nvidia-rtx-4060-ti-16':['nvidia-rtx-4060-ti-8','nvidia-rtx-5060-ti-16'],
'nvidia-rtx-4060-ti-8':['nvidia-rtx-4060-ti-16','nvidia-rtx-4060'],
'nvidia-rtx-5090':['nvidia-rtx-5090d','nvidia-rtx-5080'],
'nvidia-rtx-5090d':['nvidia-rtx-5090','nvidia-rtx-4090'],
'amd-ryzen-7800x3d':['amd-ryzen-9800x3d','amd-ryzen-7600'],
'amd-ryzen-9800x3d':['amd-ryzen-7800x3d','amd-ryzen-9950x'],
'intel-core-ultra-7-265k':['intel-i9-14900k','amd-ryzen-9950x'],
'seagate-barracuda-8tb':['seagate-ironwolf-8tb','seagate-ironwolf-4tb'],
};
const value = (p,key) => p.profile.fields.find(item=>item.key===key)?.value || '';
function comparison(p,q) {
  const a=p.profile, b=q.profile;
  if(a.kind==='memory') return `${q.name}：${b.facets.capacityGb}GB / ${b.facets.sticks} 条 / ${b.facets.rateMt} MT/s；本型号：${a.facets.capacityGb}GB / ${a.facets.sticks} 条 / ${a.facets.rateMt} MT/s。${a.facets.capacityGb===b.facets.capacityGb && a.facets.sticks!==b.facets.sticks?'容量相同，条数不同，应结合插槽和平台通道布局。':a.series!==b.series?'代际不同，不能安装在同一种内存槽中。':'还需比较单条容量、完整时序与主板兼容性。'}`;
  if(a.kind.endsWith('-gpu')) return `${q.name} 为 ${b.facets.vramGb}GB ${value(q,'memoryType')} / ${value(q,'memoryBus')}；本型号为 ${a.facets.vramGb}GB ${value(p,'memoryType')} / ${value(p,'memoryBus')}。${value(p,'gpuChip')===value(q,'gpuChip')?'同一芯片的显存版本不同，容量翻倍不是计算性能翻倍。':'代际、容量和整卡功率需结合目标软件测试，定位排序不是跑分排名。'}`;
  if(a.kind==='cpu') return `${q.name} 为 ${value(q,'cores')} / ${value(q,'threads')}、${value(q,'socket')}；本型号为 ${value(p,'cores')} / ${value(p,'threads')}、${value(p,'socket')}。${value(p,'socket')!==value(q,'socket')?'插槽不同，升级需重新核对主板与内存配置。':'同插槽仍需核对 BIOS、散热和应用并行度，核心数不是所有任务速度排名。'}`;
  return `${q.name}：${value(q,'capacity')}、${value(q,'interface')}；本型号：${value(p,'capacity')}、${value(p,'interface')}。${a.kind==='hdd'?`对方 ${value(q,'rpm')} / ${value(q,'recording')}，本型号 ${value(p,'rpm')} / ${value(p,'recording')}，容量相同也不等于改写和 NAS 表现相同。`:'还需比较缓存、容量和实际写入任务，峰值顺序速度不是体验的唯一指标。'}`;
}
export const DEMO_PRODUCTS = [...memoryRows.map(makeMemory),...gpuRows.map(makeGpu),...cpuRows.map(makeCpu),...driveRows.map(makeDrive)];
const byId = new Map(DEMO_PRODUCTS.map(p=>[p.id,p]));
for(const product of DEMO_PRODUCTS) {
  const peers = DEMO_PRODUCTS.filter(p=>p.profile.kind===product.profile.kind).sort((a,b)=>a.profile.tierRank-b.profile.tierRank);
  const i = peers.findIndex(p=>p.id===product.id);
  const neighbors = [peers[i+1],peers[i-1],peers[i+2],peers[i-2]].filter(Boolean).map(p=>p.id).slice(0,2);
  product.profile.analysis.comparisons = (compareIds[product.id] || neighbors).map(id=>{
    const other = byId.get(id);
    if(!other) throw new Error(`Unknown comparison ${product.id} -> ${id}`);
    return {productId:id,note:comparison(product,other)};
  });
}
export const DEMO_PROFILES_BY_ID = new Map(DEMO_PRODUCTS.map(p=>[p.id,p.profile]));
