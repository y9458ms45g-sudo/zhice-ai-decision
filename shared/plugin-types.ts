// ---- plugin:career_planning_suggestion_generate_1 ----
// ============================================================
// 插件 career_planning_suggestion_generate_1 (职业规划与个人发展建议生成) 的类型定义
// 由 get_plugin_ai_json 自动生成
// ============================================================

export interface CareerPlanningSuggestionGenerateOneInput {
  /** 包含用户知识网络节点和卡片内容的提示词，用于生成职业规划建议 */
  prompt: string;
}

/**
 * capabilityClient.load('career_planning_suggestion_generate_1').callStream<CareerPlanningSuggestionGenerateOneOutput>('textGenerate', input)
 * 每个 chunk 就是下面这个扁平对象，字段名与 CareerPlanningSuggestionGenerateOneOutput 一致，外面没有 data / choices / message 包装：
 *   {"content":"示例文本","response":"示例文本"}
 * 返回值可能是 AsyncIterable<chunk>，也可能是 { output: AsyncIterable<chunk> }，取流前先归一化。
 * 逐段累加：
 *   for await (const chunk of stream) { result += chunk.content ?? ''; }
 */
export interface CareerPlanningSuggestionGenerateOneOutput {
  /** [object Object] */
  content: string;
  /** [object Object] */
  response?: string;
}
// ---- end:career_planning_suggestion_generate_1 ----