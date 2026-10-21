# 中国硬件历史价格公开数据源核查

核查日期：2026-10-20（北京时间）。本次实际读取 GitHub 搜索结果、浅克隆候选仓库，检查数据文件、README、API 说明及 LICENSE；没有把项目简介当作已有历史数据的证明。

## 后续进展（2026-10-21）

新增免费历史来源：IT之家带日期的新闻日历与正文商品卡片，已开始整理 2020 年起的部分旧报价，并配置增量回补。完整口径见 [historical-data.md](historical-data.md)；文章发布日期不等于成交或生效日期。

本次环境连通性发生变化，已读取中关村在线与太平洋电脑网的公开列表/型号页，并发布独立的参考价与转引电商报价档案；未将这些资料标作实时可购价或成交价。新增调查与真实覆盖范围见 [public-data.md](public-data.md)。本报告下述网络状态与仓库检查日期保留为原调查证据；2020 年起完整逐日历史仍未找到。

## 结论

尚未找到能够验证、允许直接复用且覆盖 **2020 年起中国内存条、显卡、CPU、存储各规格每天价格** 的免费公共 API 或开放数据集。没有抓取到的日期不能通过插值、前值填充或生成演示价格变成“真实记录”。已公开的采集程序，也不等于公开了它采集的历史数据库。

找到一个带 MIT 许可证的真实硬件产品/价格快照，可用于国际产品目录参考，但其价格单位是 USD，不能导入中国人民币行情。中国电商官方接口适合从接入之日起积累实际报价；需要申请相应应用权限，且没有证据证明这些接口提供 2020 年以来每日历史。

## 逐项核查

| 来源 | 实际验证的材料 | 时间、市场与许可 | 可用性及处理 |
| --- | --- | --- | --- |
| [docyx/pc-part-dataset](https://github.com/docyx/pc-part-dataset) | 仓库内 JSON/CSV；[API.md](https://github.com/docyx/pc-part-dataset/blob/c52a04ca9465c83997ed335f7767b09a2005dd26/API.md) 明确 `price` 为 USD。CPU 1,413 条、内存 13,553 条、内置存储 6,461 条、显卡 6,636 条。 | README 标注最后更新 2025-07-23；PCPartPicker 美国市场快照，单条记录没有采集日期。仓库 [MIT](https://github.com/docyx/pc-part-dataset/blob/c52a04ca9465c83997ed335f7767b09a2005dd26/LICENSE)。 | 数据确实存在、可以下载；可作规格目录或单独的 USD 参考快照，不可充作中国每日历史价。 |
| [xulicheng1224-arch/guidajia](https://github.com/xulicheng1224-arch/guidajia) | 实际读取 README、`backend/official_api.py`、MIT LICENSE；包含淘宝/天猫采集和京东、淘宝官方 API 接入实现。没有找到提交的历史价格数据库或 CSV。 | 中国市场；本次检出的提交在 2026-10-20。MIT 代码许可。 | 可参考采集架构和官方接口字段；必须自行申请接口权限或使用获授权会话，接入后开始积累，不能回补不存在的历史。未在本环境执行其采集器。 |
| [1742264121/hw-price-tracker](https://github.com/1742264121/hw-price-tracker) | 实际读取 `products.json`、`scraper/main.py`、`data/2026-05.json` 至 `2026-10.json`；14 个产品，CPU/GPU/RAM/SSD/主板。 | 共 45 个采集日期条目，2026-05-16 至 2026-10-20，并非每日；5 月 4 条及 6 月 3 条明确标记 `source: simulated`。5 月文件有“模拟数据 — 仅供项目功能验证，非真实采集价格”。其余记录没有模拟标记，但也不能据此证明真实性。未找到 LICENSE。 | 不能用来满足 2020 年以来每日真实历史的要求。没有导入为真实数据；后续记录仍需核实来源和使用许可。 |
| [axeprpr/xianyu-hardware-monitor](https://github.com/axeprpr/xianyu-hardware-monitor) | 实际读取 README、目录及闲鱼采集器；FastAPI/PostgreSQL/Playwright，包含硬件目录。采集器明确依赖登录状态。 | 闲鱼二手报价；没有提交的历史价格档案。未找到 LICENSE。 | 是采集/看板代码，不是开放历史数据集。二手报价也不宜与全新零售报价直接合并。未执行登录采集。 |
| [OrbitRush/manmanbuy_history](https://github.com/OrbitRush/manmanbuy_history) | 实际读取 README 和文件清单，仅有 Python/JS 查询脚本。 | 检出提交 2018-04-05；README 要求 Python 3.6/PyExecJS；无可下载硬件历史数据，也未找到 LICENSE。 | 老旧第三方查询代码；不等于当前有效的公共 API。没有运行其鉴权/签名处理脚本，也没有承诺其接口可用。 |
| [SurelyTang/historical-price-spider](https://github.com/SurelyTang/historical-price-spider) | 实际读取 README 和文件清单；有若干旧 XLS 和“家电价格数据.rar”，代码使用慢慢买查询。 | 检出提交 2021-10-27；文档未给出硬件 SKU 历史范围或数据许可；未找到 LICENSE。 | 不能确认是所需硬件规格、每日连续序列或可再分发数据；未当作真实行情导入。 |

## 可申请的官方接口

以下名称从已读取的开源接入实现及其引用的官方文档交叉核对；本环境尚未成功连接官方站点，**不是已验证可匿名调用的公共 API**：

- 京东联盟：`jd.union.open.goods.promotiongoodsinfo.query`，返回 `unitPrice`；`jd.union.open.goods.query`，读取 `priceInfo.price`，需要校验返回 SKU。文档：[京东联盟开放平台](https://union.jd.com/openplatform)。
- 淘宝联盟：`taobao.tbk.item.info.get` 返回商品级 `zk_final_price`，不能拿商品级最低价代替一个明确内存容量/显存规格的 SKU 价。[接口说明](https://developer.alibaba.com/docs/api.htm?apiId=24518)。
- 淘宝卖家授权：`taobao.item.sku.get` 可读取授权范围内 SKU 的 `price`，要求应用权限和卖家授权。[接口说明](https://developer.alibaba.com/docs/api.htm?apiId=28)。
- `https://p.3.cn/prices/mgets?skuIds=J_...` 是开源项目常见的京东当前价格请求路径，非本次验证有效的官方开放历史 API；没有证据证明其支持回溯日期，不应以此承诺历史数据。

需要先定义价格口径（标价、券后、会员、国补；全新或二手；含税运费）和具体 SKU，再接入相应合法来源。不同容量、频率、套条数量、显存容量、散片/盒装不能只按营销型号混合。

## 网络实测

- `github.com` 公共仓库搜索、`git clone https://github.com/...` 成功。搜索查询包括 `京东 历史价格`、`manmanbuy`、`显卡价格`、`硬件价格`、`pcpartpicker dataset`、`GPU price history` 等；短时多次查询遇到 GitHub 429，后续降低了频率。
- `raw.githubusercontent.com` 可读取固定提交的数据，避免未来仓库更新造成证据变化。
- `api.github.com`、Google 搜索、`p.3.cn`、`union.jd.com`、`open.taobao.com`、`www.manmanbuy.com`、`www.smzdm.com`、`detail.zol.com.cn`、`www.dramx.com` 请求在当前环境返回代理 `Tunnel connection failed: 403 Forbidden`。这是本环境访问限制，不能据此判断目标站关闭或 API 失效。
- 如果需要继续核实中国站点，应在云环境设置中增加所需精确域名并保存后重试；本报告没有替换未知的网络允许列表，也没有索取或保存账号凭据。

## 可复查的提交

- `docyx/pc-part-dataset`: `c52a04ca9465c83997ed335f7767b09a2005dd26`
- `xulicheng1224-arch/guidajia`: `c5fc2c7ab832bb372189be31ce1b49d6ce431934`
- `1742264121/hw-price-tracker`: `79d42dbe62615aa2656d72ee68d0332a97f40bf2`
- `axeprpr/xianyu-hardware-monitor`: `f2b5dd3b0f35b83795a9c200e9cad5c64131222a`
- `OrbitRush/manmanbuy_history`: `64a5c3115c025b9e3e8940881a6c6b0c4ac5a295`
- `SurelyTang/historical-price-spider`: `50f45b1cda2e25d4158a0fb6f7de651222b7ea7a`

## 推荐接入顺序

1. 保持演示数据与实际报价完全分开；看板直接展示当前真实数据覆盖范围和缺失天数。
2. 从官方获授权接口或有明确使用许可的价格提供方每日记录指定 SKU；保留原始来源、采集时间、币种和价格口径。
3. 仅导入能证明日期、规格、来源和币种的历史 CSV/API 数据；重复导入去重。
4. 若取得旧记录，仅以实际覆盖时间展示；“历史最低价”限定为“已收录记录最低价”，不声称全网历史最低。
5. 为尚未找到的数据保留缺口。2020 年未上市的产品没有上市前价格，不用模拟数据补齐。
