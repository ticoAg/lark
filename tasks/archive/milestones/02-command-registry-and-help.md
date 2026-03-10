# 里程碑 02 - 命令层注册表与帮助系统

状态：done

## 目标

为 `lark-openapi-mcp` 引入统一命令注册表与帮助系统，建立 `[command] [resource] [action]` 语义层和 `ls/help/run/explain` 工具骨架。

## 实现项

- [x] 定义命令注册表结构（command/resource/action/rawTool/identity/help/cite）
- [x] 建立命令域映射与 fallback 规则
- [x] 建立帮助节点解析与 target 寻址规则
- [x] 实现 `lark_ls`
- [x] 实现 `lark_help`
- [x] 实现 `lark_explain`
- [x] 实现统一结果/cite 结构

## 验收标准

- 命令层可枚举、可帮助、可解释。
- 任意命令动作都可追溯到 raw tool 与帮助目标。
