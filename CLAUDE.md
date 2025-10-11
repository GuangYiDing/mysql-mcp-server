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

#### 基础配置（需手动连接）
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

#### 高级配置（自动连接数据源）✨ 推荐
```json
{
  "mcpServers": {
    "mysql": {
      "command": "node",
      "args": ["/ABSOLUTE/PATH/TO/mysql-mcp-server/build/index.js"],
      "env": {
        "MYSQL_DATASOURCES": "|dev|root:password@localhost:3306/dev_db;|test|test:pass@192.168.1.100/test_db;",
        "MYSQL_DANGER_MODE": "false"
      }
    }
  }
}
```

**环境变量说明**:
- `MYSQL_DATASOURCES`: 简化格式的数据源配置字符串
  - 格式: `|连接名称|连接字符串;|连接名称2|连接字符串2;`
  - `|名称|` 表示数据源名称（使用竖线包裹）
  - `;` 作为多个数据源的分隔符（末尾可以有也可以没有分号）
  - 连接字符串格式: `username:password@host:port/database` (port和database可选)
  - 示例: `|dev|root:pass@localhost/db;|prod|user:pass@192.168.1.1:3306/prod_db;`
  - 服务器启动时会自动初始化所有配置的连接
  - 第一个连接会自动设为活动连接
  - ✨ 无需转义引号，配置更简洁直观

- `MYSQL_DANGER_MODE`: 全局危险模式开关 (`"true"` 或 `"false"`)
  - `false`(默认): 执行 INSERT/UPDATE/DELETE 等危险操作时必须在调用时设置 `dangerousMode=true`
  - `true`: 全局启用危险模式，所有危险操作无需额外确认
  - ⚠️ 生产环境建议保持 `false`

⚠️ 配置注意事项:
- 必须使用绝对路径
- 修改配置后需要完全重启 Claude Desktop
- 密码会明文存储在配置文件中，请注意安全性

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

**连接管理工具** (4个)
1. **connect** - 手动建立命名数据库连接（可选工具）
   - 💡 **提示**: 如果已配置环境变量 `MYSQL_DATASOURCES`，服务器启动时会自动连接，无需调用此工具
   - **主要用途**:
     - 未配置环境变量时，手动建立连接
     - 运行时动态添加新的数据库连接
   - 参数 `connectionName` (默认"default"): 连接的唯一标识符
   - 支持两种方式: 连接字符串(`username:password@host:port/database`)或独立参数
   - 连接字符串中 port 和 database 是可选的，默认端口3306
   - 示例: `root:password@localhost`, `root:password@localhost:3306/mydb`, `root:password@localhost/mydb`
   - 第一个连接会自动设为当前活动连接
2. **list_connections** - 列出所有已建立的连接及其状态
3. **switch_connection** - 切换当前活动连接
4. **disconnect** - 断开指定连接

**数据库操作工具** (6个)
5. **query** - 执行 SELECT 查询
   - 可选参数 `connectionName`: 指定使用哪个连接,默认使用当前活动连接
6. **execute** - 执行 INSERT/UPDATE/DELETE 等修改操作
   - ⚠️ **危险模式保护**: 执行危险操作需要启用危险模式
   - 两种启用方式:
     1. 参数方式: 调用时设置 `dangerousMode=true`
     2. 全局方式: 在配置中设置 `MYSQL_DANGER_MODE="true"` (优先级低于参数方式)
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

### 环境变量配置系统 (✨ 新特性)

**工作原理**:
1. Claude Desktop 通过配置文件的 `env` 字段传递环境变量给 MCP 服务器
2. 服务器启动时 `initializeFromEnvironment()` 函数读取环境变量
3. 自动解析并初始化配置的所有数据源连接
4. 设置全局危险模式配置

**启动流程**:
```
main()
  → server.connect(transport)
  → initializeFromEnvironment()
    → 读取 MYSQL_DANGER_MODE
    → 读取 MYSQL_DATASOURCES
    → 解析 JSON 数据源配置
    → 逐个初始化连接池并测试连接
    → 输出启动日志
```

**优势**:
- **即插即用**: 无需手动调用 connect 工具
- **多环境支持**: 可预配置开发、测试、生产等多个环境
- **安全控制**: 集中管理危险模式设置
- **启动验证**: 服务器启动时验证所有连接可用性

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

### 方式一: 环境变量自动连接 (✨ 推荐)
**配置 Claude Desktop**:
```json
{
  "mcpServers": {
    "mysql": {
      "command": "node",
      "args": ["/path/to/build/index.js"],
      "env": {
        "MYSQL_DATASOURCES": "|dev|root:pass@localhost/dev_db;|test|root:pass@localhost/test_db;|prod|root:pass@prod-server/prod_db;",
        "MYSQL_DANGER_MODE": "false"
      }
    }
  }
}
```

**使用连接**:
```typescript
// 启动时已自动连接,直接使用
list_connections()  // 显示: dev (活动), test, prod

// 使用当前活动连接
query({ sql: "SELECT * FROM users LIMIT 10" })  // 使用 dev 连接

// 切换到其他连接
switch_connection({ connectionName: "prod" })

// 显式指定连接
query({ sql: "SELECT COUNT(*) FROM orders", connectionName: "test" })
```

### 方式二: 手动连接
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
