import type { Metadata, Viewport } from "next";
import "@fontsource-variable/inter";
import type { ReactNode } from "react";
import "./globals.css";

const vercelUrl =
  process.env.VERCEL_PROJECT_PRODUCTION_URL ?? process.env.VERCEL_URL;
const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL ??
  (vercelUrl ? `https://${vercelUrl}` : "http://localhost:3000");


export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  applicationName: "AstraOS",
  title: "AstraOS - 自主营收智能",
  description:
    "为现代团队打造的 AI 运营层，让每个信号、工作流与决策清晰协同。",
  keywords: [
    "AI 软件服务",
    "营收智能",
    "工作流自动化",
    "管理运营",
    "自主运营"
  ],
  alternates: {
    canonical: "/"
  },
  openGraph: {
    url: "/",
    siteName: "AstraOS",
    title: "AstraOS - 自主营收智能",
    description:
      "由预测智能驱动，为现代团队打造的电影级业务指挥中心。",
    type: "website",
    images: [
      {
        url: "/og-image.svg",
        width: 1200,
        height: 630,
        alt: "AstraOS 高级业务指挥界面"
      }
    ]
  },
  twitter: {
    card: "summary_large_image",
    title: "AstraOS - 自主营收智能",
    description:
      "由预测智能驱动，为现代团队打造的电影级业务指挥中心。",
    images: ["/og-image.svg"]
  },
  robots: {
    index: true,
    follow: true
  }
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#050816"
};

const structuredData = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "AstraOS",
  applicationCategory: "BusinessApplication",
  operatingSystem: "Web",
  description:
    "将业务信号转化为可治理决策与工作流的 AI 运营层。",
  offers: {
    "@type": "AggregateOffer",
    lowPrice: "89",
    highPrice: "249",
    priceCurrency: "USD"
  }
};

export default function RootLayout({
  children
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <html lang="zh-CN" className="scroll-smooth">
      <body className="bg-void font-sans text-white antialiased">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
        />
        {children}
      </body>
    </html>
  );
}
