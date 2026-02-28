# Bedrock Inference Profile Manager

A web-based management tool for AWS Bedrock Inference Profiles with CloudWatch monitoring and MAP (Migration Acceleration Program) dashboard support.

## Features

### 📋 View Profiles
- Browse all system-defined inference profiles and foundation models
- Filter by vendor (Anthropic, Amazon, Meta, Mistral, Cohere, AI21)
- Filter by region (Global, US, EU, APAC)
- Multi-select profiles for batch operations
- Search and filter capabilities

### ➕ Create Profiles
- Batch create application inference profiles
- Automatic `web-test-` prefix for profiles created via UI
- Custom tagging support (including `map-migrated` tags)
- YAML export for automation
- Profile name validation

### 📦 My Profiles
- View and manage your application profiles
- Edit tags inline
- Delete profiles with confirmation
- Filter by tags
- AWS Profile and Region selector

### 📊 Bedrock MAP Dashboard
- Monitor CloudWatch invocation metrics for MAP projects
- Track usage across foundation models and inference profiles
- Filter by MAP project ID (`map-migrated` tag)
- Configurable time range (1, 7, 14, 30 days)
- Support for ON_DEMAND and INFERENCE_PROFILE model types
- Real-time invocation statistics

## Quick Start

### Prerequisites
- Python 3.9+
- AWS credentials configured (`~/.aws/credentials`)
- Bedrock service access

### Installation

```bash
# Install dependencies
pip install -r backend/requirements.txt

# Start the application
scripts/start_app.sh

# Force restart (kills existing process)
scripts/start_app.sh -f
```

Access the application at: http://localhost:3010

## Project Structure

```
bedrock-inference-profile-mgmt/
├── backend/              # Backend code
│   ├── app.py           # Flask application
│   ├── bedrock_tagger.py # Core business logic
│   └── requirements.txt  # Python dependencies
├── frontend/            # Frontend code
│   ├── static/          # JavaScript and CSS
│   │   ├── app.js       # Main application logic
│   │   └── style.css    # Styles
│   └── templates/       # HTML templates
│       └── index.html
├── logs/                # Application logs (auto-rotated, 10-day retention)
└── scripts/             # Utility scripts
    └── start_app.sh     # Application launcher
```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/profiles` | List system profiles and foundation models |
| GET | `/api/application-profiles` | List application profiles |
| POST | `/api/create-profiles` | Batch create profiles |
| PUT | `/api/profile/tags` | Update profile tags |
| DELETE | `/api/profile` | Delete a profile |
| POST | `/api/map-dashboard` | Get MAP monitoring data |
| GET | `/api/map-projects` | List MAP project IDs |
| GET | `/api/aws-profiles` | List AWS credential profiles |

## Configuration

### AWS Credentials
The application uses AWS credential profiles from `~/.aws/credentials`. Select your profile from the dropdown in the UI.

### Regions
Supported regions:
- us-east-1 (N. Virginia)
- us-west-2 (Oregon)
- ap-south-1 (Mumbai)
- ap-northeast-1 (Tokyo)
- ap-southeast-1 (Singapore)
- eu-central-1 (Frankfurt)
- eu-west-1 (Ireland)
- eu-west-2 (London)
- eu-west-3 (Paris)
- ca-central-1 (Canada Central)

### Default Settings
- Default AWS Profile: `default`
- Default Region: `us-east-1`
- Default Port: `3010`
- Log Retention: 10 days

## Usage Examples

### Creating Profiles with MAP Tags

1. Navigate to "Create Profiles"
2. Select profiles from the list
3. Add tags:
   - Key: `map-migrated`
   - Value: `mig12345` (your MAP project ID)
4. Click "Create Selected Profiles"

### Monitoring MAP Projects

1. Navigate to "Bedrock MAP Dashboard"
2. Select AWS Profile and Region
3. Choose time range (1-30 days)
4. Filter by MAP project ID (optional)
5. View invocation metrics by model

### Managing Existing Profiles

1. Navigate to "My Profiles"
2. View all application profiles
3. Edit tags inline by clicking the edit icon
4. Delete profiles with confirmation dialog

## Notes

- Profiles created via Web UI automatically get `web-test-` prefix
- Delete operations are irreversible (confirmation required)
- CloudWatch metrics have 5-10 minute delay
- Logs are automatically rotated and retained for 10 days
- MAP Dashboard only shows ON_DEMAND and INFERENCE_PROFILE model types

## Security

See [CONTRIBUTING](CONTRIBUTING.md#security-issue-notifications) for more information.

## License

This library is licensed under the MIT-0 License. See the LICENSE file.
