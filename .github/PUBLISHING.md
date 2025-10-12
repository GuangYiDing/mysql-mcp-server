# 📦 Publishing Guide

本文档说明如何配置自动发布到 npm 的 GitHub Actions。

## 🔑 配置 NPM Token

### 1. 生成 npm Access Token

1. 登录到 [npmjs.com](https://www.npmjs.com/)
2. 点击右上角头像，选择 **Access Tokens**
3. 点击 **Generate New Token**
4. 选择 **Automation** 类型（推荐）或 **Publish** 类型
5. 复制生成的 token（只会显示一次）

### 2. 配置 GitHub Secrets

1. 打开 GitHub 仓库页面
2. 进入 **Settings** → **Secrets and variables** → **Actions**
3. 点击 **New repository secret**
4. 添加以下 secret：
   - **Name**: `NPM_TOKEN`
   - **Value**: 粘贴你的 npm token

## 🚀 自动发布流程

### 发布新版本

使用 npm version 命令自动更新版本号并创建 tag：

```bash
# 补丁版本更新 (1.0.0 -> 1.0.1)
npm version patch -m "chore: release v%s"

# 次要版本更新 (1.0.0 -> 1.1.0)
npm version minor -m "feat: release v%s"

# 主要版本更新 (1.0.0 -> 2.0.0)
npm version major -m "breaking: release v%s"

# 推送 tag 到 GitHub
git push && git push --tags
```

### 创建 GitHub Release

使用 gh 命令创建 release（这将触发自动发布）：

```bash
gh release create v1.0.1 \
  --title "v1.0.1 - Release Title" \
  --notes "Release notes here..."
```

或通过 GitHub 网页界面：
1. 进入仓库的 **Releases** 页面
2. 点击 **Draft a new release**
3. 选择或创建 tag
4. 填写 release 标题和说明
5. 点击 **Publish release**

## 🔄 Workflows 说明

### 📦 Publish Workflow (publish.yml)

- **触发条件**: 创建 GitHub Release 时
- **执行步骤**:
  1. 检出代码
  2. 设置 Node.js 环境
  3. 安装依赖
  4. 构建项目
  5. 运行测试
  6. 发布到 npm

### 🔍 CI Workflow (ci.yml)

- **触发条件**: 推送到 main 分支或创建 Pull Request
- **执行步骤**:
  1. 在多个 Node.js 版本上测试（18.x, 20.x）
  2. 类型检查
  3. 构建项目
  4. 运行测试
  5. 代码质量检查

## 🛡️ 安全注意事项

1. **永远不要**提交 npm token 到代码仓库
2. 使用 GitHub Secrets 存储敏感信息
3. 定期更换 npm token
4. 使用 Automation 类型的 token 限制权限
5. 启用 npm 2FA（双因素认证）

## 📝 发布检查清单

发布前请确认：

- [ ] 代码已合并到 main 分支
- [ ] 所有测试通过
- [ ] 更新了 CHANGELOG（如果有）
- [ ] 更新了版本号
- [ ] 推送了 tag 到 GitHub
- [ ] 创建了 GitHub Release
- [ ] GitHub Actions 成功执行
- [ ] 包已在 npm 上可用

## 🔗 相关链接

- [npm Tokens 文档](https://docs.npmjs.com/about-access-tokens)
- [GitHub Actions 文档](https://docs.github.com/en/actions)
- [GitHub Encrypted Secrets](https://docs.github.com/en/actions/security-guides/encrypted-secrets)
