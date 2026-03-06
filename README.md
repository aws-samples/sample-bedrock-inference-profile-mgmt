# Bedrock Inference Profile Manager

A web-based management tool for AWS Bedrock Inference Profiles with CloudWatch monitoring and MAP (Migration Acceleration Program) dashboard support.

[English](README.md) | [简体中文](README_zh.md)

## ⚠️ Disclaimer

> **This tool is for reference only. For business matters, please contact your AWS BD/SA team. Eligibility and terms are subject to your latest commercial agreement.**

## Features

### 📋 View Profiles
Browse and search all system-defined inference profiles and foundation models. Filter by vendor, scope, and model ID. Select profiles by clicking cards for batch operations.

### ➕ Create Profiles
Batch create application inference profiles with custom naming and tagging support, including `map-migrated` tags for MAP 2.0. Export configurations as YAML.

### 📦 My Profiles
View, edit tags, and delete your application inference profiles.

### 📊 Bedrock MAP Dashboard
Monitor CloudWatch invocation metrics for MAP projects. Track migration progress across four status categories (Direct Model Calls, System Profiles, Partial Coverage, Fully Migrated). Select models directly from the dashboard to create MAP profiles.

## Quick Start

### Prerequisites
- Python 3.9+
- AWS credentials configured (`~/.aws/credentials`)
- IAM user/role with the following policies attached:
  - `AmazonBedrockFullAccess`
  - `CloudWatchReadOnlyAccess`
- If creating a new IAM user, generate access keys after creation and configure in `~/.aws/credentials`

### Installation

```bash
# Install dependencies
pip install -r backend/requirements.txt

# Start the application
scripts/start_app.sh

# Force restart (kills existing process)
scripts/start_app.sh -f

# Stop the application
scripts/stop_app.sh

# Create IAM user with required permissions (optional)
scripts/create_bedrock_tag_user.sh
```

Access the application at: http://localhost:3010

## Project Structure

```
bedrock-inference-profile-mgmt/
├── backend/              # Flask app and business logic
├── frontend/             # HTML, JavaScript, CSS
├── logs/                 # Application logs (auto-rotated, 10-day retention)
└── scripts/              # Start/stop scripts
```

## Configuration

### AWS Credentials
The application uses AWS credential profiles from `~/.aws/credentials`. Select your profile from the dropdown in the UI.

### Default Settings
- Default AWS Profile: `default`
- Default Region: `us-east-1`
- Default Port: `3010`
- Log Retention: 10 days

## Usage Examples

### Creating Profiles with MAP Tags

1. Navigate to "View Profiles" and select models by clicking cards
2. Click "Create Profiles" to go to the create view
3. Add tags:
   - Key: `map-migrated`
   - Value: `migXXXXXXXXXX` (your MAP project ID)
4. Click "Create Selected Profiles"

### Monitoring MAP Projects

1. Navigate to "Bedrock MAP Dashboard"
2. Select AWS Profile and Region
3. Choose time range (3, 7, or 30 days)
4. Filter by MAP project ID (optional)
5. View invocation metrics grouped by migration status

### Creating MAP Profiles from Dashboard

1. In the MAP Dashboard, click models in "Direct Model Calls" or "System Profiles" sections to select them
2. Click "Create MAP Profiles for Selected"
3. Automatically switches to Create Profiles view with models pre-selected

## Notes

## Notes

- Delete operations are irreversible (confirmation required)
- CloudWatch metrics have 5-10 minute delay
- Logs are automatically rotated and retained for 10 days

## Security

See [CONTRIBUTING](CONTRIBUTING.md#security-issue-notifications) for more information.

## License

This library is licensed under the MIT-0 License. See the LICENSE file.
