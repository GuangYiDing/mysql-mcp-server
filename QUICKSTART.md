# 快速开始指南

## 前置要求

1. Node.js 16或更高版本
2. 运行中的MySQL服务器
3. Claude for Desktop 或 Claude Code (VS Code 扩展)

## 安装步骤

### 1. 构建项目

```bash
cd mysql-mcp-server
npm install
npm run build
```

### 2. 配置Claude for Desktop

编辑Claude for Desktop配置文件:

**macOS**:
```bash
code ~/Library/Application\ Support/Claude/claude_desktop_config.json
```

**Windows**:
```powershell
code $env:AppData\Claude\claude_desktop_config.json
```

添加以下配置:

```json
{
  "mcpServers": {
    "mysql": {
      "command": "node",
      "args": ["/Users/你的用户名/mysql-mcp-server/build/index.js"]
    }
  }
}
```

⚠️ 注意: 请将路径替换为你的实际项目路径!

### 3. 重启Claude for Desktop

完全退出并重新启动Claude for Desktop应用。

### 配置 Claude Code (VS Code 扩展)

如果你使用的是 Claude Code VS Code 扩展,可以通过以下两种方式配置 MCP 服务器:

#### 方式一: 使用配置文件 (推荐)

1. 在项目根目录或用户主目录创建 `.claude` 文件夹(如果不存在)
2. 创建或编辑 `.claude/mcp_settings.json` 文件:

**项目级配置** (推荐用于特定项目):
```bash
# 在你的项目根目录
mkdir -p .claude
code .claude/mcp_settings.json
```

**全局配置** (所有项目都可使用):
```bash
# macOS/Linux
mkdir -p ~/.claude
code ~/.claude/mcp_settings.json

# Windows
mkdir $env:USERPROFILE\.claude
code $env:USERPROFILE\.claude\mcp_settings.json
```

3. 添加以下配置:

```json
{
  "mcpServers": {
    "mysql": {
      "command": "node",
      "args": ["/Users/你的用户名/mysql-mcp-server/build/index.js"]
    }
  }
}
```

⚠️ **注意**:
- 必须使用绝对路径
- Windows 用户请使用反斜杠或双反斜杠,例如: `"C:\\Users\\你的用户名\\mysql-mcp-server\\build\\index.js"`

#### 方式二: 使用 VS Code 设置

1. 打开 VS Code 设置 (Cmd/Ctrl + ,)
2. 搜索 "Claude MCP"
3. 找到 "Claude: Mcp Servers" 设置
4. 点击 "Edit in settings.json"
5. 添加以下配置:

```json
{
  "claude.mcpServers": {
    "mysql": {
      "command": "node",
      "args": ["/Users/你的用户名/mysql-mcp-server/build/index.js"]
    }
  }
}
```

#### 验证 Claude Code 配置

1. 在 VS Code 中打开 Claude Code 扩展
2. 开始一个新对话
3. 查看右下角或侧边栏是否显示 MCP 工具图标 🔧
4. 点击图标应该能看到 mysql 相关工具

#### Claude Code 重新加载

配置修改后,需要重新加载 MCP 服务器:
- 使用命令面板 (Cmd/Ctrl + Shift + P)
- 输入 "Claude: Reload MCP Servers"
- 或直接重启 VS Code

## 使用示例

### 连接数据库

在Claude中输入:

```
请连接到MySQL数据库:
- 地址: localhost
- 端口: 3306
- 用户名: root
- 密码: mypassword
- 数据库: testdb
```

### 查询数据

```
请查询testdb数据库中users表的所有数据
```

### 查看表结构

```
请查看users表的结构
```

### 插入数据

```
向users表插入一条数据:
- name: 'Alice'
- email: 'alice@example.com'
- age: 25
```

### 更新数据

```
更新users表中id为1的记录,将age改为26
```

### 列出数据库

```
列出所有可用的数据库
```

### 列出表

```
列出testdb数据库中的所有表
```

## 验证安装

1. 打开Claude for Desktop
2. 查看右下角是否有工具图标 🔧
3. 点击图标,应该能看到以下工具:
   - connect
   - query
   - execute
   - list_databases
   - list_tables
   - describe_table

## 常见问题

### 问题: Claude Desktop 中看不到工具

**解决方案**:
1. 检查配置文件路径是否正确
2. 确保使用的是绝对路径
3. 确认已经运行了`npm run build`
4. 完全重启Claude for Desktop(使用Cmd+Q或从系统托盘退出)

### 问题: Claude Code 中看不到工具

**解决方案**:
1. 检查 `.claude/mcp_settings.json` 文件是否存在且格式正确
2. 确保使用的是绝对路径
3. 确认已经运行了`npm run build`
4. 使用 "Claude: Reload MCP Servers" 命令重新加载
5. 如果仍然不行,完全重启 VS Code
6. 检查 VS Code 输出面板 (View > Output > Claude) 查看错误日志

### 问题: 连接数据库失败

**解决方案**:
1. 确认MySQL服务正在运行
2. 检查用户名和密码是否正确
3. 确认MySQL服务器允许从localhost连接
4. 检查防火墙设置

### 问题: 查询返回错误

**解决方案**:
1. 检查SQL语法是否正确
2. 确认表名和字段名存在
3. 检查用户权限
4. 查看详细错误信息

## 安全建议

1. **不要在生产环境中使用root用户**
   - 创建专门的数据库用户
   - 只授予必要的权限

2. **使用强密码**
   - 密码至少12位
   - 包含大小写字母、数字和特殊字符

3. **限制网络访问**
   - 使用防火墙规则
   - 只允许必要的IP访问

4. **定期备份数据**
   - 设置自动备份计划
   - 测试恢复流程

## 下一步

- 了解[完整文档](README.md)
- 查看[变更日志](CHANGELOG.md)
- 尝试更复杂的查询
- 探索事务处理

## 获取帮助

遇到问题? 请:
1. 查看[README.md](README.md)
2. 检查[常见问题](#常见问题)
3. 提交GitHub Issue

祝使用愉快! 🎉
