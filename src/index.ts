#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import mysql from "mysql2/promise";

// MySQL连接配置接口
interface MySQLConfig {
  host: string;
  port: number;
  user: string;
  password: string;
  database?: string;
}

// 连接信息接口（用于显示）
interface ConnectionInfo {
  name: string;
  host: string;
  port: number;
  user: string;
  database?: string;
  active: boolean;
}

// 全局连接池集合（使用Map管理多个连接）
const pools = new Map<string, mysql.Pool>();
// 存储连接配置（不包含密码，用于显示）
const connectionConfigs = new Map<string, Omit<MySQLConfig, "password">>();
// 当前活动连接
let currentConnection: string | null = null;
// 全局危险模式配置（从环境变量读取，默认false）
let globalDangerMode = false;

// 创建MCP服务器实例
const server = new McpServer({
  name: "mysql-mcp-server",
  version: "1.0.0",
  capabilities: {
    resources: {},
    tools: {},
  },
});

// 解析连接字符串: username:password@host:port/database
function parseConnectionString(connectionString: string): MySQLConfig {
  // 格式: username:password@host:port/database
  // port 和 database 是可选的
  const regex = /^([^:]+):([^@]+)@([^:/]+)(?::(\d+))?(?:\/(.+))?$/;
  const match = connectionString.match(regex);

  if (!match) {
    throw new Error(
      "连接字符串格式错误。正确格式: username:password@host:port/database (port和database可选)"
    );
  }

  const [, user, password, host, portStr, database] = match;

  return {
    host,
    port: portStr ? parseInt(portStr, 10) : 3306,
    user,
    password,
    database: database || undefined,
  };
}

// 初始化MySQL连接池
function initializePool(name: string, config: MySQLConfig) {
  // 如果连接已存在，先关闭
  if (pools.has(name)) {
    pools.get(name)?.end();
  }

  const pool = mysql.createPool({
    host: config.host,
    port: config.port,
    user: config.user,
    password: config.password,
    database: config.database,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
  });

  pools.set(name, pool);

  // 存储连接配置（不含密码）
  connectionConfigs.set(name, {
    host: config.host,
    port: config.port,
    user: config.user,
    database: config.database,
  });

  // 如果是第一个连接，自动设为当前连接
  if (!currentConnection) {
    currentConnection = name;
  }

  console.error(`MySQL连接池已初始化: [${name}] ${config.host}:${config.port}`);
}

// 获取连接
async function getConnection(connectionName?: string) {
  // 确定要使用的连接名称
  const name = connectionName || currentConnection;

  if (!name) {
    throw new Error("没有活动的数据库连接。请先使用 connect 工具建立连接。");
  }

  const pool = pools.get(name);
  if (!pool) {
    throw new Error(`连接 "${name}" 不存在。请先使用 connect 工具建立此连接。`);
  }

  return pool.getConnection();
}

// 格式化查询结果
function formatQueryResult(results: any): string {
  if (Array.isArray(results)) {
    if (results.length === 0) {
      return "查询成功,但没有返回结果。";
    }
    return JSON.stringify(results, null, 2);
  }
  return JSON.stringify(results, null, 2);
}

// 检测SQL语句是否为危险操作
function isDangerousSQL(sql: string): boolean {
  // 移除注释和多余空格,转为大写
  const cleanedSQL = sql
    .replace(/--.*$/gm, "") // 移除单行注释
    .replace(/\/\*[\s\S]*?\*\//g, "") // 移除多行注释
    .trim()
    .toUpperCase();

  // 危险操作关键词列表
  const dangerousKeywords = [
    "INSERT",
    "UPDATE",
    "DELETE",
    "DROP",
    "ALTER",
    "TRUNCATE",
    "CREATE",
    "RENAME",
    "REPLACE",
  ];

  // 检查SQL语句是否以危险关键词开头
  return dangerousKeywords.some((keyword) => cleanedSQL.startsWith(keyword));
}

// 注册工具: 连接MySQL数据库
server.tool(
  "connect",
  "连接到MySQL数据库。支持管理多个命名连接，方便在不同项目间切换。\n支持两种连接方式:\n1. 连接字符串: username:password@host:port/database (port和database可选)\n2. 独立参数: 分别提供host、port、user、password、database",
  {
    connectionName: z
      .string()
      .default("default")
      .describe("连接名称,用于标识此连接(如'project1', 'production')。默认为'default'"),
    connectionString: z
      .string()
      .optional()
      .describe(
        "MySQL连接字符串,格式: username:password@host:port/database (port和database可选,例如: root:password@localhost:3306/mydb 或 root:password@localhost)"
      ),
    host: z.string().optional().describe("MySQL服务器地址(当不使用connectionString时)"),
    port: z.number().default(3306).describe("MySQL服务器端口(默认3306)"),
    user: z.string().optional().describe("MySQL用户名(当不使用connectionString时)"),
    password: z.string().optional().describe("MySQL密码(当不使用connectionString时)"),
    database: z.string().optional().describe("数据库名称(可选)"),
  },
  async ({ connectionName, connectionString, host, port, user, password, database }) => {
    try {
      let config: MySQLConfig;

      // 优先使用连接字符串
      if (connectionString) {
        config = parseConnectionString(connectionString);
      } else {
        // 使用独立参数
        if (!host || !user || !password) {
          throw new Error(
            "当不使用connectionString时,必须提供host、user和password参数"
          );
        }
        config = { host, port, user, password, database };
      }

      initializePool(connectionName, config);

      // 测试连接
      const connection = await getConnection(connectionName);
      await connection.ping();
      connection.release();

      const isFirstConnection = pools.size === 1;
      const statusMsg = isFirstConnection
        ? " (已设为当前活动连接)"
        : currentConnection === connectionName
        ? " (已设为当前活动连接)"
        : ` (当前活动连接: ${currentConnection})`;

      return {
        content: [
          {
            type: "text",
            text: `✅ 成功连接到MySQL数据库\n连接名称: ${connectionName}\n地址: ${config.host}:${config.port}${config.database ? `\n数据库: ${config.database}` : ""}${statusMsg}`,
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `❌ 连接失败: ${error instanceof Error ? error.message : String(error)}`,
          },
        ],
        isError: true,
      };
    }
  }
);

// 注册工具: 执行SQL查询
server.tool(
  "query",
  "执行SQL查询语句(SELECT)",
  {
    sql: z.string().describe("要执行的SQL查询语句"),
    database: z.string().optional().describe("切换到指定数据库(可选)"),
    connectionName: z.string().optional().describe("指定使用的连接名称(可选,默认使用当前活动连接)"),
  },
  async ({ sql, database, connectionName }) => {
    let connection;
    try {
      connection = await getConnection(connectionName);

      // 如果指定了数据库,先切换
      if (database) {
        await connection.query(`USE \`${database}\``);
      }

      const [results] = await connection.query(sql);

      return {
        content: [
          {
            type: "text",
            text: formatQueryResult(results),
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `查询失败: ${error instanceof Error ? error.message : String(error)}`,
          },
        ],
        isError: true,
      };
    } finally {
      if (connection) {
        connection.release();
      }
    }
  }
);

// 注册工具: 执行SQL语句(INSERT, UPDATE, DELETE等)
server.tool(
  "execute",
  "执行SQL语句(INSERT, UPDATE, DELETE等修改操作)。\n⚠️ 安全提示: 执行危险操作(INSERT/UPDATE/DELETE/DROP/ALTER等)时,必须设置 dangerousMode=true",
  {
    sql: z.string().describe("要执行的SQL语句"),
    dangerousMode: z
      .boolean()
      .default(false)
      .describe(
        "危险模式开关。执行INSERT/UPDATE/DELETE/DROP/ALTER等危险操作时必须设置为true"
      ),
    database: z.string().optional().describe("切换到指定数据库(可选)"),
    connectionName: z.string().optional().describe("指定使用的连接名称(可选,默认使用当前活动连接)"),
  },
  async ({ sql, dangerousMode, database, connectionName }) => {
    let connection;
    try {
      connection = await getConnection(connectionName);

      // 检查是否为危险操作（参数优先，其次是全局配置）
      const isDangerousModeEnabled = dangerousMode || globalDangerMode;

      if (isDangerousSQL(sql) && !isDangerousModeEnabled) {
        return {
          content: [
            {
              type: "text",
              text:
                "⚠️ 安全警告: 检测到危险SQL操作(INSERT/UPDATE/DELETE/DROP/ALTER等)。\n" +
                "为了安全起见,执行此类操作需要启用危险模式。有两种方式:\n\n" +
                "方式1: 在调用时设置 dangerousMode=true\n" +
                '  {"sql": "DELETE FROM users WHERE id=1", "dangerousMode": true}\n\n' +
                "方式2: 在 Claude Desktop 配置中设置全局危险模式\n" +
                '  "env": {"MYSQL_DANGER_MODE": "true"}\n\n' +
                "这是为了防止意外的数据修改或删除操作。",
            },
          ],
          isError: true,
        };
      }

      // 如果指定了数据库,先切换
      if (database) {
        await connection.query(`USE \`${database}\``);
      }

      const [result] = await connection.query(sql);
      const execResult = result as mysql.ResultSetHeader;

      let message = "✅ SQL语句执行成功。\n";
      if (execResult.affectedRows !== undefined) {
        message += `影响行数: ${execResult.affectedRows}\n`;
      }
      if (execResult.insertId) {
        message += `插入ID: ${execResult.insertId}\n`;
      }
      if (execResult.warningStatus !== undefined && execResult.warningStatus > 0) {
        message += `⚠️ 警告数: ${execResult.warningStatus}`;
      }

      return {
        content: [
          {
            type: "text",
            text: message,
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `❌ 执行失败: ${error instanceof Error ? error.message : String(error)}`,
          },
        ],
        isError: true,
      };
    } finally {
      if (connection) {
        connection.release();
      }
    }
  }
);

// 注册工具: 列出所有数据库
server.tool(
  "list_databases",
  "列出所有数据库",
  {
    connectionName: z.string().optional().describe("指定使用的连接名称(可选,默认使用当前活动连接)"),
  },
  async ({ connectionName }) => {
    let connection;
    try {
      connection = await getConnection(connectionName);
      const [results] = await connection.query("SHOW DATABASES");

      return {
        content: [
          {
            type: "text",
            text: formatQueryResult(results),
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `获取数据库列表失败: ${error instanceof Error ? error.message : String(error)}`,
          },
        ],
        isError: true,
      };
    } finally {
      if (connection) {
        connection.release();
      }
    }
  }
);

// 注册工具: 列出数据库中的所有表
server.tool(
  "list_tables",
  "列出指定数据库中的所有表",
  {
    database: z.string().optional().describe("数据库名称(可选,如果已连接到数据库)"),
    connectionName: z.string().optional().describe("指定使用的连接名称(可选,默认使用当前活动连接)"),
  },
  async ({ database, connectionName }) => {
    let connection;
    try {
      connection = await getConnection(connectionName);

      // 构建查询语句 - 获取表名、注释和创建时间
      const whereClause = database
        ? `table_schema = '${database.replace(/'/g, "''")}'`
        : `table_schema = DATABASE()`;

      const sql = `
        SELECT
          table_name AS '表名',
          table_comment AS '表注释',
          create_time AS '创建时间'
        FROM information_schema.tables
        WHERE ${whereClause}
        ORDER BY create_time DESC
      `;

      const [results] = await connection.query(sql);

      return {
        content: [
          {
            type: "text",
            text: formatQueryResult(results),
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `获取表列表失败: ${error instanceof Error ? error.message : String(error)}`,
          },
        ],
        isError: true,
      };
    } finally {
      if (connection) {
        connection.release();
      }
    }
  }
);

// 注册工具: 获取表的DDL信息
server.tool(
  "describe_table",
  "获取表的完整DDL信息,包括表结构、索引、约束、存储引擎等详细信息",
  {
    table: z.string().describe("表名称"),
    database: z.string().optional().describe("数据库名称(可选)"),
    format: z
      .enum(["ddl", "structure", "both"])
      .default("both")
      .describe(
        "输出格式: ddl(仅DDL语句), structure(仅字段结构), both(DDL+字段结构,默认)"
      ),
    connectionName: z.string().optional().describe("指定使用的连接名称(可选,默认使用当前活动连接)"),
  },
  async ({ table, database, format, connectionName }) => {
    let connection;
    try {
      connection = await getConnection(connectionName);

      // 如果指定了数据库,先切换
      if (database) {
        await connection.query(`USE \`${database}\``);
      }

      let outputText = "";

      // 获取DDL信息
      if (format === "ddl" || format === "both") {
        const [createResults] = await connection.query(`SHOW CREATE TABLE \`${table}\``);
        const createResult = (createResults as any)[0];

        outputText += "=== 表DDL定义 ===\n\n";
        outputText += createResult["Create Table"];
        outputText += "\n";
      }

      // 获取字段结构
      if (format === "structure" || format === "both") {
        const [descResults] = await connection.query(`DESCRIBE \`${table}\``);

        if (format === "both") {
          outputText += "\n\n=== 字段结构详情 ===\n\n";
        }
        outputText += formatQueryResult(descResults);
      }

      // 获取索引信息
      if (format === "both") {
        const [indexResults] = await connection.query(`SHOW INDEX FROM \`${table}\``);

        if (Array.isArray(indexResults) && indexResults.length > 0) {
          outputText += "\n\n=== 索引信息 ===\n\n";
          outputText += formatQueryResult(indexResults);
        }
      }

      // 获取表状态信息
      if (format === "both") {
        const [statusResults] = await connection.query(`SHOW TABLE STATUS LIKE '${table}'`);

        if (Array.isArray(statusResults) && statusResults.length > 0) {
          const status = statusResults[0] as any;
          outputText += "\n\n=== 表状态信息 ===\n\n";
          outputText += `存储引擎: ${status.Engine}\n`;
          outputText += `行格式: ${status.Row_format}\n`;
          outputText += `表记录数: ${status.Rows}\n`;
          outputText += `平均行长度: ${status.Avg_row_length} bytes\n`;
          outputText += `数据大小: ${(status.Data_length / 1024).toFixed(2)} KB\n`;
          outputText += `索引大小: ${(status.Index_length / 1024).toFixed(2)} KB\n`;
          outputText += `字符集: ${status.Collation}\n`;
          if (status.Comment) {
            outputText += `表注释: ${status.Comment}\n`;
          }
        }
      }

      return {
        content: [
          {
            type: "text",
            text: outputText,
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `获取表信息失败: ${error instanceof Error ? error.message : String(error)}`,
          },
        ],
        isError: true,
      };
    } finally {
      if (connection) {
        connection.release();
      }
    }
  }
);

// 注册工具: 查看SQL语句执行计划
server.tool(
  "explain",
  "查看SQL查询语句的执行计划,用于分析和优化查询性能",
  {
    sql: z.string().describe("要分析的SQL查询语句"),
    format: z
      .enum(["default", "json", "tree", "analyze"])
      .default("default")
      .describe(
        "执行计划输出格式: default(传统格式), json(JSON格式), tree(树形格式,MySQL 8.0.16+), analyze(实际执行并显示统计,MySQL 8.0.18+)"
      ),
    database: z.string().optional().describe("切换到指定数据库(可选)"),
    connectionName: z.string().optional().describe("指定使用的连接名称(可选,默认使用当前活动连接)"),
  },
  async ({ sql, format, database, connectionName }) => {
    let connection;
    try {
      connection = await getConnection(connectionName);

      // 如果指定了数据库,先切换
      if (database) {
        await connection.query(`USE \`${database}\``);
      }

      // 构建EXPLAIN语句
      let explainSql: string;
      switch (format) {
        case "json":
          explainSql = `EXPLAIN FORMAT=JSON ${sql}`;
          break;
        case "tree":
          explainSql = `EXPLAIN FORMAT=TREE ${sql}`;
          break;
        case "analyze":
          explainSql = `EXPLAIN ANALYZE ${sql}`;
          break;
        default:
          explainSql = `EXPLAIN ${sql}`;
      }

      const [results] = await connection.query(explainSql);

      // 格式化输出
      let outputText: string;
      if (format === "json" && Array.isArray(results) && results.length > 0) {
        // JSON格式需要解析EXPLAIN列
        const jsonResult = results[0] as any;
        const explainJson = JSON.parse(jsonResult.EXPLAIN);
        outputText = JSON.stringify(explainJson, null, 2);
      } else if (format === "tree" && Array.isArray(results) && results.length > 0) {
        // TREE格式直接返回EXPLAIN列的内容
        const treeResult = results[0] as any;
        outputText = treeResult.EXPLAIN;
      } else {
        outputText = formatQueryResult(results);
      }

      return {
        content: [
          {
            type: "text",
            text: `执行计划 (格式: ${format}):\n\n${outputText}`,
          },
        ],
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);

      // 提供更友好的错误提示
      let helpMessage = "";
      if (errorMessage.includes("FORMAT=TREE")) {
        helpMessage = "\n提示: TREE格式需要MySQL 8.0.16或更高版本。";
      } else if (errorMessage.includes("EXPLAIN ANALYZE")) {
        helpMessage = "\n提示: ANALYZE格式需要MySQL 8.0.18或更高版本。注意: ANALYZE会实际执行查询。";
      }

      return {
        content: [
          {
            type: "text",
            text: `获取执行计划失败: ${errorMessage}${helpMessage}`,
          },
        ],
        isError: true,
      };
    } finally {
      if (connection) {
        connection.release();
      }
    }
  }
);

// 注册工具: 切换当前活动连接
server.tool(
  "switch_connection",
  "切换当前活动的数据库连接",
  {
    connectionName: z.string().describe("要切换到的连接名称"),
  },
  async ({ connectionName }) => {
    try {
      // 检查连接是否存在
      if (!pools.has(connectionName)) {
        const availableConnections = Array.from(pools.keys()).join(", ");
        return {
          content: [
            {
              type: "text",
              text: `❌ 连接 "${connectionName}" 不存在。\n可用连接: ${availableConnections || "无"}`,
            },
          ],
          isError: true,
        };
      }

      // 测试连接是否可用
      const connection = await getConnection(connectionName);
      await connection.ping();
      connection.release();

      // 切换当前连接
      const previousConnection = currentConnection;
      currentConnection = connectionName;

      return {
        content: [
          {
            type: "text",
            text: `✅ 已切换到连接: ${connectionName}${previousConnection ? `\n上一个连接: ${previousConnection}` : ""}`,
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `❌ 切换连接失败: ${error instanceof Error ? error.message : String(error)}`,
          },
        ],
        isError: true,
      };
    }
  }
);

// 注册工具: 列出所有连接
server.tool(
  "list_connections",
  "列出所有已建立的数据库连接",
  {},
  async () => {
    try {
      if (pools.size === 0) {
        return {
          content: [
            {
              type: "text",
              text: "当前没有任何数据库连接。请使用 connect 工具建立连接。",
            },
          ],
        };
      }

      const connections: ConnectionInfo[] = [];

      for (const [name, pool] of pools) {
        const config = connectionConfigs.get(name);
        if (config) {
          connections.push({
            name,
            host: config.host,
            port: config.port,
            user: config.user,
            database: config.database,
            active: name === currentConnection,
          });
        }
      }

      // 格式化输出
      const output = connections
        .map((conn) => {
          const activeMarker = conn.active ? " ← 当前活动" : "";
          return `📌 ${conn.name}${activeMarker}\n   地址: ${conn.host}:${conn.port}\n   用户: ${conn.user}${conn.database ? `\n   数据库: ${conn.database}` : ""}`;
        })
        .join("\n\n");

      return {
        content: [
          {
            type: "text",
            text: `数据库连接列表 (共 ${connections.length} 个):\n\n${output}`,
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `❌ 获取连接列表失败: ${error instanceof Error ? error.message : String(error)}`,
          },
        ],
        isError: true,
      };
    }
  }
);

// 注册工具: 断开指定连接
server.tool(
  "disconnect",
  "断开指定的数据库连接",
  {
    connectionName: z.string().describe("要断开的连接名称"),
  },
  async ({ connectionName }) => {
    try {
      // 检查连接是否存在
      if (!pools.has(connectionName)) {
        return {
          content: [
            {
              type: "text",
              text: `❌ 连接 "${connectionName}" 不存在。`,
            },
          ],
          isError: true,
        };
      }

      // 关闭连接池
      const pool = pools.get(connectionName);
      if (pool) {
        await pool.end();
      }

      // 删除连接
      pools.delete(connectionName);
      connectionConfigs.delete(connectionName);

      // 如果断开的是当前连接，切换到其他连接或清空
      if (currentConnection === connectionName) {
        const remainingConnections = Array.from(pools.keys());
        currentConnection = remainingConnections.length > 0 ? remainingConnections[0] : null;
      }

      const statusMsg = currentConnection
        ? `\n当前活动连接已自动切换到: ${currentConnection}`
        : "\n当前没有活动连接";

      return {
        content: [
          {
            type: "text",
            text: `✅ 已断开连接: ${connectionName}${statusMsg}`,
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `❌ 断开连接失败: ${error instanceof Error ? error.message : String(error)}`,
          },
        ],
        isError: true,
      };
    }
  }
);

// 解析简化的数据源配置字符串
// 格式: |name1|connectionString1;|name2|connectionString2;
function parseDatasourcesString(datasourcesStr: string): Record<string, string> {
  const datasources: Record<string, string> = {};

  // 按分号分割得到每个数据源配置
  const parts = datasourcesStr.split(';').filter(part => part.trim());

  for (const part of parts) {
    // 匹配格式: |name|connectionString
    const match = part.match(/^\|([^|]+)\|(.+)$/);
    if (match) {
      const [, name, connectionString] = match;
      datasources[name.trim()] = connectionString.trim();
    } else {
      console.error(`跳过无效的数据源配置: ${part}`);
    }
  }

  return datasources;
}

// 从环境变量初始化配置
async function initializeFromEnvironment() {
  // 1. 读取危险模式配置
  const dangerModeEnv = process.env.MYSQL_DANGER_MODE;
  if (dangerModeEnv) {
    globalDangerMode = dangerModeEnv.toLowerCase() === "true";
    console.error(`全局危险模式: ${globalDangerMode ? "启用" : "禁用"}`);
  }

  // 2. 读取数据源配置
  const datasourcesEnv = process.env.MYSQL_DATASOURCES;
  if (datasourcesEnv) {
    try {
      // 解析简化格式的数据源配置
      const datasources = parseDatasourcesString(datasourcesEnv);

      const datasourceCount = Object.keys(datasources).length;
      if (datasourceCount === 0) {
        console.error("未检测到有效的数据源配置");
        return;
      }

      console.error(`检测到 ${datasourceCount} 个预配置数据源`);

      // 初始化所有数据源连接
      for (const [name, connectionString] of Object.entries(datasources)) {
        try {
          const config = parseConnectionString(connectionString);
          initializePool(name, config);

          // 测试连接
          const connection = await getConnection(name);
          await connection.ping();
          connection.release();

          console.error(`✓ 数据源 [${name}] 连接成功`);
        } catch (error) {
          console.error(`✗ 数据源 [${name}] 连接失败: ${error instanceof Error ? error.message : String(error)}`);
        }
      }

      if (pools.size > 0) {
        console.error(`成功初始化 ${pools.size} 个数据源连接，当前活动连接: ${currentConnection}`);
      }
    } catch (error) {
      console.error(`解析 MYSQL_DATASOURCES 环境变量失败: ${error instanceof Error ? error.message : String(error)}`);
    }
  } else {
    console.error("未检测到预配置数据源，需要手动使用 connect 工具建立连接");
  }
}

// 主函数
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("MySQL MCP Server 运行在 stdio");

  // 从环境变量初始化配置
  await initializeFromEnvironment();
}

main().catch((error) => {
  console.error("启动服务器时发生致命错误:", error);
  process.exit(1);
});
