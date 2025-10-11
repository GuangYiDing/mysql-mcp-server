# MySQL MCP Server

一个用于MySQL数据库操作的Model Context Protocol (MCP)服务器。

## 功能特性

这个MCP服务器提供了以下工具来与MySQL数据库交互:

### 连接管理 ✨ (支持多连接)
- **connect** - 建立命名数据库连接,支持同时管理多个连接
- **list_connections** - 列出所有已建立的连接及其状态
- **switch_connection** - 切换当前活动连接
- **disconnect** - 断开指定连接

### 查询操作
- **query** - 执行SQL查询语句(SELECT)
- **execute** - 执行SQL修改语句(INSERT, UPDATE, DELETE等)
- **explain** - 查看SQL查询语句的执行计划,用于性能分析和优化

### 数据库管理
- **list_databases** - 列出所有数据库
- **list_tables** - 列出指定数据库中的所有表
- **describe_table** - 查看表结构

## 安装

```bash
npm install
npm run build
```

## 使用方法

### 在Claude for Desktop中配置

1. 打开Claude for Desktop配置文件:
   - macOS: `~/Library/Application Support/Claude/claude_desktop_config.json`
   - Windows: `%APPDATA%\Claude\claude_desktop_config.json`

2. 添加服务器配置:

**基础配置**（最简单的方式）
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

**使用环境变量配置**（推荐用于生产环境，保护敏感信息）
```json
{
  "mcpServers": {
    "mysql": {
      "command": "node",
      "args": ["/ABSOLUTE/PATH/TO/mysql-mcp-server/build/index.js"],
      "env": {
        "MYSQL_DEV_HOST": "localhost",
        "MYSQL_DEV_USER": "root",
        "MYSQL_DEV_PASSWORD": "your_dev_password",
        "MYSQL_DEV_DATABASE": "dev_db",
        "MYSQL_PROD_HOST": "prod-server.example.com",
        "MYSQL_PROD_USER": "app_user",
        "MYSQL_PROD_PASSWORD": "your_prod_password",
        "MYSQL_PROD_DATABASE": "prod_db"
      }
    }
  }
}
```

**配置说明**:
- `command`: Node.js 可执行文件路径
- `args`: MCP 服务器脚本的绝对路径（必须是绝对路径）
- `env`: 可选的环境变量配置
  - 可以预先配置多个环境的连接信息
  - 在运行时通过工具调用使用这些环境变量
  - 避免在代码中硬编码敏感信息

**使用环境变量的示例**:
连接时可以引用环境变量：
```
连接到开发数据库，名称为dev，使用环境变量中的配置
```

3. 重启Claude for Desktop

### 使用示例

#### 基础操作

1. **连接数据库 (使用连接字符串)**:
   ```
   使用连接字符串 root:password@localhost:3306/test 连接到MySQL数据库
   ```

   连接字符串格式: `username:password@host:port/database`
   - port 和 database 是可选的
   - 示例: `root:password@localhost` (使用默认端口3306)
   - 示例: `root:password@localhost:3306/test` (指定端口和数据库)
   - 示例: `root:password@localhost/test` (使用默认端口3306,指定数据库)

2. **连接数据库 (使用独立参数)**:
   ```
   连接到MySQL数据库,地址是localhost,端口3306,用户名root,密码password,数据库test
   ```

3. **查询数据**:
   ```
   查询test数据库中users表的所有数据
   ```

4. **列出数据库**:
   ```
   列出所有可用的数据库
   ```

5. **查看表结构**:
   ```
   查看users表的结构
   ```

6. **执行插入操作** (需要危险模式):
   ```
   向users表插入一条记录,name为'John',age为30,并启用危险模式
   ```

7. **执行更新操作** (需要危险模式):
   ```
   更新users表中id为1的记录,设置age为31,启用危险模式
   ```

8. **查看执行计划**:
   ```
   查看这条SQL语句的执行计划: SELECT * FROM users WHERE age > 25
   ```

#### 多连接管理示例 ✨

**场景1: 跨环境数据对比**
```
1. 连接到开发环境数据库,名称为dev
2. 连接到生产环境数据库,名称为prod
3. 列出所有连接
4. 查询dev环境的users表
5. 切换到prod连接
6. 查询prod环境的users表
```

**场景2: 数据迁移**
```
1. 连接源数据库,命名为source
2. 连接目标数据库,命名为target
3. 从source数据库查询要迁移的数据
4. 显式指定使用target连接执行插入操作(需要危险模式)
5. 验证target数据库的数据
```

**场景3: 多项目管理**
```
1. 连接project1数据库
2. 连接project2数据库
3. 连接project3数据库
4. 使用list_connections查看所有连接状态
5. 使用switch_connection快速切换项目
6. 完成后使用disconnect关闭不需要的连接
```

## 工具详情

### 连接管理工具

#### connect
建立命名数据库连接,支持同时管理多个连接

**参数**:
- `connectionName` (string, 默认"default") - 连接的唯一标识符,用于区分不同的数据库连接
- `connectionString` (string, 可选) - 格式: `username:password@host:port/database`
  - port 和 database 是可选的,默认端口为3306
  - 示例: `root:password@localhost`
  - 示例: `root:password@localhost:3306/mydb`
  - 示例: `root:password@localhost/mydb`
- `host` (string, 可选) - MySQL服务器地址
- `port` (number, 可选, 默认3306) - MySQL服务器端口
- `user` (string, 可选) - MySQL用户名
- `password` (string, 可选) - MySQL密码
- `database` (string, 可选) - 数据库名称

**注意**:
- 优先使用 `connectionString`,如果提供则忽略其他参数
- 不使用 `connectionString` 时,必须提供 `host`、`user` 和 `password`
- 第一个建立的连接会自动设为当前活动连接

#### list_connections
列出所有已建立的数据库连接及其状态

**参数**: 无

**返回示例**:
```
数据库连接列表 (共 3 个):

📌 dev ← 当前活动
   地址: localhost:3306
   用户: root
   数据库: dev_db

📌 test
   地址: localhost:3306
   用户: root
   数据库: test_db

📌 prod
   地址: prod-server:3306
   用户: app_user
   数据库: prod_db
```

#### switch_connection
切换当前活动的数据库连接

**参数**:
- `connectionName` (string, 必需) - 要切换到的连接名称

**使用场景**: 在多个数据库之间快速切换,后续操作会使用切换后的连接

#### disconnect
断开指定的数据库连接

**参数**:
- `connectionName` (string, 必需) - 要断开的连接名称

**注意**:
- 如果断开的是当前活动连接,会自动切换到其他可用连接
- 如果没有其他连接,需要重新使用 `connect` 建立连接

### 数据库操作工具

#### query
执行SQL查询语句(SELECT)

**参数**:
- `sql` (string, 必需) - 要执行的SQL查询语句
- `database` (string, 可选) - 切换到指定数据库
- `connectionName` (string, 可选) - 指定使用的连接,默认使用当前活动连接

#### execute
执行SQL修改语句(INSERT, UPDATE, DELETE等)

⚠️ **危险模式保护**: 为了防止意外的数据修改或删除,执行危险操作时必须显式启用 `dangerousMode` 参数。

**参数**:
- `sql` (string, 必需) - 要执行的SQL语句
- `dangerousMode` (boolean, 默认false) - 危险模式开关,执行以下操作时必须设置为 true:
  - `INSERT` - 插入数据
  - `UPDATE` - 更新数据
  - `DELETE` - 删除数据
  - `DROP` - 删除表或数据库
  - `ALTER` - 修改表结构
  - `TRUNCATE` - 清空表
  - `CREATE` - 创建表或数据库
  - `RENAME` - 重命名表
  - `REPLACE` - 替换数据
- `database` (string, 可选) - 切换到指定数据库
- `connectionName` (string, 可选) - 指定使用的连接,默认使用当前活动连接

**示例**:
```json
// ❌ 这会被拒绝 (未启用危险模式)
{"sql": "DELETE FROM users WHERE id=1"}

// ✅ 这会成功执行 (已启用危险模式)
{"sql": "DELETE FROM users WHERE id=1", "dangerousMode": true}

// ✅ 安全操作不需要危险模式
{"sql": "SHOW TABLES"}
```

#### list_databases
列出所有数据库

**参数**:
- `connectionName` (string, 可选) - 指定使用的连接,默认使用当前活动连接

#### list_tables
列出指定数据库中的所有表

**参数**:
- `database` (string, 可选) - 数据库名称(如果已连接到数据库)
- `connectionName` (string, 可选) - 指定使用的连接,默认使用当前活动连接

#### describe_table
查看表结构

**参数**:
- `table` (string, 必需) - 表名称
- `database` (string, 可选) - 数据库名称
- `connectionName` (string, 可选) - 指定使用的连接,默认使用当前活动连接

#### explain
查看SQL查询语句的执行计划,用于分析和优化查询性能

**参数**:
- `sql` (string, 必需) - 要分析的SQL查询语句
- `format` (string, 可选, 默认"default") - 执行计划输出格式
  - `default` - 传统表格格式
  - `json` - JSON格式,更适合程序解析
  - `tree` - 树形格式,更直观(需要MySQL 8.0.16+)
  - `analyze` - 实际执行查询并显示详细统计信息(需要MySQL 8.0.18+,会真实执行查询)
- `database` (string, 可选) - 切换到指定数据库
- `connectionName` (string, 可选) - 指定使用的连接,默认使用当前活动连接

**示例**:
```sql
-- 默认格式
EXPLAIN SELECT * FROM users WHERE age > 25

-- JSON格式
EXPLAIN FORMAT=JSON SELECT * FROM users WHERE age > 25

-- 树形格式(MySQL 8.0.16+)
EXPLAIN FORMAT=TREE SELECT * FROM users WHERE age > 25

-- 分析格式(MySQL 8.0.18+,实际执行查询)
EXPLAIN ANALYZE SELECT * FROM users WHERE age > 25
```

**注意**:
- `analyze` 格式会实际执行查询语句,请谨慎在生产环境使用
- `tree` 和 `analyze` 格式需要较新版本的MySQL支持

## 安全注意事项

⚠️ **重要**:

### 连接安全
- 不要在生产环境中存储明文密码
- 建议使用环境变量来存储敏感信息
- 限制数据库用户权限,只授予必要的操作权限
- 使用防火墙规则限制数据库访问

### 操作安全 - 危险模式保护
为了防止意外的数据修改或删除,本服务器实现了**危险模式保护**机制:

- **默认安全**: 所有危险操作(INSERT/UPDATE/DELETE/DROP/ALTER等)默认被拒绝
- **显式确认**: 必须显式设置 `dangerousMode=true` 才能执行危险操作
- **智能检测**: 自动检测SQL语句类型,识别潜在危险操作
- **操作审计**: 建议在生产环境记录所有危险操作的日志

**受保护的操作类型**:
- 数据修改: `INSERT`, `UPDATE`, `DELETE`, `REPLACE`
- 结构修改: `DROP`, `ALTER`, `TRUNCATE`, `RENAME`
- 对象创建: `CREATE`

**最佳实践**:
1. 在执行危险操作前,先使用 `query` 工具验证目标数据
2. 对于批量操作,建议先在测试环境验证
3. 生产环境中谨慎使用 `DROP` 和 `TRUNCATE` 操作
4. 始终使用 `WHERE` 子句限制 `UPDATE` 和 `DELETE` 的影响范围

## 开发

```bash
# 安装依赖
npm install

# 构建项目
npm run build

# 开发模式(监听文件变化)
npm run dev
```

## 技术栈

- **TypeScript** - 类型安全的JavaScript
- **@modelcontextprotocol/sdk** - MCP SDK
- **mysql2** - MySQL数据库驱动
- **zod** - 参数验证

## 许可证

MIT

## 贡献

欢迎提交问题和拉取请求!

## 相关资源

- [Model Context Protocol 文档](https://modelcontextprotocol.io)
- [MySQL 文档](https://dev.mysql.com/doc/)
- [Claude for Desktop](https://claude.ai/download)
