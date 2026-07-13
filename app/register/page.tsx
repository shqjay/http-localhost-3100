import type { Metadata } from "next";
import { RegisterForm } from "@/components/register-form";

const siteUrl = (
  process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"
).replace(/\/$/, "");

export const metadata: Metadata = {
  title: "申请访问 | AstraOS",
  description: "使用 QQ 邮箱提交 AstraOS 邀请制访问申请。",
  alternates: {
    canonical: siteUrl + "/register/"
  },
  openGraph: {
    url: siteUrl + "/register/",
    title: "申请访问 | AstraOS",
    description: "使用 QQ 邮箱提交 AstraOS 邀请制访问申请。"
  }
};

export default function RegisterPage() {
  return <RegisterForm />;
}