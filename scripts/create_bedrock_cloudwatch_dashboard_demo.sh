#!/bin/bash
# 创建 Bedrock CloudWatch Metrics Dashboard

# ============ 可配置参数 ============
REGION="${REGION:-us-west-2}"
AWS_PROFILE="${AWS_PROFILE:-default}"
# 替换bedrock cloudwatch log group
LOG_GROUP="${LOG_GROUP:-/aws/bedrock/modelinvocations}"
# 替换名字
DASHBOARD_NAME="${DASHBOARD_NAME:-Bedrock-CW-Analytics-Demo001}"
# ====================================

aws cloudwatch put-dashboard \
  --dashboard-name "$DASHBOARD_NAME" \
  --region "$REGION" \
  --profile "$AWS_PROFILE" \
  --dashboard-body '{
    "widgets": [
        {
            "type": "metric",
            "x": 0,
            "y": 0,
            "width": 8,
            "height": 8,
            "properties": {
                "metrics": [
                    [ { "expression": "SEARCH('\''{AWS/Bedrock,ModelId} MetricName=\"Invocations\"'\'', '\''Sum'\'', 300)", "id": "e1" } ]
                ],
                "view": "pie",
                "region": "'"$REGION"'",
                "title": "按模型调用分布",
                "period": 300,
                "setPeriodToTimeRange": true
            }
        },
        {
            "type": "metric",
            "x": 8,
            "y": 0,
            "width": 8,
            "height": 8,
            "properties": {
                "metrics": [
                    [ "AWS/Bedrock", "InputTokenCount", { "stat": "Sum", "label": "Input Tokens" } ],
                    [ ".", "OutputTokenCount", { "stat": "Sum", "label": "Output Tokens" } ]
                ],
                "view": "timeSeries",
                "stacked": false,
                "region": "'"$REGION"'",
                "title": "总 Token 使用量趋势",
                "period": 300,
                "yAxis": {
                    "left": {
                        "label": "Tokens"
                    }
                }
            }
        },
        {
            "type": "metric",
            "x": 16,
            "y": 0,
            "width": 8,
            "height": 8,
            "properties": {
                "metrics": [
                    [ { "expression": "SEARCH('\''{AWS/Bedrock,ModelId} MetricName=\"EstimatedTPMQuotaUsage\"'\'', '\''Maximum'\'', 300)", "id": "e1" } ]
                ],
                "view": "bar",
                "stacked": false,
                "region": "'"$REGION"'",
                "title": "TPM 配额使用率 (%) - 峰值",
                "period": 300,
                "yAxis": {
                    "left": {
                        "label": "Percent",
                        "min": 0,
                        "max": 100
                    }
                },
                "annotations": {
                    "horizontal": [
                        {
                            "label": "Warning",
                            "value": 80,
                            "fill": "above",
                            "color": "#ff7f0e"
                        }
                    ]
                }
            }
        },
        {
            "type": "metric",
            "x": 0,
            "y": 8,
            "width": 12,
            "height": 6,
            "properties": {
                "metrics": [
                    [ { "expression": "SEARCH('\''{AWS/Bedrock,ModelId} MetricName=\"Invocations\"'\'', '\''Sum'\'', 300)", "id": "e1" } ]
                ],
                "view": "timeSeries",
                "stacked": true,
                "region": "'"$REGION"'",
                "title": "按模型调用次数 (堆叠)",
                "period": 300,
                "yAxis": {
                    "left": {
                        "label": "Count"
                    }
                }
            }
        },
        {
            "type": "metric",
            "x": 12,
            "y": 8,
            "width": 12,
            "height": 6,
            "properties": {
                "metrics": [
                    [ { "expression": "SEARCH('\''{AWS/Bedrock,ModelId} MetricName=\"InvocationLatency\"'\'', '\''Average'\'', 300) / 1000", "id": "e1" } ]
                ],
                "view": "timeSeries",
                "stacked": false,
                "region": "'"$REGION"'",
                "title": "按模型调用延迟",
                "period": 300,
                "yAxis": {
                    "left": {
                        "label": "Seconds"
                    }
                }
            }
        },
        {
            "type": "metric",
            "x": 0,
            "y": 14,
            "width": 12,
            "height": 6,
            "properties": {
                "metrics": [
                    [ { "expression": "SEARCH('\''{AWS/Bedrock,ModelId} MetricName=\"InputTokenCount\"'\'', '\''Sum'\'', 300)", "id": "e1" } ]
                ],
                "view": "timeSeries",
                "stacked": false,
                "region": "'"$REGION"'",
                "title": "按模型 Input Token 使用",
                "period": 300,
                "yAxis": {
                    "left": {
                        "label": "Tokens"
                    }
                }
            }
        },
        {
            "type": "metric",
            "x": 12,
            "y": 14,
            "width": 12,
            "height": 6,
            "properties": {
                "metrics": [
                    [ { "expression": "SEARCH('\''{AWS/Bedrock,ModelId} MetricName=\"OutputTokenCount\"'\'', '\''Sum'\'', 300)", "id": "e1" } ]
                ],
                "view": "timeSeries",
                "stacked": false,
                "region": "'"$REGION"'",
                "title": "按模型 Output Token 使用",
                "period": 300,
                "yAxis": {
                    "left": {
                        "label": "Tokens"
                    }
                }
            }
        },
        {
            "type": "metric",
            "x": 0,
            "y": 20,
            "width": 12,
            "height": 6,
            "properties": {
                "metrics": [
                    [ { "expression": "SEARCH('\''{AWS/Bedrock,ModelId} MetricName=\"InvocationClientErrors\"'\'', '\''Sum'\'', 300)", "id": "e1" } ]
                ],
                "view": "timeSeries",
                "stacked": false,
                "region": "'"$REGION"'",
                "title": "按模型客户端错误",
                "period": 300,
                "yAxis": {
                    "left": {
                        "label": "Count"
                    }
                }
            }
        },
        {
            "type": "metric",
            "x": 12,
            "y": 20,
            "width": 12,
            "height": 6,
            "properties": {
                "metrics": [
                    [ "AWS/Bedrock", "CacheReadInputTokenCount", { "stat": "Sum", "label": "Cache Read" } ],
                    [ ".", "CacheWriteInputTokenCount", { "stat": "Sum", "label": "Cache Write" } ]
                ],
                "view": "timeSeries",
                "stacked": false,
                "region": "'"$REGION"'",
                "title": "总缓存 Token 使用",
                "period": 300,
                "yAxis": {
                    "left": {
                        "label": "Tokens"
                    }
                }
            }
        },
        {
            "type": "log",
            "x": 0,
            "y": 26,
            "width": 24,
            "height": 8,
            "properties": {
                "query": "SOURCE '\'''"$LOG_GROUP"''\'' | fields modelId, identity.arn as caller, input.inputTokenCount as inputTokens, output.outputTokenCount as outputTokens | stats count() as calls, sum(inputTokens) as totalInput, sum(outputTokens) as totalOutput by modelId, caller | sort calls desc",
                "region": "'"$REGION"'",
                "stacked": false,
                "title": "按模型调用统计（完整 ModelId ARN）",
                "view": "table"
            }
        }
    ]
}'

echo "✅ Dashboard '$DASHBOARD_NAME' 创建成功！"
echo "访问: https://console.aws.amazon.com/cloudwatch/home?region=$REGION#dashboards:name=$DASHBOARD_NAME"
