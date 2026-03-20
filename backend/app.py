#!/usr/bin/env python3
from flask import Flask, render_template, jsonify, request
import boto3
from bedrock_tagger import BedrockTagger
from datetime import datetime, timedelta
import logging

# 配置日志
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

app = Flask(__name__, template_folder='../frontend/templates', static_folder='../frontend/static')

# 添加安全响应头
@app.after_request
def add_security_headers(response):
    response.headers['Content-Security-Policy'] = "default-src 'self' 'unsafe-inline' 'unsafe-eval'"
    response.headers['X-Content-Type-Options'] = 'nosniff'
    response.headers['X-Frame-Options'] = 'DENY'
    response.headers['X-XSS-Protection'] = '1; mode=block'
    return response

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/profiles')
def get_profiles():
    profile = request.args.get('profile', 'default')
    region = request.args.get('region', 'us-east-1')
    logger.info("GET /api/profiles - profile=%s, region=%s", profile, region)
    
    try:
        session = boto3.Session(profile_name=profile)
        tagger = BedrockTagger(session, region)
        bedrock = session.client('bedrock', region_name=region)
        
        # 获取inference profiles
        system_profiles = tagger.list_inference_profiles(type='SYSTEM_DEFINED')
        app_profiles = tagger.list_inference_profiles(type='APPLICATION')
        
        # 获取foundation models
        foundation_models = []
        try:
            response = bedrock.list_foundation_models()
            for model in response['modelSummaries']:
                # MAP 2.0 只支持 ON_DEMAND 和 INFERENCE_PROFILE 类型
                # PROVISIONED 类型是预置吞吐量，不适用于按需计费的 MAP 场景
                supported_types = model.get('inferenceTypesSupported', [])
                if 'ON_DEMAND' in supported_types or 'INFERENCE_PROFILE' in supported_types:
                    # Models that only support INFERENCE_PROFILE cannot use foundation-model ARN for copyFrom
                    inference_only = 'INFERENCE_PROFILE' in supported_types and 'ON_DEMAND' not in supported_types
                    foundation_models.append({
                        'inferenceProfileArn': f"arn:aws:bedrock:{region}::foundation-model/{model['modelId']}",
                        'modelArn': [f"arn:aws:bedrock:{region}::foundation-model/{model['modelId']}"],
                        'modelId': model['modelId'],
                        'name': model.get('modelName', model['modelId']),
                        'region': region,
                        'status': 'ACTIVE',
                        'tags': [],
                        'providerName': model.get('providerName', 'Unknown'),
                        'isFoundationModel': True,
                        'inferenceOnly': inference_only
                    })
        except Exception as e:
            print(f"Warning: Failed to load foundation models: {e}")
        
        # 按厂商和类型分组
        grouped = {}
        
        for p in system_profiles + app_profiles + foundation_models:
            # 提取厂商名
            name = p.get('name', '')
            provider = 'Unknown'
            
            # 优先使用providerName（foundation models有这个字段）
            if 'providerName' in p:
                provider_map = {
                    'Anthropic': 'Anthropic (Claude)',
                    'Amazon': 'Amazon',
                    'Meta': 'Meta (Llama)',
                    'Mistral AI': 'Mistral',
                    'Cohere': 'Cohere',
                    'AI21 Labs': 'AI21 Labs',
                    'Stability AI': 'Stability AI',
                    'DeepSeek': 'DeepSeek'
                }
                provider = provider_map.get(p['providerName'], p['providerName'])
            else:
                # 从名字推断（inference profiles）
                if 'anthropic' in name.lower() or 'claude' in name.lower():
                    provider = 'Anthropic (Claude)'
                elif 'amazon' in name.lower() or 'nova' in name.lower() or 'titan' in name.lower():
                    provider = 'Amazon'
                elif 'meta' in name.lower() or 'llama' in name.lower():
                    provider = 'Meta (Llama)'
                elif 'mistral' in name.lower():
                    provider = 'Mistral'
                elif 'cohere' in name.lower():
                    provider = 'Cohere'
                elif 'ai21' in name.lower() or 'jamba' in name.lower():
                    provider = 'AI21 Labs'
                elif 'stability' in name.lower():
                    provider = 'Stability AI'
                elif 'deepseek' in name.lower():
                    provider = 'DeepSeek'
                elif 'twelvelabs' in name.lower():
                    provider = 'TwelveLabs'
            
            # 判断scope类型
            if p.get('isFoundationModel'):
                scope = 'Foundation Models'
            elif 'application-inference-profile' in p['inferenceProfileArn']:
                scope = 'Application'
            else:
                # System-defined profiles
                is_global = 'global.' in p['inferenceProfileArn'].lower() or ':::' in str(p.get('modelArn', []))
                scope = 'Global' if is_global else 'Regional'
            
            key = f"{provider}|{scope}"
            
            if key not in grouped:
                grouped[key] = []
            grouped[key].append(p)
        
        return jsonify(grouped)
    except Exception as e:
        return jsonify({'error': f'Bedrock is not available in {region} or access denied: {str(e)}'}), 400

@app.route('/api/models')
def get_models():
    profile = request.args.get('profile', 'default')
    region = request.args.get('region', 'us-east-1')
    
    session = boto3.Session(profile_name=profile)
    bedrock = session.client('bedrock', region_name=region)
    
    response = bedrock.list_foundation_models()
    models = [m for m in response['modelSummaries'] if 'ON_DEMAND' in m.get('inferenceTypesSupported', [])]
    
    return jsonify(models)

@app.route('/api/generate-yaml', methods=['POST'])
def generate_yaml():
    data = request.json
    region = data.get('region', 'us-east-1')
    tag_value = data.get('tagValue', 'migXXXXXXXXXX')
    selected = data.get('selected', [])
    
    timestamp = datetime.now().strftime("%Y%m%d%H%M%S%f")[:-3]
    filename = f"output/bedrock-profiles-{timestamp}.yaml"
    
    os.makedirs('output', exist_ok=True)
    
    with open(filename, 'w', encoding='utf-8') as f:
        f.write(f"region: {region}\n\n")
        f.write("tags:\n")
        f.write('  - key: "map-migrated"\n')
        f.write(f'    value: "{tag_value}"\n\n')
        f.write("bedrock-profiles:\n")
        
        for item in selected:
            f.write(f'  - name: "{item["name"]}"\n')
            f.write(f'    model_id: "{item["model_id"]}"\n')
            f.write(f'    model_type: "{item["model_type"]}"\n\n')
    
    return jsonify({'filename': filename})

@app.route('/api/create-tags', methods=['POST'])
def create_tags():
    data = request.json
    profile = data.get('profile', 'default')
    region = data.get('region', 'us-east-1')
    profile_arn = data.get('profileArn')
    tags = data.get('tags', [])
    
    session = boto3.Session(profile_name=profile)
    tagger = BedrockTagger(session, region)
    
    success = tagger.tag_inference_profile(profile_arn, tags)
    
    return jsonify({'success': success})

@app.route('/api/aws-profiles')
def get_aws_profiles():
    session = boto3.Session()
    return jsonify(session.available_profiles)

@app.route('/api/create-profiles', methods=['POST'])
def create_profiles():
    try:
        data = request.json
        profiles = data.get('profiles', [])
        tags = data.get('tags', [])
        aws_profile = data.get('profile', 'default')
        region = data.get('region', 'us-east-1')
        
        logger.info("POST /api/create-profiles - profile=%s, region=%s, count=%d, tags=%s", aws_profile, region, len(profiles), tags)
        
        session = boto3.Session(profile_name=aws_profile)
        tagger = BedrockTagger(session, region)
        
        created = []
        errors = []
        
        for p in profiles:
            try:
                name = p['name']  # 直接使用前端传来的自定义名称
                model_id = p['model_id']
                model_type = p['model_type']
                
                # 构建model ARN
                if model_type == 'foundation':
                    model_arn = f"arn:aws:bedrock:{region}::foundation-model/{model_id}"
                else:
                    model_arn = model_id
                
                response = tagger.create_inference_profile(name, model_arn, tags)
                created.append({'name': name, 'arn': response['inferenceProfileArn']})
            except Exception as e:
                errors.append({'name': p['name'], 'error': str(e)})
        
        logger.info("POST /api/create-profiles - created=%d, errors=%d", len(created), len(errors))
        return jsonify({'success': True, 'created': created, 'errors': errors})
    except Exception as e:
        logger.error("POST /api/create-profiles - error=%s", str(e))
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/application-profiles')
def get_application_profiles():
    try:
        profile = request.args.get('profile', 'default')
        region = request.args.get('region', 'us-east-1')
        tag_key = request.args.get('tag_key', '')
        logger.info("GET /api/application-profiles - profile=%s, region=%s, tag_key=%s", profile, region, tag_key)
        
        session = boto3.Session(profile_name=profile)
        tagger = BedrockTagger(session, region)
        
        profiles = tagger.list_inference_profiles(type='APPLICATION')
        
        # 过滤带特定tag的profiles
        if tag_key:
            profiles = [p for p in profiles if any(t['key'] == tag_key for t in p.get('tags', []))]
        
        return jsonify(profiles)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/profile/tags', methods=['PUT'])
def update_profile_tags():
    try:
        data = request.json
        profile_arn = data.get('profile_arn')
        tags = data.get('tags', [])
        aws_profile = data.get('profile', 'default')
        region = data.get('region', 'us-east-1')
        
        logger.info("PUT /api/profile/tags - profile_arn=%s, tags=%s", profile_arn, tags)
        
        session = boto3.Session(profile_name=aws_profile)
        tagger = BedrockTagger(session, region)
        
        success = tagger.tag_inference_profile(profile_arn, tags, replace=True)
        return jsonify({'success': success})
    except Exception as e:
        logger.error("PUT /api/profile/tags - error=%s", str(e))
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/profile', methods=['DELETE'])
def delete_profile():
    try:
        data = request.json
        profile_arn = data.get('profile_arn')
        aws_profile = data.get('profile', 'default')
        region = data.get('region', 'us-east-1')
        
        logger.info("DELETE /api/profile - profile_arn=%s, aws_profile=%s, region=%s", profile_arn, aws_profile, region)
        
        session = boto3.Session(profile_name=aws_profile)
        tagger = BedrockTagger(session, region)
        
        success = tagger.delete_inference_profile(profile_arn)
        
        logger.info("DELETE /api/profile - deleted profile_arn=%s, success=%s", profile_arn, success)
        return jsonify({'success': success})
    except Exception as e:
        logger.error("DELETE /api/profile - profile_arn=%s, error=%s", profile_arn, str(e))
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/map-dashboard/v2/metrics', methods=['POST'])
def map_dashboard_v2_metrics():
    """Phase 1: CloudWatch metrics only - fast (~1s)"""
    try:
        data = request.json
        profile = data.get('awsProfile', 'default')
        region = data.get('region', 'us-west-2')

        session = boto3.Session(profile_name=profile)
        cloudwatch = session.client('cloudwatch', region_name=region)

        if data.get('startTime') and data.get('endTime'):
            start_time = datetime.fromisoformat(data['startTime'].replace('Z', '+00:00')).replace(tzinfo=None)
            end_time = datetime.fromisoformat(data['endTime'].replace('Z', '+00:00')).replace(tzinfo=None)
            days = (end_time - start_time).days
        else:
            days = int(data.get('timeRange', 7))
            end_time = datetime.utcnow()
            start_time = end_time - timedelta(days=days)

        period = 3600 if days <= 1 else 86400

        logger.info("POST /api/map-dashboard/v2/metrics - profile=%s, region=%s, days=%d", profile, region, days)

        # Get all ModelIds with Invocations
        model_metrics = cloudwatch.list_metrics(
            Namespace='AWS/Bedrock',
            MetricName='Invocations',
            Dimensions=[{'Name': 'ModelId'}]
        )

        metric_queries = []
        model_ids = []
        for metric in model_metrics.get('Metrics', []):
            model_id = next((d['Value'] for d in metric['Dimensions'] if d['Name'] == 'ModelId'), None)
            if not model_id:
                continue
            model_ids.append(model_id)
            metric_queries.append({
                'Id': f'm{len(metric_queries)}',
                'MetricStat': {
                    'Metric': {
                        'Namespace': 'AWS/Bedrock',
                        'MetricName': 'Invocations',
                        'Dimensions': [{'Name': 'ModelId', 'Value': model_id}]
                    },
                    'Period': period,
                    'Stat': 'Sum'
                }
            })

        invocations_by_model = {}
        chunk_size = 500
        for i in range(0, len(metric_queries), chunk_size):
            chunk = metric_queries[i:i+chunk_size]
            try:
                response = cloudwatch.get_metric_data(
                    MetricDataQueries=chunk, StartTime=start_time, EndTime=end_time
                )
                for idx, result in enumerate(response.get('MetricDataResults', [])):
                    total = sum(result.get('Values', []))
                    if total > 0:
                        invocations_by_model[model_ids[i + idx]] = int(total)
            except Exception as e:
                logger.warning("Failed to get metrics chunk %d: %s", i, e)

        # Classify: separate known models vs short app profile IDs
        known_prefixes = {'global', 'us', 'eu', 'apac', 'ap', 'jp', 'ca', 'sa', 'me', 'af'}
        models = []
        app_profile_ids = {}  # short_id -> invocations

        for model_id, invocations in invocations_by_model.items():
            if '.' not in model_id and all(c.isalnum() for c in model_id):
                app_profile_ids[model_id] = invocations
                continue

            parts = model_id.split('.', 1)
            if parts[0] in known_prefixes and len(parts) > 1:
                model_type = 'system'
                scope = parts[0]
            else:
                model_type = 'foundation'
                scope = ''

            models.append({
                'modelId': model_id,
                'modelType': model_type,
                'scope': scope,
                'modelInvocations': invocations,
                'profiles': [],
                'profileInvocations': 0,
                'hasProfiles': False
            })

        models.sort(key=lambda x: x['modelInvocations'], reverse=True)

        return jsonify({
            'success': True,
            'models': models,
            'appProfileIds': app_profile_ids
        })

    except Exception as e:
        logger.error("map-dashboard/v2/metrics error: %s", e)
        return jsonify({'success': False, 'error': str(e)}), 500


@app.route('/api/map-dashboard/v2/profiles', methods=['POST'])
def map_dashboard_v2_profiles():
    """Phase 2: Application profiles with tags - slower (~5s)"""
    try:
        data = request.json
        profile = data.get('awsProfile', 'default')
        region = data.get('region', 'us-west-2')
        map_project = data.get('mapProject', '')

        logger.info("POST /api/map-dashboard/v2/profiles - profile=%s, region=%s", profile, region)

        session = boto3.Session(profile_name=profile)
        tagger = BedrockTagger(session, region)

        all_app_profiles = tagger.list_inference_profiles(type='APPLICATION')
        app_profiles_by_source = {}

        for p in all_app_profiles:
            tags = {t['key']: t['value'] for t in p.get('tags', [])}
            if 'AmazonDataZoneDomain' in tags:
                continue
            if 'map-migrated' not in tags:
                continue
            if map_project and tags['map-migrated'] != map_project:
                continue

            profile_id = p['inferenceProfileArn'].split('/')[-1]
            model_arns = p.get('modelArn', [])
            if not model_arns or not model_arns[0]:
                continue

            model_arn = model_arns[0]
            if 'foundation-model/' in model_arn:
                source_id = model_arn.split('foundation-model/')[-1]
            elif 'inference-profile/' in model_arn:
                source_id = model_arn.split('inference-profile/')[-1]
            else:
                continue

            if source_id not in app_profiles_by_source:
                app_profiles_by_source[source_id] = []

            app_profiles_by_source[source_id].append({
                'name': p.get('name', profile_id),
                'arn': p['inferenceProfileArn'],
                'profileId': profile_id,
                'tags': tags
            })

        return jsonify({
            'success': True,
            'profilesBySource': app_profiles_by_source
        })

    except Exception as e:
        logger.error("map-dashboard/v2/profiles error: %s", e)
        return jsonify({'success': False, 'error': str(e)}), 500


@app.route('/api/map-dashboard', methods=['POST'])
def map_dashboard():
    """Get MAP monitoring data: system profiles and their application profiles"""
    try:
        data = request.json
        profile = data.get('awsProfile', 'default')
        region = data.get('region', 'us-west-2')
        days = int(data.get('timeRange', 7))
        map_project = data.get('mapProject', '')
        
        logger.info("POST /api/map-dashboard - profile=%s, region=%s, days=%d, map_project=%s", profile, region, days, map_project)
        
        session = boto3.Session(profile_name=profile)
        cloudwatch = session.client('cloudwatch', region_name=region)
        tagger = BedrockTagger(session, region)
        bedrock = session.client('bedrock', region_name=region)
        
        end_time = datetime.utcnow()
        start_time = end_time - timedelta(days=days)
        period = 3600 if days <= 1 else 86400
        
        # Step 1: Get all available models (system profiles + foundation models)
        available_models = set()
        system_profiles = tagger.list_inference_profiles(type='SYSTEM_DEFINED')
        for p in system_profiles:
            profile_id = p['inferenceProfileArn'].split('/')[-1]
            available_models.add(profile_id)
        
        # Get foundation models
        try:
            response = bedrock.list_foundation_models()
            for model in response['modelSummaries']:
                # MAP 2.0 只支持 ON_DEMAND 和 INFERENCE_PROFILE 类型
                # PROVISIONED 类型是预置吞吐量，不适用于按需计费的 MAP 场景
                supported_types = model.get('inferenceTypesSupported', [])
                if 'ON_DEMAND' in supported_types or 'INFERENCE_PROFILE' in supported_types:
                    available_models.add(model['modelId'])
        except Exception as e:
            print(f"Warning: Failed to load foundation models: {e}")
        
        # Step 2: Get all application profiles with map-migrated tag
        all_app_profiles = tagger.list_inference_profiles(type='APPLICATION')
        app_profiles_by_source = {}
        
        for p in all_app_profiles:
            tags = {t['key']: t['value'] for t in p.get('tags', [])}
            
            if 'AmazonDataZoneDomain' in tags:
                continue
            
            if 'map-migrated' in tags:
                if not map_project or tags['map-migrated'] == map_project:
                    profile_id = p['inferenceProfileArn'].split('/')[-1]
                    
                    # Use modelArn from list response (no need for get_inference_profile)
                    model_arns = p.get('modelArn', [])
                    if model_arns and model_arns[0]:
                        model_arn = model_arns[0]
                        
                        if 'foundation-model/' in model_arn:
                            source_id = model_arn.split('foundation-model/')[-1]
                        elif 'inference-profile/' in model_arn:
                            source_id = model_arn.split('inference-profile/')[-1]
                        else:
                            continue
                        
                        if source_id not in app_profiles_by_source:
                            app_profiles_by_source[source_id] = []
                        
                        app_profiles_by_source[source_id].append({
                            'name': p.get('name', profile_id),
                            'arn': p['inferenceProfileArn'],
                            'profileId': profile_id,
                            'tags': tags,
                            'invocations': 0
                        })
        
        # Step 3: Query CloudWatch for invocations (batch query for performance)
        model_metrics = cloudwatch.list_metrics(
            Namespace='AWS/Bedrock',
            MetricName='Invocations',
            Dimensions=[{'Name': 'ModelId'}]
        )
        
        invocations_by_model = {}
        
        # Build metric queries for batch request (max 500 per request)
        metric_queries = []
        model_ids = []
        
        for metric in model_metrics.get('Metrics', []):
            model_id = next((d['Value'] for d in metric['Dimensions'] if d['Name'] == 'ModelId'), None)
            if not model_id:
                continue
            
            model_ids.append(model_id)
            metric_queries.append({
                'Id': f'm{len(metric_queries)}',
                'MetricStat': {
                    'Metric': {
                        'Namespace': 'AWS/Bedrock',
                        'MetricName': 'Invocations',
                        'Dimensions': [{'Name': 'ModelId', 'Value': model_id}]
                    },
                    'Period': period,
                    'Stat': 'Sum'
                }
            })
        
        # Batch query CloudWatch (process in chunks of 500)
        chunk_size = 500
        for i in range(0, len(metric_queries), chunk_size):
            chunk = metric_queries[i:i+chunk_size]
            
            try:
                response = cloudwatch.get_metric_data(
                    MetricDataQueries=chunk,
                    StartTime=start_time,
                    EndTime=end_time
                )
                
                for idx, result in enumerate(response.get('MetricDataResults', [])):
                    total = sum(result.get('Values', []))
                    if total > 0:
                        model_id = model_ids[i + idx]
                        invocations_by_model[model_id] = int(total)
            except Exception as e:
                print(f"Warning: Failed to get metrics for chunk {i}: {e}")
        
        # Step 4: Update application profile invocations
        for source_id, profiles in app_profiles_by_source.items():
            for p in profiles:
                p['invocations'] = invocations_by_model.get(p['profileId'], 0)
        
        # Step 5: Build result - only include models that exist in available_models
        result = []
        
        # 收集所有需要显示的 model IDs（有直接调用 或 有 MAP profiles）
        all_model_ids = set(invocations_by_model.keys()) | set(app_profiles_by_source.keys())
        
        for model_id in all_model_ids:
            # Skip application profile IDs - they contain only alphanumeric chars (no dots)
            if '.' not in model_id and not any(c.isalpha() and c == '.' for c in model_id):
                # Application profile IDs are short hex-like strings without dots
                if all(c.isalnum() for c in model_id):
                    continue
            
            # Only include if model exists in View Profiles
            if model_id not in available_models:
                continue
            
            # Classify model type - system profiles have geographic prefix (e.g. global., us., eu., apac., jp., ca.)
            parts = model_id.split('.', 1)
            known_prefixes = {'global', 'us', 'eu', 'apac', 'ap', 'jp', 'ca', 'sa', 'me', 'af'}
            if parts[0] in known_prefixes and len(parts) > 1:
                model_type = 'system'
                scope = parts[0]
            else:
                model_type = 'foundation'
                scope = ''
            
            invocations = invocations_by_model.get(model_id, 0)
            app_profiles = app_profiles_by_source.get(model_id, [])
            profile_invocations = sum(p['invocations'] for p in app_profiles)
            
            # 显示有调用的模型，或者有 MAP profiles 的模型（即使没有调用）
            if invocations > 0 or profile_invocations > 0 or len(app_profiles) > 0:
                result.append({
                    'modelId': model_id,
                    'modelType': model_type,
                    'scope': scope,
                    'modelInvocations': invocations,
                    'profiles': app_profiles,
                    'profileInvocations': profile_invocations,
                    'hasProfiles': len(app_profiles) > 0
                })
        
        # Sort by total invocations desc
        result.sort(key=lambda x: x['modelInvocations'] + x['profileInvocations'], reverse=True)
        
        return jsonify({'success': True, 'models': result})
        
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/map-projects')
def get_map_projects():
    """Get all MAP project IDs from existing profiles"""
    try:
        profile = request.args.get('profile', 'default')
        region = request.args.get('region', 'us-west-2')
        
        session = boto3.Session(profile_name=profile)
        tagger = BedrockTagger(session, region)
        
        all_profiles = tagger.list_inference_profiles(type='APPLICATION')
        projects = set()
        
        for p in all_profiles:
            tags = {t['key']: t['value'] for t in p.get('tags', [])}
            
            # Skip DataZone profiles
            if 'AmazonDataZoneDomain' in tags:
                continue
            
            if 'map-migrated' in tags:
                projects.add(tags['map-migrated'])
        
        return jsonify(sorted(list(projects)))
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    app.run(debug=False, host='127.0.0.1', port=3010)
