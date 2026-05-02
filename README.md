# 粉桃打字课

一个粉色主题的打字练习小应用，支持中文、英文和混合练习。

## 功能

- 1000 条练习素材，平均约 100 字左右
- 分类练习：文章、好句、词组、标点、数字、经典、代码
- 难度分级：入门、进阶、熟练、挑战
- 实时统计 WPM、准确率、用时、错误数和进度
- 支持中文输入法 composition，不会在拼音组词时吞输入
- 账号密码注册/登录，账号、设置、成绩、自定义文本保存到 PostgreSQL
- 支持粘贴自定义文本，也支持导入 txt / md / csv / json 纯文本文件

## 本地运行

```bash
npm install
npm run db:migrate
npm run dev
```

第一次运行前需要准备 PostgreSQL 和 `.env`：

```bash
copy .env.example .env
docker compose up -d
npm run db:migrate
```

如果你直接使用本机 PostgreSQL，默认连接是 `127.0.0.1:5432`。如果你用 Docker，也可以把 `.env` 里的 `DATABASE_URL` 改成容器映射出来的连接串。

前端默认跑在 `http://127.0.0.1:5173/`，后端 API 默认跑在 `http://127.0.0.1:3001/`，Vite 会把 `/api` 代理到后端。

## 构建

```bash
npm run build
```
