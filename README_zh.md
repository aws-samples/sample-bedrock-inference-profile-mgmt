# Bedrock Inference Profile 管理工具

基于 Web 的 AWS Bedrock Inference Profile 管理工具，支持 CloudWatch 监控和 MAP（迁移加速计划）仪表板。

[English](README.md) | 简体中文

## ⚠️ 免责声明

> **本工具仅供参考。商务相关问题请联系您的 AWS BD/SA 团队。资格和条款以您最新的商业协议为准。**

## 功能特性

### 📋 查看 Profiles
浏览和搜索所有系统定义的 inference profiles 和 foundation models。按供应商、范围和 Model ID 筛选。点击卡片选择 profiles 进行批量操作。

### ➕ 创建 Profiles
批量创建 application inference profiles，支持自定义命名和标签，包括 MAP 2.0 的 `map-migrated` 标签。可导出 YAML 配置。

### 📦 我的 Profiles
查看、编辑标签和删除你的 application inference profiles。

### 📊 Bedrock MAP 仪表板
监控 MAP 项目的 CloudWatch 调用指标。通过四种状态分类（直接模型调用、系统 Profiles、部分覆盖、完全迁移）跟踪迁移进度。可直接从仪表板选择模型创建 MAP profiles。

## 快速开始

### 前置要求
- Python 3.9+
- 已配置 AWS 凭证（`~/.aws/credentials`）
- IAM 用户/角色需附加以下策略：
  - `AmazonBedrockFullAccess`
  - `CloudWatchReadOnlyAccess`
- 如果创建新 IAM 用户，需在创建后生成访问密钥并配置到 `~/.aws/credentials`

### 安装

```bash
# 安装依赖
pip install -r backend/requirements.txt

# 启动应用
scripts/start_app.sh

# 强制重启（终止现有进程）
scripts/start_app.sh -f

# 停止应用
scripts/stop_app.sh

# 创建具有所需权限的 IAM 用户（可选）
scripts/create_bedrock_tag_user.sh
```

访问应用：http://localhost:3010

## 项目结构

```
bedrock-inference-profile-mgmt/
├── backend/              # Flask 应用和业务逻辑
├── frontend/             # HTML、JavaScript、CSS
├── logs/                 # 应用日志（自动轮转，保留10天）
└── scripts/              # 启动/停止脚本
```

## 配置

### AWS 凭证
应用使用 `~/.aws/credentials` 中的 AWS 凭证配置。在 UI 的下拉菜单中选择你的 profile。

### 默认设置
- 默认 AWS Profile：`default`
- 默认区域：`us-east-1`
- 默认端口：`3010`
- 日志保留：10天

## 使用示例

### 创建带 MAP 标签的 Profiles

1. 进入"View Profiles"页面，点击卡片选择模型
2. 点击"Create Profiles"进入创建页面
3. 添加标签：
   - Key：`map-migrated`
   - Value：`migXXXXXXXXXX`（你的 MAP 项目 ID）
4. 点击"Create Selected Profiles"

### 监控 MAP 项目

1. 进入"Bedrock MAP Dashboard"
2. 选择 AWS Profile 和区域
3. 选择时间范围（3、7 或 30 天）
4. 按 MAP 项目 ID 筛选（可选）
5. 查看按迁移状态分组的调用指标

### 从仪表板创建 MAP Profiles

1. 在 MAP Dashboard 中，点击"Direct Model Calls"或"System Profiles"区域的模型卡片选中
2. 点击"Create MAP Profiles for Selected"
3. 自动跳转到创建页面,模型已预选

## 可选脚本

### 创建 CloudWatch Dashboard
在 CloudWatch 中创建预配置的 Bedrock 分析仪表板。

```bash
# 默认: region=us-west-2, profile=default
scripts/create_bedrock_cloudwatch_dashboard_demo.sh

# 自定义设置
REGION=us-east-1 AWS_PROFILE=my-profile DASHBOARD_NAME=MyDashboard scripts/create_bedrock_cloudwatch_dashboard_demo.sh
```

额外 IAM 权限要求：`CloudWatchFullAccess`（或至少 `cloudwatch:PutDashboard`）

> 注意：Logs Insights widget 需要先启用 [Bedrock 模型调用日志](https://docs.aws.amazon.com/bedrock/latest/userguide/model-invocation-logging.html)。如不需要，可在创建后从 Dashboard 中删除该 widget。

### 创建 IAM 用户
创建具有本应用所需策略的 IAM 用户。

```bash
scripts/create_bedrock_tag_user.sh
```

额外 IAM 权限要求：`IAMFullAccess`（或至少 `iam:CreateUser`、`iam:GetUser`、`iam:AttachUserPolicy`）

## 注意事项

- 删除操作不可逆（需要确认）
- CloudWatch 指标有 5-10 分钟延迟
- 日志自动轮转并保留 10 天

## 安全

更多信息请参见 [CONTRIBUTING](CONTRIBUTING.md#security-issue-notifications)。

## 许可证

本库采用 MIT-0 许可证。详见 LICENSE 文件。
