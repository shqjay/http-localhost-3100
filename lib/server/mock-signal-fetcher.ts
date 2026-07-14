import "server-only";

export type MockSignal = {
  source: string;
  title: string;
  level: "high" | "medium" | "low";
  content: string;
  suggestion: string;
  raw_data?: unknown;
};

/**
 * 演示抓取器。接入真实渠道后，只需用真实实现替换此函数的内容。
 */
export async function mockFetchSignals(): Promise<MockSignal[]> {
  await new Promise((resolve) => setTimeout(resolve, 600));

  return [
    {
      source: "竞品监测",
      title: "竞品 A 主力产品降价 10%",
      level: "high",
      content:
        "监测到竞品 A 于今日下调主力产品价格 10%，预计将冲击我方转化率。",
      suggestion: "建议立即评估是否跟进调价，或加大定向促销力度。",
      raw_data: { price_before: 199, price_now: 179 }
    },
    {
      source: "流量趋势",
      title: "小红书流量环比上涨 28%",
      level: "medium",
      content: "近 3 日小红书渠道 UV 持续上涨，主要来自关键词“性价比”。",
      suggestion: "建议增加相关关键词投放预算，锁定转化窗口。",
      raw_data: { uv: 12800, growth: "28%" }
    },
    {
      source: "库存预警",
      title: "SKU-8823 库存低于安全线",
      level: "high",
      content: "当前库存仅剩 42 件，预计 2 日内售罄。",
      suggestion: "建议立即发起补货流程，避免断货影响评分。",
      raw_data: { sku: "8823", stock: 42 }
    }
  ];
}
