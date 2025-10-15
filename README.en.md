# 🐬 MySQL MCP Server

[简体中文](README.md) | **English**

[![npm version](https://img.shields.io/npm/v/@nolimit35/mysql-mcp-server?color=blue)](https://www.npmjs.com/package/@nolimit35/mysql-mcp-server)
[![CI](https://github.com/GuangYiDing/mysql-mcp-server/actions/workflows/ci.yml/badge.svg)](https://github.com/GuangYiDing/mysql-mcp-server/actions/workflows/ci.yml)
[![Publish](https://github.com/GuangYiDing/mysql-mcp-server/actions/workflows/publish.yml/badge.svg)](https://github.com/GuangYiDing/mysql-mcp-server/actions/workflows/publish.yml)
[![npm downloads](https://img.shields.io/npm/dm/@nolimit35/mysql-mcp-server)](https://www.npmjs.com/package/@nolimit35/mysql-mcp-server)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

A Model Context Protocol (MCP) server for MySQL database operations.

## ✨ Features

This MCP server provides the following tools for interacting with MySQL databases:

### 🔌 Connection Management (Multiple Connections Support)
- **connect** - Establish named database connections with support for multiple simultaneous connections
- **list_connections** - List all established connections and their status
- **switch_connection** - Switch the current active connection
- **disconnect** - Disconnect a specific connection

### 📊 Query Operations
- **query** - Execute SQL query statements (SELECT)
- **execute** - Execute SQL modification statements (INSERT, UPDATE, DELETE, etc.)
- **explain** - View SQL query execution plans for performance analysis and optimization

### 🗄️ Database Management
- **list_databases** - List all databases
- **list_tables** - List all tables in a specified database
- **describe_table** - View table structure

## 📦 Installation

### Install via npm (Recommended)

```bash
npm install -g @nolimit35/mysql-mcp-server
```

### Build from Source

```bash
git clone https://github.com/GuangYiDing/mysql-mcp-server.git
cd mysql-mcp-server
npm install
npm run build
```

## 🚀 Usage

### Configuration in Claude Code

Multiple configuration methods are available:

#### Method 1: Using npx (Recommended, no global installation required)

Edit the configuration file `~/.claude/settings.json` and add the following configuration:

```json
{
  "mcpServers": {
    "mysql-mcp": {
      "command": "npx",
      "args": [
        "-y",
        "@nolimit35/mysql-mcp-server"
      ],
      "env": {
        "MYSQL_DATASOURCES": "|dev|username:pass@192.168.xx.xx:3306/xxx;",
        "MYSQL_DANGER_MODE": "false",
        "LOG_LEVEL": "INFO",
        "LOG_COLORS": "true"
      }
    }
  }
}
```

#### Method 2: Using Command Line Configuration

Execute the following command in the terminal:

```bash
claude mcp add --transport stdio mysql-mcp --scope user \
  --env MYSQL_DATASOURCES="|dev|username:pass@192.168.xx.xx:3306/xxx;" \
  --env MYSQL_DANGER_MODE=false \
  -- npx -y @nolimit35/mysql-mcp-server
```

#### ⚙️ Configuration Options

- `command`: Execution command (`npx`)
- `args`: Command arguments `["-y", "@nolimit35/mysql-mcp-server"]`
- `env`: Environment variable configuration
  - `MYSQL_DATASOURCES`: Data source configuration, format is `|connection_name|connection_string;`, multiple data sources can be configured separated by semicolons
  - `MYSQL_DANGER_MODE`: Danger mode switch, set to `"true"` to allow modification operations (INSERT/UPDATE/DELETE, etc.)
  - `LOG_LEVEL`: Log level, options: `DEBUG`, `INFO` (default), `WARN`, `ERROR`, `OFF`
  - `LOG_COLORS`: Enable colored log output, default is `"true"`

#### 📝 Data Source Configuration Format
```
|connection_name1|username:password@host:port/database;|connection_name2|username:password@host:port/database;
```

Example:
```
|dev|root:pass123@localhost:3306/dev_db;|prod|app_user:pass456@192.168.1.100:3306/prod_db;
```

After configuration, restart Claude Code for the changes to take effect.

### 💡 Usage Examples

#### 📚 Basic Operations

1. **Connect to Database (from pre-configured datasource)**:
   ```
   Connect to the datasource named dev
   ```
   
   ⚠️ **Note**: The `connect` tool can only connect to datasources that are pre-configured via the `MYSQL_DATASOURCES` environment variable.
   To add a new datasource, modify the `MYSQL_DATASOURCES` environment variable in the configuration file and restart Claude Code.

2. **Query Data**:
   ```
   Query all data from the users table in the test database
   ```

3. **List Databases**:
   ```
   List all available databases
   ```

4. **View Table Structure**:
   ```
   View the structure of the users table
   ```

5. **Execute Insert Operation** (requires danger mode):
   ```
   Insert a record into the users table with name='John' and age=30, with danger mode enabled
   ```

6. **Execute Update Operation** (requires danger mode):
   ```
   Update the users table where id=1, set age to 31, with danger mode enabled
   ```

7. **View Execution Plan**:
   ```
   View the execution plan for this SQL statement: SELECT * FROM users WHERE age > 25
   ```

#### 🔄 Multiple Connection Management Examples

**Scenario 1: Cross-Environment Data Comparison**
```
1. Connect to development environment database, named dev
2. Connect to production environment database, named prod
3. List all connections
4. Query the users table in dev environment
5. Switch to prod connection
6. Query the users table in prod environment
```

**Scenario 2: Data Migration**
```
1. Connect to source database, named source
2. Connect to target database, named target
3. Query data to be migrated from source database
4. Explicitly specify using target connection to execute insert operation (requires danger mode)
5. Verify data in target database
```

**Scenario 3: Multi-Project Management**
```
1. Connect to project1 database
2. Connect to project2 database
3. Connect to project3 database
4. Use list_connections to view all connection statuses
5. Use switch_connection to quickly switch between projects
6. Use disconnect to close unneeded connections when done
```

## 🛠️ Tool Details

### 🔌 Connection Management Tools

#### connect 🔗
Connect to a pre-configured MySQL datasource

⚠️ **Important**: This tool can only connect to datasources that are pre-configured via the `MYSQL_DATASOURCES` environment variable. The server automatically initializes all pre-configured connections on startup.

**Parameters**:
- `connectionName` (string, required) - Name of the datasource to connect to (must be a name pre-configured in the `MYSQL_DATASOURCES` environment variable)

**Features**:
- Connects to pre-configured datasource and sets it as the current active connection
- Validates connection availability
- Automatically handles connection switching

**Configuring Datasources**:
Set `MYSQL_DATASOURCES` in the `env` section of your configuration file:
```json
{
  "env": {
    "MYSQL_DATASOURCES": "|dev|root:password@localhost:3306/mydb;|prod|user:pass@prod.example.com/database"
  }
}
```

**Datasource Format**: `|connection_name|username:password@host:port/database`
- port and database are optional, default port is 3306
- Multiple datasources are separated by semicolons (;)
- Example: `|local|root:pass@localhost`
- Example: `|prod|user:pass@192.168.1.100:3306/mydb`

**Notes**:
- The server automatically connects to all pre-configured datasources on startup
- The first successfully connected datasource is automatically set as the current active connection
- To add a new datasource, you need to modify the configuration file and restart the service
- Detailed configuration guidance is provided when connection fails

#### list_connections 📋
List all established database connections and their status

**Parameters**: None

**Example Return**:
```
Database Connection List (Total: 3):

📌 dev ← Current Active
   Address: localhost:3306
   User: root
   Database: dev_db

📌 test
   Address: localhost:3306
   User: root
   Database: test_db

📌 prod
   Address: prod-server:3306
   User: app_user
   Database: prod_db
```

#### switch_connection 🔀
Switch the current active database connection

**Parameters**:
- `connectionName` (string, required) - Name of the connection to switch to

**Use Case**: Quickly switch between multiple databases; subsequent operations will use the switched connection

#### disconnect ❌
Disconnect a specific database connection

**Parameters**:
- `connectionName` (string, required) - Name of the connection to disconnect

**Notes**:
- If disconnecting the current active connection, it will automatically switch to another available connection
- If there are no other connections, you need to re-establish a connection using `connect`

### 📊 Database Operation Tools

#### query 🔍
Execute SQL query statements (SELECT)

**Parameters**:
- `sql` (string, required) - SQL query statement to execute
- `database` (string, optional) - Switch to specified database
- `connectionName` (string, optional) - Specify connection to use, defaults to current active connection

#### execute ⚡
Execute SQL modification statements (INSERT, UPDATE, DELETE, etc.)

⚠️ **Danger Mode Protection**: To prevent accidental data modification or deletion, you must explicitly enable the `dangerousMode` parameter when executing dangerous operations.

**Parameters**:
- `sql` (string, required) - SQL statement to execute
- `dangerousMode` (boolean, default false) - Danger mode switch, must be set to true when executing the following operations:
  - `INSERT` - Insert data
  - `UPDATE` - Update data
  - `DELETE` - Delete data
  - `DROP` - Drop table or database
  - `ALTER` - Modify table structure
  - `TRUNCATE` - Empty table
  - `CREATE` - Create table or database
  - `RENAME` - Rename table
  - `REPLACE` - Replace data
- `database` (string, optional) - Switch to specified database
- `connectionName` (string, optional) - Specify connection to use, defaults to current active connection

**Examples**:
```json
// ❌ This will be rejected (danger mode not enabled)
{"sql": "DELETE FROM users WHERE id=1"}

// ✅ This will execute successfully (danger mode enabled)
{"sql": "DELETE FROM users WHERE id=1", "dangerousMode": true}

// ✅ Safe operations don't require danger mode
{"sql": "SHOW TABLES"}
```

#### list_databases 🗄️
List all databases

**Parameters**:
- `connectionName` (string, optional) - Specify connection to use, defaults to current active connection

#### list_tables 📑
List all tables in a specified database

**Parameters**:
- `database` (string, optional) - Database name (if already connected to a database)
- `connectionName` (string, optional) - Specify connection to use, defaults to current active connection

#### describe_table 📋
View table structure

**Parameters**:
- `table` (string, required) - Table name
- `database` (string, optional) - Database name
- `connectionName` (string, optional) - Specify connection to use, defaults to current active connection

#### explain 📈
View SQL query execution plan for analyzing and optimizing query performance

**Parameters**:
- `sql` (string, required) - SQL query statement to analyze
- `format` (string, optional, default "default") - Execution plan output format
  - `default` - Traditional table format
  - `json` - JSON format, more suitable for program parsing
  - `tree` - Tree format, more intuitive (requires MySQL 8.0.16+)
  - `analyze` - Actually execute the query and show detailed statistics (requires MySQL 8.0.18+, will actually execute the query)
- `database` (string, optional) - Switch to specified database
- `connectionName` (string, optional) - Specify connection to use, defaults to current active connection

**Examples**:
```sql
-- Default format
EXPLAIN SELECT * FROM users WHERE age > 25

-- JSON format
EXPLAIN FORMAT=JSON SELECT * FROM users WHERE age > 25

-- Tree format (MySQL 8.0.16+)
EXPLAIN FORMAT=TREE SELECT * FROM users WHERE age > 25

-- Analyze format (MySQL 8.0.18+, actually executes the query)
EXPLAIN ANALYZE SELECT * FROM users WHERE age > 25
```

**Notes**:
- The `analyze` format actually executes the query statement, use with caution in production environments
- The `tree` and `analyze` formats require newer versions of MySQL

## 📝 Logging Configuration

This server provides a flexible logging system that supports different log levels and output formats.

### 📊 Log Levels

Configure log level via the `LOG_LEVEL` environment variable, available options:

| Level | Description | Purpose |
|-------|-------------|---------|
| `DEBUG` | Debug information | Development environment, outputs detailed debug information |
| `INFO` | General information (default) | Production environment, outputs normal operation information |
| `WARN` | Warning information | Outputs warnings that need attention but don't affect operation |
| `ERROR` | Error information | Only outputs error information |
| `OFF` | Disable logging | Completely disables log output |

### Log Format

Log output format:
```
<timestamp> [level] <message> [data]
```

Example:
```
2025-01-15T10:30:45.123Z [INFO] MySQL connection pool initialized: [dev] localhost:3306
2025-01-15T10:30:45.456Z [ERROR] Datasource [prod] connection failed: Connection timeout
```

### 🎨 Colored Output

Control colored log output via the `LOG_COLORS` environment variable (enabled by default):

- `LOG_COLORS=true` - Enable colored output (recommended for terminal viewing)
- `LOG_COLORS=false` - Disable colored output (recommended for log files)

### ⚙️ Configuration Examples

**Development Environment Configuration** (detailed logs):
```json
{
  "env": {
    "LOG_LEVEL": "DEBUG",
    "LOG_COLORS": "true"
  }
}
```

**Production Environment Configuration** (standard logs):
```json
{
  "env": {
    "LOG_LEVEL": "INFO",
    "LOG_COLORS": "false"
  }
}
```

**Silent Mode** (errors only):
```json
{
  "env": {
    "LOG_LEVEL": "ERROR",
    "LOG_COLORS": "false"
  }
}
```

## 🔒 Security Considerations

⚠️ **Important**:

### 🛡️ Connection Security
- Do not store plaintext passwords in production environments
- It is recommended to use environment variables to store sensitive information
- Limit database user permissions, only grant necessary operation permissions
- Use firewall rules to restrict database access

### ⚠️ Operation Security - Danger Mode Protection
To prevent accidental data modification or deletion, this server implements a **danger mode protection** mechanism:

- **Default Safety**: All dangerous operations (INSERT/UPDATE/DELETE/DROP/ALTER, etc.) are rejected by default
- **Explicit Confirmation**: Must explicitly set `dangerousMode=true` to execute dangerous operations
- **Intelligent Detection**: Automatically detects SQL statement types, identifies potentially dangerous operations
- **Operation Audit**: It is recommended to log all dangerous operations in production environments

**Protected Operation Types**:
- Data Modification: `INSERT`, `UPDATE`, `DELETE`, `REPLACE`
- Structure Modification: `DROP`, `ALTER`, `TRUNCATE`, `RENAME`
- Object Creation: `CREATE`

**Best Practices**:
1. Before executing dangerous operations, first use the `query` tool to verify target data
2. For batch operations, it is recommended to validate in a test environment first
3. Use `DROP` and `TRUNCATE` operations cautiously in production environments
4. Always use `WHERE` clauses to limit the scope of `UPDATE` and `DELETE`

## 🛠️ Development

```bash
# Clone the project
git clone https://github.com/GuangYiDing/mysql-mcp-server.git
cd mysql-mcp-server

# Install dependencies
npm install

# Build the project
npm run build

# Development mode (watch file changes)
npm run dev
```

## 🔧 Tech Stack

- **TypeScript** - Type-safe JavaScript
- **@modelcontextprotocol/sdk** - MCP SDK
- **mysql2** - MySQL database driver
- **zod** - Parameter validation

## 📄 License

MIT

## 🤝 Contributing

Issues and pull requests are welcome!

## 🔗 Related Resources

- [Model Context Protocol Documentation](https://modelcontextprotocol.io)
- [MySQL Documentation](https://dev.mysql.com/doc/)
- [Claude Code](https://claude.ai/download)
- [npm Package](https://www.npmjs.com/package/@nolimit35/mysql-mcp-server)
- [GitHub Repository](https://github.com/GuangYiDing/mysql-mcp-server)
