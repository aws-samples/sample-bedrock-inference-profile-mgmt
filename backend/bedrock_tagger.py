import os
import logging
from logging.handlers import TimedRotatingFileHandler
from datetime import datetime

class BedrockTagger:
    def __init__(self, session=None, region_name=None):
        self.region_name = region_name
        if not session:
            raise ValueError("Session must be provided when initializing BedrockTagger")

        self.bedrock_client = session.client("bedrock", region_name=self.region_name)
        self._setup_logger()

    def _setup_logger(self):
        """Setup logger for BedrockTagger"""
        self.logger = logging.getLogger(f'BedrockTagger-{self.region_name}')
        self.logger.setLevel(logging.INFO)
        
        if not self.logger.handlers:
            log_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'logs')
            os.makedirs(log_dir, exist_ok=True)
            
            log_file = os.path.join(log_dir, 'bedrock_tagger.log')
            handler = TimedRotatingFileHandler(log_file, when='midnight', interval=1, backupCount=10)
            handler.setFormatter(logging.Formatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s'))
            self.logger.addHandler(handler)

    def create_inference_profile(self, profile_name, model_arn, tags):    
        """Create Inference Profile using base model ARN"""
        self.logger.info(f"Creating inference profile: {profile_name} with model: {model_arn}")
        
        profile_response = self.get_inference_profile_by_name(profile_name)
        if profile_response:
            self.logger.warning(f"Inference profile already exists: {profile_name}")
            raise Exception("Inference profile already exists")

        response = self.bedrock_client.create_inference_profile(
            inferenceProfileName=profile_name,
            modelSource={'copyFrom': model_arn},
            tags=tags
        )
        self.logger.info(f"Successfully created inference profile: {profile_name}")
        return response

    def get_inference_profile_by_name(self, profile_name):
        """Find application inference profile by name, with full pagination support"""
        paginator = self.bedrock_client.get_paginator('list_inference_profiles')
        for page in paginator.paginate(typeEquals='APPLICATION'):
            for summary in page.get('inferenceProfileSummaries', []):
                if summary['inferenceProfileName'] == profile_name:
                    return self.bedrock_client.get_inference_profile(
                        inferenceProfileIdentifier=summary['inferenceProfileArn']
                    )
        return ''

    def delete_inference_profile(self, profile_arn: str) -> bool:
        """Delete an inference profile by ARN"""
        try:
            self.logger.info(f"Deleting inference profile: {profile_arn}")
            self.bedrock_client.delete_inference_profile(inferenceProfileIdentifier=profile_arn)
            self.logger.info(f"Successfully deleted inference profile: {profile_arn}")
            return True
        except Exception as e:
            self.logger.error(f"Error deleting profile {profile_arn}: {str(e)}")
            return False

    def list_available_models(self, keyword: str = None) -> list:
        """List available Bedrock models that support ON_DEMAND inference"""
        try:
            self.logger.info(f"Listing available models with keyword: {keyword}")
            response = self.bedrock_client.list_foundation_models()
            models = []

            for model in response['modelSummaries']:
                model_id = model['modelId']
                inference_types = model.get('inferenceTypesSupported', [])
                
                if 'ON_DEMAND' in inference_types:
                    if keyword is None or keyword.lower() in model_id.lower():
                        models.append({
                            'modelId': model_id,
                            'providerName': model.get('providerName', 'N/A'),
                            'modelName': model.get('modelName', 'N/A')
                        })
            
            self.logger.info(f"Found {len(models)} available models")
            return models
        except Exception as e:
            self.logger.error(f"Error listing models: {str(e)}")
            return []

    def list_inference_profiles(self, type: str = None) -> list:
        """List all application inference profiles in current region"""
        profiles = []

        try:
            self.logger.info(f"Listing inference profiles of type: {type}")
            paginator = self.bedrock_client.get_paginator('list_inference_profiles')

            for page in paginator.paginate(typeEquals=type):
                for profile in page.get('inferenceProfileSummaries', []):
                    try:
                        tags_response = self.bedrock_client.list_tags_for_resource(
                            resourceARN=profile.get('inferenceProfileArn')
                        )
                        tags = tags_response.get('tags', [])
                    except Exception as e:
                        tags = []

                    profiles.append({
                        'region': self.region_name,
                        'name': profile.get('inferenceProfileName'),
                        'modelArn': [model.get('modelArn') for model in profile.get('models', [])],
                        'inferenceProfileArn': profile.get('inferenceProfileArn'),
                        'modelId': profile.get('inferenceProfileId'),
                        'status': profile.get('status'),
                        'tags': tags
                    })

            self.logger.info(f"Found {len(profiles)} inference profiles")
        except Exception as e:
            self.logger.error(f"Error listing profiles in region {self.region_name}: {str(e)}")
        return profiles

    def tag_inference_profile(self, profile_arn: str, tags: list, replace: bool = False) -> bool:
        """Add or replace tags on an inference profile.
        When replace=True, removes existing tags not in the new set before tagging."""
        try:
            self.logger.info(f"Tagging inference profile: {profile_arn} (replace={replace})")
            aws_tags = [{'key': tag['key'], 'value': tag['value']} for tag in tags]

            if replace:
                existing = self.bedrock_client.list_tags_for_resource(resourceARN=profile_arn)
                existing_keys = {t['key'] for t in existing.get('tags', [])}
                new_keys = {t['key'] for t in aws_tags}
                keys_to_remove = list(existing_keys - new_keys)
                if keys_to_remove:
                    self.bedrock_client.untag_resource(resourceARN=profile_arn, tagKeys=keys_to_remove)
                    self.logger.info(f"Removed old tags: {keys_to_remove}")

            self.bedrock_client.tag_resource(
                resourceARN=profile_arn,
                tags=aws_tags
            )
            self.logger.info(f"Successfully tagged profile: {profile_arn}")
            return True
        except Exception as e:
            self.logger.error(f"Error tagging profile {profile_arn}: {str(e)}")
            return False

    def get_inference_profile_by_arn(self, profile_arn: str):
        """Get inference profile details by ARN"""
        try:
            response = self.bedrock_client.get_inference_profile(
                inferenceProfileIdentifier=profile_arn
            )
            return response
        except Exception as e:
            self.logger.error(f"Error getting profile {profile_arn}: {str(e)}")
            return None

    def find_inference_profile_by_name(self, profile_name: str, profile_type: str = 'APPLICATION'):
        """Find inference profile by name"""
        try:
            self.logger.info(f"Finding inference profile by name: {profile_name}")
            profiles = self.list_inference_profiles(type=profile_type)
            for profile in profiles:
                if profile['name'] == profile_name:
                    self.logger.info(f"Found profile: {profile_name}")
                    return profile
            self.logger.warning(f"Profile not found: {profile_name}")
            return None
        except Exception as e:
            self.logger.error(f"Error finding profile {profile_name}: {str(e)}")
            return None
