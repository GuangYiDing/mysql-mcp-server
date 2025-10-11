# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 项目概述

这是一个 MySQL MCP (Model Context Protocol) 服务器,用于通过 MCP 协议与 MySQL 数据库进行交互。项目使用 TypeScript 编写,通过 stdio 传输与 Claude Desktop 通信。

## 开发命令

### 构建和开发
```bash
# 安装依赖
npm install

# 构建项目 (TypeScript → JavaScript + 声明文件)
npm run build

# 开发模式 (监听文件变化并自动重新编译)
npm run dev
```

### 测试
目前项目没有自动化测试。测试需要:
1. 运行 `npm run build` 构建项目
2. 配置 Claude Desktop (见下方)
3. 在 Claude Desktop 中手动测试工具

### Claude Desktop 配置
编辑配置文件:
- **macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
- **Windows**: `%APPDATA%\Claude\claude_desktop_config.json`

添加配置:
```json
{
  "mcpServers": {
    "mysql": {
      "command": "node",
      "args": ["/ABSOLUTE/PATH/TO/mysql-mcp-server/build/index.js"]
    }
  }
}
```

⚠️ 必须使用绝对路径,修改后需要完全重启 Claude Desktop。

## 架构说明

### 单文件架构
所有代码都在 `src/index.ts` 中,采用线性结构便于理解和维护:
1. 类型定义和全局状态
2. 辅助函数
3. MCP 工具注册
4. 服务器初始化

### 核心组件

**多连接池管理** (✨ 新特性)
- 使用 `Map<string, Pool>` 存储多个命名连接池,支持同时管理多个数据库连接
- 每个连接通过唯一名称标识(如 'project1', 'production', 'test')
- 维护当前活动连接(`currentConnection`),默认使用该连接执行操作
- 连接池配置: 每个连接最多 10 个并发连接,无队列限制
- `parseConnectionString()`: 解析连接字符串 `username:password@host:port/database` (port和database可选)
- `initializePool(name, config)`: 初始化/重置指定名称的连接池
- `getConnection(connectionName?)`: 获取连接,可选择指定连接名称或使用当前活动连接

**MCP 工具系统**
项目提供 10 个工具:

**连接管理工具** (3个)
1. **connect** - 建立命名数据库连接
   - 参数 `connectionName` (默认"default"): 连接的唯一标识符
   - 支持两种方式: 连接字符串(`username:password@host:port/database`)或独立参数
   - 连接字符串中 port 和 database 是可选的,默认端口3306
   - 示例: `root:password@localhost`, `root:password@localhost:3306/mydb`, `root:password@localhost/mydb`
   - 第一个连接会自动设为当前活动连接
2. **list_connections** - 列出所有已建立的连接及其状态
3. **switch_connection** - 切换当前活动连接
4. **disconnect** - 断开指定连接

**数据库操作工具** (6个)
5. **query** - 执行 SELECT 查询
   - 可选参数 `connectionName`: 指定使用哪个连接,默认使用当前活动连接
6. **execute** - 执行 INSERT/UPDATE/DELETE 等修改操作
   - ⚠️ **危险模式保护**: 执行危险操作必须设置 `dangerousMode=true`
   - 受保护的操作: INSERT, UPDATE, DELETE, DROP, ALTER, TRUNCATE, CREATE, RENAME, REPLACE
   - 这是为了防止意外的数据修改或删除操作
   - 可选参数 `connectionName`: 指定使用哪个连接
7. **explain** - 查看 SQL 查询语句的执行计划,支持多种格式
   - `default`: 传统表格格式
   - `json`: JSON 格式,便于程序解析
   - `tree`: 树形格式(MySQL 8.0.16+)
   - `analyze`: 实际执行并显示统计信息(MySQL 8.0.18+)
   - 可选参数 `connectionName`: 指定使用哪个连接
8. **list_databases** - 列出所有数据库
9. **list_tables** - 列出表及详细信息 (✨ 增强功能)
   - 显示表名、表注释和创建时间
   - 按创建时间倒序排列（最新的表在前面）
   - 可选参数 `database`: 指定数据库名称
   - 可选参数 `connectionName`: 指定使用哪个连接
10. **describe_table** - 获取表的完整DDL和详细信息 (✨ 增强功能)
   - 支持三种输出格式:
     - `ddl`: 仅显示 CREATE TABLE DDL语句
     - `structure`: 仅显示字段结构(传统 DESCRIBE 输出)
     - `both`: 显示完整信息(默认),包括:
       - DDL定义语句
       - 字段结构详情
       - 索引信息
       - 表状态(存储引擎、字符集、行数、数据大小、索引大小等)
   - 可选参数 `connectionName`: 指定使用哪个连接

所有数据库操作工具都支持 `connectionName` 可选参数来指定使用哪个连接,如果不指定则使用当前活动连接。

**explain 工具特别说明**
- 用于分析和优化 SQL 查询性能
- `analyze` 格式会实际执行查询,生产环境需谨慎使用
- 不同格式对 MySQL 版本有要求,错误信息会提示版本要求

**错误处理模式**
- 每个工具使用 try-catch-finally 结构
- 连接在 finally 块中释放回连接池
- 错误通过 `isError: true` 标记并返回用户友好的错误消息
- 使用 `console.error` 记录日志(不会显示给用户)

**参数验证**
- 使用 zod 定义参数 schema
- 参数在工具调用时自动验证
- 所有参数都有清晰的中文描述

### 传输机制
- 使用 `StdioServerTransport` 通过 stdio 与 Claude Desktop 通信
- 服务器启动后在 stderr 输出日志信息
- MCP 协议通信通过 stdin/stdout 进行

## 常见开发任务

### 添加新工具
1. 在 `src/index.ts` 中使用 `server.tool()` 注册新工具
2. 定义 zod schema 验证参数
3. 实现工具逻辑,使用 `getConnection()` 获取数据库连接
4. 确保在 finally 块中释放连接
5. 运行 `npm run build` 重新构建
6. 重启 Claude Desktop 测试

### 修改连接池配置
在 `initializePool()` 函数中修改 `mysql.createPool()` 的配置选项。

### 调试问题
1. 查看 Claude Desktop 的开发者工具控制台
2. 检查 stderr 输出的日志信息
3. 确认 MySQL 服务器运行状态
4. 验证连接参数和权限

## 安全注意事项

1. **不要在代码或日志中暴露敏感信息**
   - 密码不会在 console.error 日志中显示
   - 错误消息经过过滤,不暴露内部实现细节

2. **SQL 注入防护**
   - mysql2 支持参数化查询
   - 对于表名和数据库名,使用反引号包裹: \`${database}\`
   - 避免直接拼接用户输入到 SQL 语句

3. **权限限制**
   - 建议为 MCP 服务器创建专用的 MySQL 用户
   - 仅授予必要的操作权限

4. **危险模式保护** (新增功能)
   - `isDangerousSQL()` 函数检测危险操作关键词
   - execute 工具要求 `dangerousMode=true` 才能执行危险操作
   - 受保护的操作: INSERT, UPDATE, DELETE, DROP, ALTER, TRUNCATE, CREATE, RENAME, REPLACE
   - 函数会移除 SQL 注释并检查语句开头,防止注入绕过

## 技术栈
- **TypeScript 5.x**: ES2022 目标,Node16 模块系统
- **@modelcontextprotocol/sdk**: MCP 协议实现
- **mysql2/promise**: MySQL 客户端 (Promise API)
- **zod**: 运行时参数验证

## 项目限制
- 不支持存储过程和触发器操作
- 大数据量查询可能导致超时或内存问题
- 没有自动化测试套件

## 多连接使用示例

### 典型工作流程
```typescript
// 1. 建立多个连接
connect({ connectionName: "dev", connectionString: "root:pass@localhost/dev_db" })
connect({ connectionName: "test", connectionString: "root:pass@localhost/test_db" })
connect({ connectionName: "prod", connectionString: "root:pass@prod-server/prod_db" })

// 2. 查看所有连接
list_connections()  // 显示: dev (活动), test, prod

// 3. 使用当前活动连接
query({ sql: "SELECT * FROM users LIMIT 10" })  // 使用 dev 连接

// 4. 切换到其他连接
switch_connection({ connectionName: "prod" })

// 5. 显式指定连接
query({ sql: "SELECT COUNT(*) FROM orders", connectionName: "test" })

// 6. 断开不需要的连接
disconnect({ connectionName: "test" })
```

### 多项目场景
适用于需要同时操作多个数据库的场景:
- 跨环境数据对比 (开发/测试/生产)
- 数据迁移和同步
- 多租户系统管理
- 微服务架构中的多数据库操作
