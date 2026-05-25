import type { StopCondition, ToolSet } from 'ai';

export function successToolCall<T extends ToolSet>(
  toolName: string
): StopCondition<T> {
  return ({ steps }) =>
    steps.at(-1)?.toolResults?.some((toolResult) => {
      const { output } = toolResult;
      return (
        toolResult.toolName === toolName &&
        typeof output === 'object' &&
        output !== null &&
        'success' in output &&
        output.success === true
      );
    }) ?? false;
}
