# 全量价格复核记录

审计日期：2026-10-21（北京时间）。范围：原公开演示快照的 24 个产品，以及本次扩展后的 66 个规格目录条目。

## 后续公开数据整理

2026-10-21 重试联网后，已新增独立公开报价观察档案，首批 378 个来源型号、589 条记录；参考价与转引电商报价分开，不当作当前可购价或成交价。规格目录的原 ¥721 没有恢复。该进展、实际日期范围与缺口见 [公开数据说明](public-data.md)。下列旧网络结果是当时的证据，并非声称所有站点现在仍不可访问。

## 审计结论

**本次成功核验的中国市场当前零售报价：0 条；所有 66 个目录条目的真实价格状态均为“待核验”。**

用户指出的金士顿 DDR5 32GB（16GB×2）、6000、CL36 显示 ¥721，来自程序生成的演示价格，不是电商实时报价，也没有可购买的已核验商品链接。该价格不能用作购买参考，不能用其他猜测金额替换。

连带的演示历史最低价、涨跌幅、周线及平台比较，也不是实际成交或真实历史价格。规格目录的正确性和价格的真实性必须分别检查。

## ¥721 的溯源证据

审计时读取旧版 `src/standalone/snapshot.json`：

- `generatedAt`：`2026-10-21T06:03:06.283Z`，快照日期 `2026-10-21`，24 个产品。
- `dashboard.mode`：`demo`。
- `kingston-ddr5-6000-32`：`currentPrice: 721`，`lowPrice: 559`，来源名称 `京东自营（演示）`。
- `server/database.mjs` 的 `demoPrice()` 使用目录的 `target` / `launch` 参数、指数衰减、正弦周期、哈希扰动和预设促销项计算金额；`seedDemo()` 只写 `mode='demo'`，商品 URL 写为空字符串。
- 审计时以 SQLite 只读连接查询本机 `data/prices.sqlite`，观察记录分组为 `demo: 120636`，没有 `real` 记录。这说明该实例当时没有已导入的真实报价，不能把启动成功当作价格已验证。

上述快照数值仅用于追溯被撤回的演示内容，不是新的零售价格声明。扩展目录中的价格参数同样是演示输入，不能将它们转换为“官方指导价”“最低能买价”或“成交价”。

## 对指定内存的 SKU 核对

原记录只有品牌/系列、32GB 双条、DDR5-6000、CL36，缺少制造商完整料号、RGB/颜色、XMP/EXPO 版本及京东/淘宝 SKU，不能唯一锁定实际商品。

本次把 `KF560C36BBEK2-32` 和 `KF560C36BBK2-32` 当作**待确认的检索候选**，没有把任一候选自动绑定为原记录的真实 SKU。

GitHub 搜索找到并实际读取 [buildcores-open-db 的相关条目](https://github.com/buildcores/buildcores-open-db/blob/10e8b4ac7f5809230a8fd8ce836fc7a595511fee/open-db/RAM/fbcba504-1ad4-49bc-86c4-9ad3143d0e46.json)，原始文件 HTTP 200，条目写有 DDR5-6000 CL36 32GB（2×16GB）和 `KF560C36BBEK2-32`。但同一条目还混列了 `KF552C36BBE-32`，其料号字符串明显不同，不能直接当作同一规格。条目只含国际电商标识，没有可核对的当前中国人民币报价；其中作者标的 `verified: true` 也不等于本看板已核验。

制造商数据表本次无法读取，故没有确认 EAN、XMP/EXPO 的具体版本映射，也没有采用 GitHub 条目的国际站价格或卖家映射来代替中国价格。

## 实际网络请求和结果

时间为北京时间，使用环境既有 HTTPS 代理，保留 TLS 验证；未绕过网络限制、反爬验证或登录。

| 检索/请求 | 请求时间 | 实际结果 | 是否获得有效价格 |
| --- | --- | --- | --- |
| `search.jd.com/Search?keyword=KF560C36BBEK2-32&enc=utf-8` | 2026-10-21 14:49:13 | `Tunnel connection failed: 403 Forbidden` | 否 |
| `s.taobao.com/search?q=KF560C36BBEK2-32` | 同上 | 代理隧道 403 | 否 |
| `list.tmall.com/search_product.htm?q=KF560C36BBEK2-32` | 同上 | 代理隧道 403 | 否 |
| `search.smzdm.com/?c=home&s=KF560C36BBEK2-32` | 同上 | 代理隧道 403 | 否 |
| `s.manmanbuy.com/default.aspx?key=KF560C36BBEK2-32` | 同上 | 代理隧道 403 | 否 |
| `www.kingston.com/en/memory/search?partid=KF560C36BBEK2-32` | 同上 | 代理隧道 403 | 无法核对官方料号 |
| `www.kingston.com/datasheets/KF560C36BBEK2-32.pdf` | 同上 | 代理隧道 403 | 无法核对官方料号 |
| `www.kingston.com/datasheets/KF560C36BBK2-32.pdf` | 2026-10-21 14:49:54 | 代理隧道 403 | 无法核对官方料号 |
| 京东搜索 RTX 5090 32GB | 2026-10-21 14:49:54 | 代理隧道 403 | 否 |
| 京东搜索 Ryzen 9800X3D 盒装 | 同上 | 代理隧道 403 | 否 |
| 京东搜索三星 990 PRO 2TB | 同上 | 代理隧道 403 | 否 |
| `item.jd.com/` 连通性检查 | 同上 | 代理隧道 403 | 否；没有具体商品映射 |
| `p.3.cn/prices/mgets?skuIds=J_100012043978` 端点连通性检查 | 2026-10-21 14:49:13 / 14:49:54 | HTTP 503，正文 `upstream connect error or disconnect/reset before headers. reset reason: remote connection failure` | 否；测试 ID 未绑定指定内存，不可当作商品报价 |
| `detail.zol.com.cn/index.php?c=SearchList&keyword=KF560C36BBEK2-32` | 同上 | HTTP 503，openresty 的 Service Temporarily Unavailable 页面 | 否 |

403 是当前环境代理拒绝；503 只是观察到的上游失败。这些结果均不证明商家停售、网站关闭、商品不存在或用户买不到任何价格。也没有从搜索标题、过期促销、国际市场汇率换算或第三方模拟数据补出一个人民币数字。

## 网络设置所需域名

若继续核价，需要通过支持的云环境设置流程添加所需目标域名并保存后重新请求。建议仅增加实际工作所需精确域名；不要把访问范围改成无限制：

- 京东：`search.jd.com`、`item.jd.com`、`p.3.cn`
- 淘宝/天猫：`s.taobao.com`、`item.taobao.com`、`list.tmall.com`、`detail.tmall.com`
- 价格/促销参考：`search.smzdm.com`、`www.smzdm.com`、`s.manmanbuy.com`、`www.manmanbuy.com`、`detail.zol.com.cn`
- 制造商料号核对：`www.kingston.com`

域名可访问后仍需验证页面的 SKU、价格、库存、地域及优惠条件，不能自动宣布完成核价。公开可读页面若要求登录或验证码，应保留未核验状态，不绕过验证。

## 报价成为“已核验”前的最低证据

每条报价至少保留：制造商料号/平台 SKU、总容量及条数等完整规格、商家和商品直链、观察时间及时区、人民币金额与计价单位、全新/二手、单件/套装、是否有货、地区/税费/运费，以及会员/券/满减/国补/以旧换新等限制。

- 页面零售标价只能称为“挂牌/可见报价”，不能称为“实际成交价”；成交价需要订单或可验证的成交记录。
- 条件优惠价与无门槛价分别保存，不能只把最低的限制性数字展示成每个人都能买到。
- 历史最低价只能说“已收录且口径一致的记录最低”，不能宣称全网历史最低。
- 只有搜索结果或系列名称而无明确规格时，不能对照生成“已核验”价格。
- 用户导入的文件应标注为用户提供记录；文件通过格式校验不等于价格真实性已被外部核验。

## 全量目录核验清单

以下清单由审计时实际加载的 `server/catalog.mjs` 导出，共 **66** 项。每项状态均为“真实报价待核验”；不会沿用原演示金额作为真实当前价。新增型号的专业分析与规格链接不构成价格证据。

### 内存

| ID | 品牌 / 型号 | 规格 | 真实报价状态 |
| --- | --- | --- | --- |
| corsair-ddr4-3200-32 | 海盗船 复仇者 LPX DDR4 32GB 双条 | 32GB（16GB×2）· DDR4-3200 MT/s · CL16 · UDIMM | 待核验 |
| kingston-ddr4-3200-16 | 金士顿 FURY Beast DDR4 16GB 双条 | 16GB（8GB×2）· DDR4-3200 MT/s · CL16 · UDIMM | 待核验 |
| gskill-ddr4-3600-32 | 芝奇 焰光戟 DDR4 32GB 双条 | 32GB（16GB×2）· DDR4-3600 MT/s · CL18 · UDIMM | 待核验 |
| kingston-ddr5-6000-32 | 金士顿 FURY Beast DDR5 32GB 双条 | 32GB（16GB×2）· DDR5-6000 MT/s · CL36 · UDIMM | 待核验 |
| gskill-ddr5-6000-32 | 芝奇 焰锋戟 DDR5 32GB CL30 双条 | 32GB（16GB×2）· DDR5-6000 MT/s · CL30 · UDIMM | 待核验 |
| corsair-ddr5-6400-64 | 海盗船 复仇者 DDR5 64GB 双条 | 64GB（32GB×2）· DDR5-6400 MT/s · CL32 · UDIMM | 待核验 |
| kingston-ddr4-3200-16-single | 金士顿 FURY Beast DDR4 16GB 单条 | 16GB（16GB×1）· DDR4-3200 MT/s · CL16 · UDIMM | 待核验 |
| kingston-ddr4-3200-32-single | 金士顿 FURY Beast DDR4 32GB 单条 | 32GB（32GB×1）· DDR4-3200 MT/s · CL16 · UDIMM | 待核验 |
| kingston-ddr4-3200-32-dual | 金士顿 FURY Beast DDR4 32GB 双条 | 32GB（16GB×2）· DDR4-3200 MT/s · CL16 · UDIMM | 待核验 |
| kingston-ddr4-3200-64-dual | 金士顿 FURY Beast DDR4 64GB 双条 | 64GB（32GB×2）· DDR4-3200 MT/s · CL16 · UDIMM | 待核验 |
| gskill-ddr4-3600-16 | 芝奇 焰光戟 DDR4 16GB 双条 | 16GB（8GB×2）· DDR4-3600 MT/s · CL18 · UDIMM | 待核验 |
| kingston-ddr5-6000-16-single | 金士顿 FURY Beast DDR5 16GB 单条 | 16GB（16GB×1）· DDR5-6000 MT/s · CL36 · UDIMM | 待核验 |
| kingston-ddr5-6000-32-single | 金士顿 FURY Beast DDR5 32GB 单条 | 32GB（32GB×1）· DDR5-6000 MT/s · CL36 · UDIMM | 待核验 |
| kingston-ddr5-6000-64-dual | 金士顿 FURY Beast DDR5 64GB 双条 | 64GB（32GB×2）· DDR5-6000 MT/s · CL36 · UDIMM | 待核验 |
| gskill-ddr5-7200-48 | 芝奇 幻锋戟 DDR5 48GB 双条 | 48GB（24GB×2）· DDR5-7200 MT/s · CL36 · UDIMM | 待核验 |
| kingston-ddr5-5600-32-sodimm | 金士顿 FURY Impact DDR5 32GB SO-DIMM 双条 | 32GB（16GB×2）· DDR5-5600 MT/s · CL40 · SO-DIMM | 待核验 |

### 显卡（含专业型号）

| ID | 品牌 / 型号 | 规格 | 真实报价状态 |
| --- | --- | --- | --- |
| nvidia-rtx-5090 | NVIDIA GeForce RTX 5090 | 消费级 · 32GB GDDR7 · 512-bit · 全球版本，非大陆供货承诺 | 待核验 |
| nvidia-rtx-5090d | NVIDIA GeForce RTX 5090 D | 消费级 · 32GB GDDR7 · 512-bit · 原始中国区域 5090 D 32GB | 待核验 |
| nvidia-rtx-5080 | NVIDIA GeForce RTX 5080 | 消费级 · 16GB GDDR7 · 256-bit | 待核验 |
| nvidia-rtx-5070-ti | NVIDIA GeForce RTX 5070 Ti | 消费级 · 16GB GDDR7 · 256-bit | 待核验 |
| nvidia-rtx-5070 | NVIDIA GeForce RTX 5070 | 消费级 · 12GB GDDR7 · 192-bit | 待核验 |
| nvidia-rtx-5060-ti-16 | NVIDIA GeForce RTX 5060 Ti 16GB | 消费级 · 16GB GDDR7 · 128-bit | 待核验 |
| nvidia-rtx-5060-ti-8 | NVIDIA GeForce RTX 5060 Ti 8GB | 消费级 · 8GB GDDR7 · 128-bit | 待核验 |
| nvidia-rtx-5060 | NVIDIA GeForce RTX 5060 | 消费级 · 8GB GDDR7 · 128-bit | 待核验 |
| nvidia-rtx-4090 | NVIDIA GeForce RTX 4090 | 消费级 · 24GB GDDR6X · 384-bit | 待核验 |
| nvidia-rtx-4080-super | NVIDIA GeForce RTX 4080 SUPER | 消费级 · 16GB GDDR6X · 256-bit | 待核验 |
| nvidia-rtx-4080 | NVIDIA GeForce RTX 4080 | 消费级 · 16GB GDDR6X · 256-bit | 待核验 |
| nvidia-rtx-4070-ti-super | NVIDIA GeForce RTX 4070 Ti SUPER | 消费级 · 16GB GDDR6X · 256-bit | 待核验 |
| nvidia-rtx-4070-super | NVIDIA GeForce RTX 4070 SUPER | 消费级 · 12GB GDDR6X · 192-bit | 待核验 |
| nvidia-rtx-4070 | NVIDIA GeForce RTX 4070 | 消费级 · 12GB GDDR6X · 192-bit | 待核验 |
| nvidia-rtx-4060-ti-16 | NVIDIA GeForce RTX 4060 Ti 16GB | 消费级 · 16GB GDDR6 · 128-bit | 待核验 |
| nvidia-rtx-4060-ti-8 | NVIDIA GeForce RTX 4060 Ti 8GB | 消费级 · 8GB GDDR6 · 128-bit | 待核验 |
| nvidia-rtx-4060 | NVIDIA GeForce RTX 4060 | 消费级 · 8GB GDDR6 · 128-bit | 待核验 |
| nvidia-rtx-3080 | NVIDIA GeForce RTX 3080 | 消费级 · 10GB GDDR6X · 320-bit | 待核验 |
| nvidia-rtx-3060 | NVIDIA GeForce RTX 3060 | 消费级 · 12GB GDDR6 · 192-bit | 待核验 |
| amd-rx-9070xt | AMD Radeon RX 9070 XT | 消费级 · 16GB GDDR6 · 256-bit | 待核验 |
| amd-rx-9070 | AMD Radeon RX 9070 | 消费级 · 16GB GDDR6 · 256-bit | 待核验 |
| amd-rx-7900xtx | AMD Radeon RX 7900 XTX | 消费级 · 24GB GDDR6 · 384-bit | 待核验 |
| amd-rx-7800xt | AMD Radeon RX 7800 XT | 消费级 · 16GB GDDR6 · 256-bit | 待核验 |
| nvidia-rtx-pro-6000-blackwell | NVIDIA RTX PRO 6000 Blackwell Workstation Edition | 专业工作站 · 96GB GDDR7 ECC · 512-bit | 待核验 |
| nvidia-rtx-6000-ada | NVIDIA RTX 6000 Ada Generation | 专业工作站 · 48GB GDDR6 ECC · 384-bit | 待核验 |
| nvidia-rtx-5000-ada | NVIDIA RTX 5000 Ada Generation | 专业工作站 · 32GB GDDR6 ECC · 256-bit | 待核验 |
| nvidia-rtx-4000-ada | NVIDIA RTX 4000 Ada Generation | 专业工作站 · 20GB GDDR6 ECC · 160-bit | 待核验 |
| nvidia-rtx-a4000 | NVIDIA RTX A4000 | 专业工作站 · 16GB GDDR6 ECC · 256-bit | 待核验 |

### CPU

| ID | 品牌 / 型号 | 规格 | 真实报价状态 |
| --- | --- | --- | --- |
| amd-ryzen-7800x3d | AMD Ryzen 7 7800X3D | 8 核 16 线程 · AM5 · 盒装 · 含核显 | 待核验 |
| amd-ryzen-9800x3d | AMD Ryzen 7 9800X3D | 8 核 16 线程 · AM5 · 盒装 · 含核显 | 待核验 |
| amd-ryzen-5700x | AMD Ryzen 7 5700X | 8 核 16 线程 · AM4 · 盒装 · 无核显 | 待核验 |
| intel-i5-12400f | Intel Core i5-12400F | 6 核 12 线程 · LGA1700 · 盒装 · 无核显 | 待核验 |
| intel-i5-14600kf | Intel Core i5-14600KF | 14 核 20 线程 · LGA1700 · 盒装 · 无核显 | 待核验 |
| amd-ryzen-9950x | AMD Ryzen 9 9950X | 16 核 32 线程 · AM5 · 盒装 · 含核显 | 待核验 |
| amd-ryzen-5600 | AMD Ryzen 5 5600 | 6 核 12 线程 · AM4 · 盒装 · 无核显 | 待核验 |
| amd-ryzen-7600 | AMD Ryzen 5 7600 | 6 核 12 线程 · AM5 · 盒装 · 含核显 | 待核验 |
| intel-i9-14900k | Intel Core i9-14900K | 24 核 32 线程 · LGA1700 · 盒装 · 含核显 | 待核验 |
| intel-core-ultra-7-265k | Intel Core Ultra 7 265K | 20 核 20 线程 · LGA1851 · 盒装 · 含核显 | 待核验 |

### 存储

| ID | 品牌 / 型号 | 规格 | 真实报价状态 |
| --- | --- | --- | --- |
| samsung-980pro-1tb | 三星 980 PRO 1TB | 1TB · SSD · PCIe 4.0×4 / NVMe · TLC | 待核验 |
| samsung-990pro-2tb | 三星 990 PRO 2TB | 2TB · SSD · PCIe 4.0×4 / NVMe · TLC | 待核验 |
| wd-sn850x-2tb | 西部数据 WD_BLACK SN850X 2TB | 2TB · SSD · PCIe 4.0×4 / NVMe · TLC | 待核验 |
| wd-sn770-1tb | 西部数据 WD_BLACK SN770 1TB | 1TB · SSD · PCIe 4.0×4 / NVMe · TLC | 待核验 |
| crucial-mx500-1tb | 英睿达 MX500 1TB | 1TB · SSD · SATA 6Gb/s · TLC | 待核验 |
| seagate-ironwolf-4tb | 希捷 酷狼 IronWolf 4TB ST4000VN006 | 4TB · HDD · SATA 6Gb/s · CMR | 待核验 |
| wd-sn580-1tb | 西部数据 WD Blue SN580 1TB | 1TB · SSD · PCIe 4.0×4 / NVMe · TLC | 待核验 |
| crucial-t500-2tb | 英睿达 T500 2TB | 2TB · SSD · PCIe 4.0×4 / NVMe · TLC | 待核验 |
| samsung-990evo-plus-2tb | 三星 990 EVO Plus 2TB | 2TB · SSD · PCIe 4.0×4 / PCIe 5.0×2 / NVMe · TLC | 待核验 |
| samsung-870evo-1tb | 三星 870 EVO 1TB | 1TB · SSD · SATA 6Gb/s · TLC | 待核验 |
| seagate-ironwolf-8tb | 希捷 酷狼 IronWolf 8TB ST8000VN004 | 8TB · HDD · SATA 6Gb/s · CMR | 待核验 |
| seagate-barracuda-8tb | 希捷 酷鱼 BarraCuda 8TB ST8000DM004 | 8TB · HDD · SATA 6Gb/s · SMR | 待核验 |
