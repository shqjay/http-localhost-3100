import "server-only";

export type MockSignal = {
  source: string;
  title: string;
  level: "high" | "medium" | "low";
  raw_content: string;
  summary: string;
  suggestion: string;
  raw_data?: unknown;
  created_at: string;
  is_read: boolean;
};

const aiAnalysisMap: Record<
  string,
  { summary: string; advice: string; impact: "high" | "medium" | "low" }
> = {
  上海证券报: {
    summary:
      "上交所发布风险提示，监管趋严，短期市场情绪可能受压制，但长期利于行业出清。",
    advice:
      "建议暂停短线交易，观察后续政策落地，可关注被错杀的优质标的。",
    impact: "high"
  },
  竞品官网: {
    summary:
      "竞品推出低价套餐，抢占下沉市场，我们的价格优势可能被削弱。",
    advice:
      "建议评估利润空间，考虑推出差异化服务包，或联合渠道商做促销对冲。",
    impact: "medium"
  },
  行业论坛: {
    summary:
      "行业观点认为未来三年机会集中在 AI 与医疗结合，目前市场关注度仍较低。",
    advice: "建议成立专项小组研究可行性，提前布局专利或合作资源。",
    impact: "low"
  }
};

export function generateMockSignals(email: string): MockSignal[] {
  void email;
  const now = new Date();
  const sources = ["上海证券报", "竞品官网", "行业论坛"];

  return sources.map((source, index) => {
    const analysis = aiAnalysisMap[source] ?? aiAnalysisMap.行业论坛;
    return {
      source,
      title: source + " · 关键动态",
      raw_content:
        "这里是" + source + "的模拟原始长文本，用于核实摘要与建议的来源。",
      summary: analysis.summary,
      suggestion: analysis.advice,
      level: analysis.impact,
      raw_data: { source, mock: true },
      created_at: new Date(
        now.getTime() - index * 60 * 60 * 1000
      ).toISOString(),
      is_read: false
    };
  });
}

/**
 * 演示抓取器。接入真实渠道后，只需用真实实现替换此函数的内容。
 */
export async function mockFetchSignals(email: string): Promise<MockSignal[]> {
  await new Promise((resolve) => setTimeout(resolve, 600));
  return generateMockSignals(email);
}
