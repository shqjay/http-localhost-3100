# AstraOS 注册后端配置

## 1. 创建 Supabase 数据表

在 Supabase SQL Editor 中运行 supabase/migrations/20260713_create_users.sql。

该表只允许服务端 service_role 访问，浏览器无法直接读取或修改申请数据。

## 2. 配置 Resend

1. 在 Resend 验证发件域名。
2. 创建 API Key。
3. 将验证后的发件地址写入 RESEND_FROM_EMAIL。

## 3. 配置 Vercel 环境变量

根据 .env.example 在 Vercel 项目中添加所有必填变量，然后重新部署。

SUPABASE_SERVICE_ROLE_KEY、RESEND_API_KEY 和 ADMIN_ACTION_SECRET 只能配置在服务器环境变量中，不能使用 NEXT_PUBLIC_ 前缀。

## 4. 工作流程

1. 用户在 /register/ 提交 QQ 邮箱。
2. Vercel API 将申请写入 Supabase，状态为 pending。
3. Resend 向管理员发送带签名、7 天有效的同意和拒绝链接。
4. 管理员点击链接后，Supabase 状态更新为 approved 或 rejected。
5. 重复提交会直接返回当前审核状态，不会创建重复用户。