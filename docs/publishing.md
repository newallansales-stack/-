# 免费发布公开看板

这个仓库提供 GitHub Pages 在线工作台。发布成功后，网站有固定网址，关闭电脑和开发环境后仍可打开，不需要另注册托管账户。

## 首次开启

如果仓库已经成功部署，直接使用网站地址即可；下面步骤用于尚未开启 Pages 或重新配置时。

1. 打开仓库的 [Settings → Pages](https://github.com/newallansales-stack/-/settings/pages)，在 **Build and deployment → Source** 选择 **GitHub Actions**。这一步需要仓库管理权限。
2. 打开仓库的 [Actions](https://github.com/newallansales-stack/-/actions)，选择 **Deploy hardware dashboard to GitHub Pages**。如果尚未自动运行，点 **Run workflow**，选择 `main` 后运行。
3. 等待 `Test and build public dashboard` 和 `Publish dashboard` 都出现绿色勾。部署记录中的网址是最终访问地址。

在未配置自定义域名的情况下，预期网址是：

**https://newallansales-stack.github.io/-/**

这是部署成功后的预期地址；提交代码或生成文件本身不代表网站已经上线。首次发布可能需要几分钟；如出现 404，先确认 Actions 部署成功以及 Pages 的 Source 已选为 GitHub Actions。

以后向 `main` 推送更新会自动测试、构建和发布。也可以在 Actions 里再次运行工作流，刷新展示快照。仓库及 Pages 功能需要保持可用，网址才能继续访问。

## 在线工作台包含什么

- 统一市场整合全部公开来源报价、历史文章、66 个内存、显卡、CPU、存储型号 / 参考配置及本机导入，参数分项筛选、逐型号分析及最多 3 款并排对比。
- 16 个内存配置、23 个消费级显卡条目、5 款专业显卡、10 款 CPU、12 个存储条目。
- 新增“历史文章报价”：免费旧文章中的人民币商品卡片报价，支持年份与品类筛选、原文证据、周柱和 CSV/JSON 下载；不宣称逐日市场或成交覆盖。[历史口径](historical-data.md)。
- 新增独立“已收录报价”档案，实际收录中关村在线、太平洋电脑网的公开参考/转引价格、参数与来源链接；按口径独立显示图表、支持 CSV/JSON 下载。它们未确认为当前可购价或成交价，不代表完整历史。见 [公开数据说明](public-data.md)。
- 原 66 个规格条目的未经核实价格仍留空；原有合成报价未恢复。[旧价格核查](price-audit.md)。
- 规格目录条目保持空价格；其他资料导出保留各自日期口径与证据，不把参考价改称成交价。
- 网页直接导入 CSV：先预览和整批校验，再保存至浏览器 IndexedDB，刷新后保留。私有记录与自选可备份为 JSON，并在另一浏览器合并恢复，已有同一证据记录优先，不用旧备份覆盖后来的编辑。
- 全部来源型号可搜索、自选、查看来源、对比和分享具体型号链接；“导入 / 备份”同时显示逐年历史覆盖与本轮任务结果。

GitHub Pages 托管静态网页，GitHub Actions 负责每日北京时间 09:15 计划采集公开页面、保存 `datasets/public-prices.json` 并重新发布。任务可能延迟，失败时旧记录保留。手动运行工作流时可选 `refresh_prices`。这不会恢复 2020 年以来未保存的历史，也不提供账户同步；网页私有导入保存在本机 IndexedDB，后端 SQLite 仍供独立服务器使用。任一来源采集步骤失败后，仍尝试其他来源并发布任务结果，旧报价继续保留原日期。

Pages 网站面向公众。此发布流程打包公开报价档案与规格目录，不打包模拟价格、本地 SQLite 数据库、真实导入记录、`.env` 文件或采集凭据；默认快照函数不读取用户数据库。

## 本地验证发布文件

```bash
npm ci
npm test
npm run build:pages
```

发布文件保存在 `pages/`，包括独立 `index.html` 和 `data-version.json`。网页每五分钟及重新回到前台时检查发布版本；有新采集数据时提示重载，不自动清掉尚未提交的 CSV。发布验证同时核对 HTML 的 SHA-256、档案时间戳与核心界面功能标识。GitHub Actions 使用相同命令，通过官方 `configure-pages`、`upload-pages-artifact` 和 `deploy-pages` 操作发布，无需为此添加 API 密钥或个人访问令牌。

工作流不会尝试用默认 `GITHUB_TOKEN` 自动开启 Pages：GitHub 官方 `configure-pages@v5` 的 `enablement` 功能需要额外权限的令牌。上面的 Settings 操作完成后，默认工作流权限足以正常部署。
