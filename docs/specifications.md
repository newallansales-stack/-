# 硬件型号与规格口径

核查日期：2026-10-21（北京时间）。本页记录型号区分、规格单位与本次能够实际访问的证据；价格仍按“演示 / 已收录真实记录”区分。规格目录不是价格记录，也不证明中国市场有货。

## 本次验证范围

实际成功读取：

1. [NVIDIA 官方组织 cuda-rust 的 RTX 5090 工作站记录](https://github.com/NVIDIA/cuda-rust/blob/e027ac324f663e8408c13c116d7dddd58d5e8daf/cutile-rs/cutile-benchmarks/paper/MACHINE.md)，固定提交原始文件 HTTP 200。明确列出 **GeForce RTX 5090、Blackwell、32GB GDDR7、512-bit**。这是某一测试机器的硬件记录；其中最大时钟不代表所有公版或非公版的标称 Boost，不用于改写产品频率。
2. [NVIDIA 官方组织 Isaac-GR00T 的硬件指南](https://github.com/NVIDIA/Isaac-GR00T/blob/dac54b313160c201c450f97df0fd74ebd379c892/getting_started/hardware_recommendation.md)，HTTP 200。明确列出 **RTX PRO 6000 Blackwell 96GB**。其机器人模型推理结果只针对该工作负载，不作为显卡综合性能百分比。
3. [NVIDIA 官方组织 GenerativeAIExamples 中的规格配置](https://github.com/NVIDIA/GenerativeAIExamples/blob/203b0de48d1142124842d56d4b40f3733888f5ee/community/ai-vws-sizing-advisor/src/gpu_specs.json)，HTTP 200。其中 `physical_gpus.BSE` 标明 RTX Pro 6000 Blackwell、96GB、GDDR7 with ECC。这是官方组织托管的 community 示例配置，可交叉核对显存信息，不能替代对应版本的完整产品数据表。
4. [docyx/pc-part-dataset 固定快照](https://github.com/docyx/pc-part-dataset/tree/c52a04ca9465c83997ed335f7767b09a2005dd26)，本次重新读取了显卡和 CPU JSON；此前已验证固定提交 raw 下载 HTTP 200。MIT；2025-07-23 的 PCPartPicker 美国市场快照。可以核对型号、显存容量、部分第三方板卡频率、CPU 核心数/频率/TDP；不把其中美元价格导入人民币行情。

实际尝试但被本环境代理拒绝：`www.nvidia.com`、`www.amd.com`、`www.kingston.com` 的下列产品/说明页均返回 `Tunnel connection failed: 403 Forbidden`。因此本页中的官网链接是**来源/复核入口**，不能描述成“本次已成功打开的官方规格页”。未尝试绕过代理或关闭 TLS。

## 消费级显卡的区分

以下显存容量在上述 PCPartPicker 快照中找到了实际对应记录。表中“定位”是同品牌、同代产品线内的目录定位，不是跨代或跨品牌的统一跑分。

| 品牌/系列 | 型号 | 独立规格 | 产品线定位 |
| --- | --- | --- | --- |
| NVIDIA RTX 50 | RTX 5090 | 32GB GDDR7 | 同代旗舰 |
| NVIDIA RTX 50 | RTX 5080 | 16GB GDDR7 | 同代高端 |
| NVIDIA RTX 50 | RTX 5070 Ti | 16GB GDDR7 | 同代中高端 |
| NVIDIA RTX 50 | RTX 5070 | 12GB GDDR7 | 同代性能级 |
| NVIDIA RTX 50 | RTX 5060 Ti | 16GB GDDR7 | 同代主流增强；大显存规格 |
| NVIDIA RTX 50 | RTX 5060 Ti | 8GB GDDR7 | 同代主流增强；8GB 规格 |
| NVIDIA RTX 50 | RTX 5060 | 8GB GDDR7 | 同代主流 |
| NVIDIA RTX 40 | RTX 4090 | 24GB GDDR6X | 同代旗舰 |
| NVIDIA RTX 40 | RTX 4080 SUPER | 16GB GDDR6X | 同代高端 |
| NVIDIA RTX 40 | RTX 4070 Ti SUPER | 16GB GDDR6X | 同代中高端 |
| NVIDIA RTX 40 | RTX 4070 SUPER | 12GB GDDR6X | 同代性能级 |
| NVIDIA RTX 40 | RTX 4060 Ti | 16GB GDDR6 | 同代主流增强；大显存规格 |
| NVIDIA RTX 40 | RTX 4060 Ti | 8GB GDDR6 | 同代主流增强；8GB 规格 |
| NVIDIA RTX 40 | RTX 4060 | 8GB GDDR6 | 同代主流 |
| AMD RX 9000 | RX 9070 XT | 16GB GDDR6 | 该系列高端 |
| AMD RX 9000 | RX 9070 | 16GB GDDR6 | 该系列性能级 |
| AMD RX 7000 | RX 7900 XTX | 24GB GDDR6 | 同代旗舰 |
| AMD RX 7000 | RX 7900 XT | 20GB GDDR6 | 同代高端 |
| AMD RX 7000 | RX 7800 XT | 16GB GDDR6 | 同代性能级 |

显存类型来自这些型号的公开标称规格，官网页面本次未成功连接；容量另有实际下载的快照交叉核对。不要把快照没有的显存类型、位宽或功耗字段描述成已由该快照验证。

需要保留的边界：

- RTX 5060 Ti 8GB/16GB、RTX 4060 Ti 8GB/16GB 必须是不同规格条目；16GB 不意味着所有负载速度比 8GB 翻倍。
- **RTX 5090 与 RTX 5090 D / 5090 D V2 不合并**。全球版型号的目录记录不代表中国大陆的官方销售可用性，型号后缀和区域版本必须保留。
- 消费级、专业工作站、服务器加速卡分组。价格高或显存大，不等于游戏帧率更高。
- 不用“CUDA 核心数 / 流处理器数 / 显存 / 型号数字”直接换算统一性能百分比；跨品牌核心数尤其不能直接比较。
- “产品定位”排序建议先品牌与代际分组，再同代旗舰→高端→性能级→主流。跨代强弱要依赖明确的游戏/渲染/AI 测试，而不是目录排序。
- 非公版厂商的 OC、散热、供电与尺寸是另外的 SKU 维度；通用芯片型号的参考规格不保证每张板卡相同。

参考官网入口（本次代理拒绝访问）：

- [RTX 5090](https://www.nvidia.com/en-us/geforce/graphics-cards/50-series/rtx-5090/)
- [RTX 5080](https://www.nvidia.com/en-us/geforce/graphics-cards/50-series/rtx-5080/)
- [RTX 5070 系列](https://www.nvidia.com/en-us/geforce/graphics-cards/50-series/rtx-5070-family/)
- [RTX 5060 系列](https://www.nvidia.com/en-us/geforce/graphics-cards/50-series/rtx-5060-family/)
- [RTX 4090](https://www.nvidia.com/en-us/geforce/graphics-cards/40-series/rtx-4090/)
- [RTX 4080 系列](https://www.nvidia.com/en-us/geforce/graphics-cards/40-series/rtx-4080-family/)
- [RTX 4070 系列](https://www.nvidia.com/en-us/geforce/graphics-cards/40-series/rtx-4070-family/)
- [RTX 4060 系列](https://www.nvidia.com/en-us/geforce/graphics-cards/40-series/rtx-4060-family/)
- [Radeon RX 9070 XT](https://www.amd.com/en/products/graphics/desktops/radeon/9000-series/amd-radeon-rx-9070xt.html)
- [Radeon RX 7900 XTX](https://www.amd.com/en/products/graphics/amd-radeon-rx-7900xtx)

## 部分频率的交叉核对

GPU Boost 频率使用 GHz，内存有效数据率另用 Gbps，二者不能混写。实际读取的快照例子：

| GPU | 实际快照例子 | 可以核对的内容 |
| --- | --- | --- |
| RTX 5070 | NVIDIA Founders Edition：`boost_clock: 2510` | 2.51GHz 的标称参考频率 |
| RTX 5060 Ti | 多款非公版：`boost_clock: 2572` | 2.57GHz 为四舍五入展示；具体 OC 型号另有更高值 |
| RTX 5060 | 多款非公版：`boost_clock: 2497` | 约 2.50GHz；不是所有非公版统一频率 |
| RX 9070 XT | Sapphire PULSE：`boost_clock: 2970` | 2.97GHz |
| RX 9070 | Sapphire PULSE：`boost_clock: 2520` | 2.52GHz |

快照没有显卡功耗字段；如目录显示 5070/5060 Ti/5060 的 250/180/145W 或 RX 9070 XT/9070 的 304/220W，它们属于公开标称参考值，需以制造商具体产品页面复核，不声称本次已经读取官方功耗表。实际性能还受负载、温度、功耗限制和非公版配置影响。

## 专业显卡

| 型号 | 规格区分 | 本次证据与限制 |
| --- | --- | --- |
| RTX 6000 Ada Generation | 48GB，GDDR6 ECC，专业工作站 | 快照确有 PNY `RTX 6000 Ada Generation`、48GB；完整类型与 ECC 以对应官方数据表为准 |
| RTX PRO 6000 Blackwell | 96GB，GDDR7 ECC | NVIDIA 官方组织的硬件指南与示例配置实际读取成功，交叉核对 96GB/GDDR7 ECC |

- **RTX 6000 Ada** 与 **RTX PRO 6000 Blackwell** 是不同架构、不同型号，不能因名称都有“6000”而合并。
- Blackwell 的 Workstation Edition、Max-Q Workstation Edition、Server Edition 要保留版本信息；同为 96GB 也不能共用功耗、散热和供电规格。
- 专业型号主频如没有明确的厂商参考值，应显示“未标注”，不要从游戏卡或某个超频结果推算。
- 官网参考：[RTX 6000 Ada](https://www.nvidia.com/en-us/design-visualization/rtx-6000/)、[RTX PRO 6000](https://www.nvidia.com/en-us/products/workstations/professional-desktop-gpus/rtx-pro-6000/)；本次均被代理拒绝。

## 内存：容量、条数、频率和通道

推荐结构字段：`generation`（DDR4/DDR5）、`capacityGB`（总容量）、`modules`（条数）、`moduleCapacityGB`（每条容量）、`transferRateMTs`（有效传输率）、`casLatency`（CL）、`formFactor`（UDIMM/SO-DIMM）、`ecc`、`xmp/expo`（若明确）、`voltage`（若明确）。

- **DDR5-6000 应显示为 6000 MT/s**。常用工具读到的 I/O/DRAM 时钟约为 3000MHz；不是 6000MHz 的物理时钟。DDR4-3200 同理为 3200MT/s，常见显示时钟约 1600MHz。不要把 I/O 时钟和芯片内部阵列时钟混为一谈。
- 32GB（16GB×2）是 **总容量 32GB、两条套装**；32GB（32GB×1）是 **总容量 32GB、单条**。同容量也要分别记录价格。
- 套装“2 条”不保证实际双通道运行；还取决于 CPU、主板、插槽位置和 BIOS。双通道状态不能仅由商品条数断言。
- DDR5 单根 DIMM 的两个 32-bit 子通道，也不等于平台装两根内存后的双通道配置。
- XMP/EXPO 档位是超频配置，不等于所有主板/CPU 默认或保证可达的速度；JEDEC 默认速度应单独说明。
- CL 是周期数，不是纳秒。CAS 理论延迟可粗算 `2000 × CL / MT/s`（ns）：6000 CL30 与 6400 CL32 都约 10ns。该值仅是 CAS 部分，不是整个平台实测延迟或整体性能。
- 型号不足以确定 ECC、颗粒和单双 Rank 时，保留未知；不要从容量或品牌推定。

官网说明复核入口：[Kingston DDR5 介绍](https://www.kingston.com/en/blog/gaming/what-is-ddr5-memory)、[FURY Beast DDR5](https://www.kingston.com/en/memory/gaming/kingston-fury-beast-ddr5-memory)。本次代理拒绝，单位和通道说明属于标准术语校正，不能称为本次已读取这两页的内容。

## CPU

下列 CPU 的核心数、基础/Boost 频率、TDP 已在实际读取的 PCPartPicker 快照中交叉核对；线程数和 AM5 来自其公开型号规格。AMD Boost 是满足条件时的最大加速频率，不是全核保证值。

| 型号 | 核心 / 线程 | 基础 / 最大 Boost | 标称 TDP | 插槽 |
| --- | --- | --- | --- | --- |
| Ryzen 9 9950X3D | 16 / 32 | 4.3 / 5.7GHz | 170W | AM5 |
| Ryzen 7 9800X3D | 8 / 16 | 4.7 / 5.2GHz | 120W | AM5 |
| Ryzen 7 7800X3D | 8 / 16 | 4.2 / 5.0GHz | 120W | AM5 |
| Ryzen 9 9950X | 16 / 32 | 4.3 / 5.7GHz | 170W | AM5 |

- 9950X3D 的多核心规格不能直接推出它在所有游戏中比 9800X3D 快某个固定百分比；游戏、多线程生产力和功耗应各看明确实测。
- Intel 混合架构需要保留 P 核/E 核构成，不能用“总核心数×2”推线程数。例如 Core Ultra 9 285K 是 24 核 24 线程，不是 48 线程。
- AMD TDP、Intel Processor Base Power / Maximum Turbo Power 等名词口径不同；不要只写一个“功耗”再跨品牌直接比较。
- 盒装/散片、CPU 本体与含散热器套装的价格口径应分开；相同处理器型号不能保证供货、保修和附件相同。

官方规格复核入口（本次代理拒绝）：

- [Ryzen 9 9950X3D](https://www.amd.com/en/products/processors/desktops/ryzen/9000-series/amd-ryzen-9-9950x3d.html)
- [Ryzen 7 9800X3D](https://www.amd.com/en/products/processors/desktops/ryzen/9000-series/amd-ryzen-7-9800x3d.html)

## 上市时间与真实记录

发布会日期、首批开售日期、中国区域上市日期不是同一个概念。产品目录的时间只用于排除不可能的上市前记录；没有可靠日期时，不把推测日期包装成精确开售日。全球版 RTX 5090 记录不证明 RTX 5090 D 在中国的任意一天售价或供应情况。

价格图按实际收录记录生成；规格扩展不产生新的真实历史价格，专业卡也不例外。
