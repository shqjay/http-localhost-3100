import type { Metadata } from "next";
import { RegisterForm } from "@/components/register-form";

const siteUrl = (
  process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"
).replace(/\/$/, "");

export const metadata: Metadata = {
  title: "申请访问或登录 | AstraOS",
  description: "使用 QQ 邮箱申请 AstraOS 私测访问，或登录已审核账户。",
  alternates: {
    canonical: siteUrl + "/register/"
  },
  openGraph: {
    url: siteUrl + "/register/",
    title: "申请访问或登录 | AstraOS",
    description: "使用 QQ 邮箱申请 AstraOS 私测访问，或登录已审核账户。"
  }
};

export default function RegisterPage() {
  return <RegisterForm />;
}