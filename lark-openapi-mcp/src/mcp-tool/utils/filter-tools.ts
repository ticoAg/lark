import { ToolName, ProjectName } from '../tools';
import { McpTool, ToolsFilterOptions, TokenMode } from '../types';

export function isDeprecatedTool(tool: McpTool): boolean {
  return /Deprecated Version \(Not Recommended\)|历史版本（不推荐）/.test(tool.description);
}

export function filterTools(tools: McpTool[], options: ToolsFilterOptions) {
  let filteredTools = tools.filter(
    (tool) =>
      (!isDeprecatedTool(tool) || options.allowDeprecatedTools?.includes(tool.name as ToolName)) &&
      (options.allowTools?.includes(tool.name as ToolName) || options.allowProjects?.includes(tool.project as ProjectName)),
  );

  // Filter by token mode
  if (options.tokenMode && options.tokenMode !== TokenMode.AUTO) {
    filteredTools = filteredTools.filter((tool) => {
      if (!tool.accessTokens) {
        return false;
      }
      if (options.tokenMode === TokenMode.USER_ACCESS_TOKEN) {
        return tool.accessTokens.includes('user');
      }
      if (options.tokenMode === TokenMode.TENANT_ACCESS_TOKEN) {
        return tool.accessTokens.includes('tenant');
      }
      return true;
    });
  }

  return filteredTools;
}
