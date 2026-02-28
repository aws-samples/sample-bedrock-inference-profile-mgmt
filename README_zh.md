# Bedrock Inference Profile 管理工具

基于Web的AWS Bedrock Inference Profile管理工具，支持CloudWatch监控和MAP（迁移加速计划）仪表板。

[English](README.md) | 简体中文

## 功能特性

### 📋 查看Profiles
- 浏览所有系统定义的inference profiles和foundation models
- 按供应商筛选（Anthropic、Amazon、Meta、Mistral、Cohere、AI21）
- 按区域筛选（全球、美国、欧洲、亚太）
- 多选profiles进行批量操作
- 搜索和过滤功能

### ➕ 创建Profiles
- 批量创建application inference profiles
- 通过UI创建的profiles自动添加 `web-test-` 前缀
- 自定义标签支持（包括 `map-migrated` 标签）
- YAML导出用于自动化
- Profile名称验证

### 📦 我的Profiles
- 查看和管理你的application profiles
- 在线编辑标签
- 带确认的删除功能
- 按标签过滤
- AWS Profile和区域选择器

### 📊 Bedrock MAP仪表板
- 监控MAP项目的CloudWatch调用指标
- 跟踪foundation models和inference profiles的使用情况
- 按MAP项目ID筛选（`map-migrated` 标签）
- 可配置时间范围（1、7、14、30天）
- 支持ON_DEMAND和INFERENCE_PROFILE模型类型
- 实时调用统计

## 快速开始

### 前置要求
- Python 3.9+
- 已配置AWS凭证（`~/.aws/credentials`）
- Bedrock服务访问权限

### 安装

```bash
# 安装依赖
pip install -r backend/requirements.txt

# 启动应用
scripts/start_app.sh

# 强制重启（终止现有进程）
scripts/start_app.sh -f
```

访问应用：http://localhost:3010

## 项目结构

```
bedrock-inference-profile-mgmt/
├── backend/              # 后端代码
│   ├── app.py           # Flask应用
│   ├── bedrock_tagger.py # 核心业务逻辑
│   └── requirements.txt  # Python依赖
├── frontend/            # 前端代码
│   ├── static/          # JavaScript和CSS
│   │   ├── app.js       # 主应用逻辑
│   │   └── style.css    # 样式
│   └── templates/       # HTML模板
│       └── index.html
├── logs/                # 应用日志（自动轮转，保留10天）
└── scripts/             # 工具脚本
    └── start_app.sh     # 应用启动器
```

## API接口

| 方法 | 端点 | 描述 |
|--------|----------|-------------|
| GET | `/api/profiles` | 列出系统profiles和foundation models |
| GET | `/api/application-profiles` | 列出application profiles |
| POST | `/api/create-profiles` | 批量创建profiles |
| PUT | `/api/profile/tags` | 更新profile标签 |
| DELETE | `/api/profile` | 删除profile |
| POST | `/api/map-dashboard` | 获取MAP监控数据 |
| GET | `/api/map-projects` | 列出MAP项目ID |
| GET | `/api/aws-profiles` | 列出AWS凭证配置 |

## 配置

### AWS凭证
应用使用 `~/.aws/credentials` 中的AWS凭证配置。在UI的下拉菜单中选择你的profile。

### 区域
支持的区域：
- us-east-1（弗吉尼亚北部）
- us-west-2（俄勒冈）
- ap-south-1（孟买）
- ap-northeast-1（东京）
- ap-southeast-1（新加坡）
- eu-central-1（法兰克福）
- eu-west-1（爱尔兰）
- eu-west-2（伦敦）
- eu-west-3（巴黎）
- ca-central-1（加拿大中部）

### 默认设置
- 默认AWS Profile：`default`
- 默认区域：`us-east-1`
- 默认端口：`3010`
- 日志保留：10天

## 使用示例

### 创建带MAP标签的Profiles

1. 导航到"Create Profiles"
2. 从列表中选择profiles
3. 添加标签：
   - Key：`map-migrated`
   - Value：`mig12345`（你的MAP项目ID）
4. 点击"Create Selected Profiles"

### 监控MAP项目

1. 导航到"Bedrock MAP Dashboard"
2. 选择AWS Profile和区域
3. 选择时间范围（1-30天）
4. 按MAP项目ID筛选（可选）
5. 查看按模型分类的调用指标

### 管理现有Profiles

1. 导航到"My Profiles"
2. 查看所有application profiles
3. 点击编辑图标在线编辑标签
4. 通过确认对话框删除profiles

## 注意事项

- 通过Web UI创建的profiles自动添加 `web-test-` 前缀
- 删除操作不可逆（需要确认）
- CloudWatch指标有5-10分钟延迟
- 日志自动轮转并保留10天
- MAP仪表板仅显示ON_DEMAND和INFERENCE_PROFILE模型类型

## 安全

更多信息请参见 [CONTRIBUTING](CONTRIBUTING.md#security-issue-notifications)。

## 许可证

本库采用MIT-0许可证。详见LICENSE文件。
