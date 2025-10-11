# Changelog

All notable changes to this project will be documented in this file.

## [1.0.0] - 2024-10-12

### Added
- 初始版本发布
- MySQL数据库连接管理
- 基础查询操作(query)
- 基础执行操作(execute)
- 数据库列表查询(list_databases)
- 表列表查询(list_tables)
- 表结构查询(describe_table)
- 完整的TypeScript类型支持
- 连接池管理
- 错误处理和日志记录

### Features
- ✅ 支持通过MCP协议连接MySQL数据库
- ✅ 支持执行SELECT查询
- ✅ 支持执行INSERT/UPDATE/DELETE操作
- ✅ 支持查看数据库和表结构
- ✅ 支持动态切换数据库
- ✅ 连接池复用提升性能

### Security
- 使用连接池管理数据库连接
- 参数化查询预防SQL注入
- 错误信息安全处理
