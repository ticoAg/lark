# 里程碑 03 - 命令层接管 MCP 对外暴露

状态：done

## 目标

让 MCP 对外只暴露 facade 工具，raw tool 仅保留为内部执行层。

## 实现项

- [x] 抽出 raw tool 执行入口
- [x] `lark_run` 路由到 raw handler
- [x] `initOAPIMcpServer` 默认注册 facade 而不是 raw tools
- [x] 保持 token / oauth / useUAT 行为在命令层下仍然可用

## 验收标准

- MCP server 外部只看到 `lark_ls/help/run/explain`
- facade 能稳定调用原有 raw OpenAPI handler
