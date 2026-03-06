#!/bin/bash

USER_NAME="BedRockTagUserV3"
REGION="us-east-1"

if aws iam get-user --user-name "$USER_NAME" --region "$REGION" &>/dev/null; then
  echo "User $USER_NAME already exists, skipping creation."
else
  echo "Creating IAM user: $USER_NAME"
  aws iam create-user \
    --user-name "$USER_NAME" \
    --region "$REGION"
fi

echo "Attaching AmazonBedrockFullAccess policy..."
aws iam attach-user-policy \
  --user-name "$USER_NAME" \
  --policy-arn "arn:aws:iam::aws:policy/AmazonBedrockFullAccess" \
  --region "$REGION"

echo "Attaching CloudWatchReadOnlyAccess policy..."
aws iam attach-user-policy \
  --user-name "$USER_NAME" \
  --policy-arn "arn:aws:iam::aws:policy/CloudWatchReadOnlyAccess" \
  --region "$REGION"

echo "Done! User created with Bedrock Full and CloudWatch ReadOnly access."
