# AstraOS 后端与情报系统配置

## 1. 注册和审核

`public.users` 保存 QQ 邮箱和 `pending / approved / rejected` 审核状态。密码由 Supabase Auth 哈希保存，不会写入项目数据库或日志。

新申请通过 Resend 向管理员发送审核链接。为了防止邮箱安全扫描器自动提交表单，管理员必须在确认页手动输入：

- 同意：`同意 申请邮箱`
- 拒绝：`拒绝 申请邮箱`

只有确认短语、签名和有效期全部正确时，服务器才更新状态。

## 2. 情报数据

服务器自动创建私有 Supabase Storage 桶 `astra-intelligence`。每个认证账号使用独立路径：

```text
accounts/{auth-user-id}/state.json
```

浏览器不能直接访问该桶，所有读写均经过已审核会话和服务端 `service_role`。

私测版限制：

- 每个账户最多 8 个公开来源。
- 每个来源扫描间隔 6-168 小时。
- 每个账户保留最近 100 条信号和 100 条决策。
- 单次抓取最大 1.5 MB、12 秒超时、最多 3 次重定向。

## 3. 抓取安全

仅允许 HTTP/HTTPS 的 80 或 443 端口。服务器会在每次抓取和重定向前重新解析域名，并阻止：

- localhost、本机与局域网域名。
- 私有、保留、链路本地、组播和云元数据 IP。
- URL 中的用户名和密码。
- robots.txt 明确禁止的路径。
- HTML/XML/JSON 以外的大文件或二进制响应。

用户只应添加自己有权监测的公开来源。系统不会绕过登录、验证码、付费墙或访问控制。

## 4. 决策边界

当前“自主决策”是可解释的建议引擎：它会分类、评分、确定优先级并提出下一步动作，但不会自动修改 CRM、发送邮件、付款或调用第三方写入接口。所有外部执行应在后续集成中保留人工审批和审计记录。

## 5. Vercel 环境变量

必填：

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `RESEND_API_KEY`
- `RESEND_FROM_EMAIL`
- `ADMIN_EMAIL`
- `APP_URL`
- `ADMIN_ACTION_SECRET`
- `CRON_SECRET`

可选：

- `AUTH_SESSION_SECRET`：单独的登录会话签名密钥；未设置时复用 `ADMIN_ACTION_SECRET`。
- `ALLOWED_ORIGINS`：逗号分隔的额外前端来源。
- `NEXT_PUBLIC_REGISTRATION_URL`：静态营销站的注册按钮目标。

所有服务器密钥都不能使用 `NEXT_PUBLIC_` 前缀。

## 6. 自动扫描

`vercel.json` 每天 UTC 01:00 调用 `/api/cron/scan-signals`。Vercel 会把 `CRON_SECRET` 自动放入 `Authorization: Bearer ...` 请求头。Hobby 计划每天执行一次，具体触发时间可能在该小时内浮动。