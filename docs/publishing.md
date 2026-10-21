# 免费发布公开看板

这个仓库提供 GitHub Pages 展示版。发布成功后，网站有固定网址，关闭电脑和开发环境后仍可打开，不需要另注册托管账户。

## 首次开启

如果仓库已经成功部署，直接使用网站地址即可；下面步骤用于尚未开启 Pages 或重新配置时。

1. 打开仓库的 [Settings → Pages](https://github.com/newallansales-stack/-/settings/pages)，在 **Build and deployment → Source** 选择 **GitHub Actions**。这一步需要仓库管理权限。
2. 打开仓库的 [Actions](https://github.com/newallansales-stack/-/actions)，选择 **Deploy hardware dashboard to GitHub Pages**。如果尚未自动运行，点 **Run workflow**，选择 `main` 后运行。
3. 等待 `Test and build public dashboard` 和 `Publish dashboard` 都出现绿色勾。部署记录中的网址是最终访问地址。

在未配置自定义域名的情况下，预期网址是：

**https://newallansales-stack.github.io/-/**

这是部署成功后的预期地址；提交代码或生成文件本身不代表网站已经上线。首次发布可能需要几分钟；如出现 404，先确认 Actions 部署成功以及 Pages 的 Source 已选为 GitHub Actions。

以后向 `main` 推送更新会自动测试、构建和发布。也可以在 Actions 里再次运行工作流，刷新展示快照。仓库及 Pages 功能需要保持可用，网址才能继续访问。

## 展示版包含什么

- 66 个内存、显卡、CPU、存储型号 / 参考配置，参数分项筛选、逐型号分析及最多 3 款并排对比。
- 16 个内存配置、23 个消费级显卡条目、5 款专业显卡、10 款 CPU、12 个存储条目。
- 新增“历史文章报价”：免费旧文章中的人民币商品卡片报价，支持年份与品类筛选、原文证据、周柱和 CSV/JSON 下载；不宣称逐日市场或成交覆盖。[历史口径](historical-data.md)。
- 新增独立“已收录报价”档案，实际收录中关村在线、太平洋电脑网的公开参考/转引价格、参数与来源链接；按口径独立显示图表、支持 CSV/JSON 下载。它们未确认为当前可购价或成交价，不代表完整历史。见 [公开数据说明](public-data.md)。
- 原 66 个规格条目的未经核实价格仍留空；原有合成报价未恢复。[旧价格核查](price-audit.md)。
- 构建时生成的纯规格目录，浏览时不依赖后端服务器。CSV 导出仅含规格，价格和报价日期为空，状态标记为 `unverified`。

GitHub Pages 托管静态网页，GitHub Actions 负责每日北京时间 09:15 计划采集公开页面、保存 `datasets/public-prices.json` 并重新发布。任务可能延迟，失败时旧记录保留。手动运行工作流时可选 `refresh_prices`。这不会恢复 2020 年以来未保存的历史，也不提供共享的在线导入数据库；私有记录导入仍用 Node.js 后端。

Pages 网站面向公众。此发布流程打包公开报价档案与规格目录，不打包模拟价格、本地 SQLite 数据库、真实导入记录、`.env` 文件或采集凭据；默认快照函数不读取用户数据库。

## 本地验证发布文件

```bash
npm ci
npm test
npm run build:pages
```

发布文件保存在 `pages/`。GitHub Actions 使用相同命令，通过官方 `configure-pages`、`upload-pages-artifact` 和 `deploy-pages` 操作发布，无需为此添加 API 密钥或个人访问令牌。

工作流不会尝试用默认 `GITHUB_TOKEN` 自动开启 Pages：GitHub 官方 `configure-pages@v5` 的 `enablement` 功能需要额外权限的令牌。上面的 Settings 操作完成后，默认工作流权限足以正常部署。
