# 回忆纪念册：Cloudflare 公网公开版

这个仓库里已经包含了一个适合 Cloudflare 免费方案的骨架，用来把图片和音频保存到云端，并让所有人都能访问。

## 你要的目标

- 图片 / 音频可以上传
- 内容永久保存在云端
- 刷新不丢失
- 不依赖本地浏览器缓存
- 任何人访问网页时都能看到

## 所需服务

- Cloudflare Pages（前端）
- Cloudflare R2（储存图片/音频）
- Cloudflare D1（保存媒体元数据）
- Cloudflare Workers / Pages Functions（上传与读取接口）

## 关键文件

- `wrangler.toml`：Cloudflare 配置
- `src/worker.js`：上传/读取/删除接口

## 部署步骤

1. 安装 Wrangler
   ```bash
   npm install -g wrangler
   ```

2. 登录 Cloudflare
   ```bash
   wrangler login
   ```

3. 创建 R2 bucket
   ```bash
   wrangler r2 bucket create memory-album-media
   ```

4. 创建 D1 database
   ```bash
   wrangler d1 create memory-album
   ```

5. 把 `wrangler.toml` 里的以下字段替换成实际值：
   - `database_id`
   - `PUBLIC_BASE_URL`

6. 部署 Worker
   ```bash
   wrangler deploy
   ```

7. 把前端页面指向发布后的 Worker URL
   例如：
   - `https://your-worker.example.workers.dev/api/media`

## 说明

- `PUBLIC_BASE_URL` 需要指向一个可公开访问的静态域名或 R2 公开访问域名。
- 如果你希望真正公开访问，最好用自定义域名或 R2 自定义域名来做公开 URL。
- 免费方案适合个人纪念册、照片归档、小规模公开媒体展示。

## 进一步扩展

你还可以继续做这些增强：

- 上传时增加密码保护
- 只允许特定邮箱访问
- 按日期分组展示照片
- 支持视频文件
- 支持删除和编辑描述
- 支持分页加载和懒加载
