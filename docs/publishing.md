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

- 内存、显卡、CPU、存储的规格筛选、历史走势与周线蜡烛图。
- 自 2020 年起、且不早于商品上市日期的合成演示记录。所有价格都明确标为演示数据，不是真实市场报价。
- 构建当天生成并嵌入网页的数据快照，浏览时不依赖后端服务器。

GitHub Pages 只托管静态网页。展示版不会在后台采集价格，不会自行补齐真实历史记录，也不提供共享的在线导入数据库；快照只在重新构建发布时更新。需要导入、保存真实数据或每天自动采集时，使用仓库的 Node.js 后端部署方式，参见 [README](../README.md) 和 [数据说明](data.md)。

Pages 网站面向公众，即使某些付费方案允许从私有仓库发布，网站内容也应按公开内容处理。此发布流程只打包演示快照，不打包本地 SQLite 数据库、真实导入记录、`.env` 文件或采集凭据；不要把这些内容加入静态页面或提交到仓库。

## 本地验证发布文件

```bash
npm ci
npm test
npm run build:pages
```

发布文件保存在 `pages/`。GitHub Actions 使用相同命令，通过官方 `configure-pages`、`upload-pages-artifact` 和 `deploy-pages` 操作发布，无需为此添加 API 密钥或个人访问令牌。

工作流不会尝试用默认 `GITHUB_TOKEN` 自动开启 Pages：GitHub 官方 `configure-pages@v5` 的 `enablement` 功能需要额外权限的令牌。上面的 Settings 操作完成后，默认工作流权限足以正常部署。
