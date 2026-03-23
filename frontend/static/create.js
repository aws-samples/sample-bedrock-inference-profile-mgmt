// ============================================
// Create - Create Profiles page
// ============================================

function updateSelectedProfilesList() {
    const container = document.getElementById('selectedProfilesList');
    
    if (selectedProfiles.size === 0) {
        container.innerHTML = '';
        return;
    }
    
    const today = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const region = document.getElementById('region').value;
    
    let html = '<div class="info-banner">💡 Please modify the profile name and tags as needed before creating.</div>';
    html += `
        <div class="section-header">
            <h3 class="section-title">Selected Profiles to Create:</h3>
            <button onclick="createProfiles()" class="btn-primary" id="createProfilesBtn">Create Selected Profiles</button>
        </div>
        <div class="create-cards-grid">`;
    
    // 从 selectedProfilesData Map 读取
    selectedProfilesData.forEach((data, arn) => {
        const modelId = data.model_id.split('/').pop();
        
        // 移除版本号和日期后缀: -20241022-v2:0, -v1:0 等
        const cleanName = modelId
            .replace(/-\d{8}-v\d+:\d+$/, '')  // -20241022-v2:0
            .replace(/-v\d+:\d+$/, '')         // -v1:0
            .replace(/:\d+$/, '');             // :0
        
        const defaultName = `${cleanName}-${today}-tmp`;
        
        // 判断 scope
        const provider = data.provider || 'Unknown';
        
        const isGlobal = data.model_id.startsWith('global.');
        const isSystem = /^(global|us|eu|apac|ap|jp|ca|sa|me|af)\./.test(data.model_id);
        const scope = isGlobal ? 'Global' : (isSystem ? 'Regional' : 'Foundation');
        
        html += `
            <div class="create-profile-card">
                <button class="card-remove-btn" onclick="removeSelectedProfile('${escapeHtml(data.arn)}')" title="Remove">✕</button>
                <div class="card-name-edit">
                    <input type="text" class="profile-name-input-inline" value="${escapeHtml(defaultName)}" 
                           data-arn="${escapeHtml(data.arn)}" placeholder="Enter custom name"
                           oninput="validateProfileName(this)">
                </div>
                <div class="card-badges">
                    <span class="badge ${data.model_type}">${escapeHtml(data.model_type.toUpperCase())}</span>
                    <span class="badge ${isGlobal ? 'global' : 'regional'}">${escapeHtml(scope)}</span>
                </div>
                <div class="card-info">
                    <div><strong>Provider:</strong> ${escapeHtml(provider)} &nbsp;|&nbsp; <strong>Region:</strong> ${escapeHtml(region)}</div>
                    <div><strong>Source Model:</strong> ${escapeHtml(data.model_id)}</div>
                </div>
            </div>
        `;
    });
    
    html += '</div>';
    safeSetHTML(container, html);
    
    // 初始标红所有 -tmp 输入框
    setTimeout(() => {
        document.querySelectorAll('.profile-name-input-inline').forEach(input => {
            validateProfileName(input);
        });
    }, 0);
}

// 移除选中的 profile
function removeSelectedProfile(arn) {
    selectedProfiles.delete(arn);
    selectedProfilesData.delete(arn);
    
    // 取消卡片选中状态
    const card = document.querySelector(`.profile-card[data-profile-id="${arn}"]`);
    if (card) {
        card.classList.remove('selected');
    }
    
    updateSelectionUI();
}

// 校验 profile name 输入框
function validateProfileName(input) {
    if (input.value.trim().endsWith('-tmp')) {
        input.style.border = '2px solid #d13212';
        input.style.background = '#fff5f5';
    } else {
        input.style.border = '';
        input.style.background = '';
    }
}

// 添加tag输入行（Create视图）
function addCreateTagRow() {
    const container = document.getElementById('createTagInputs');
    const row = document.createElement('div');
    row.className = 'tag-input-row';
    safeSetHTML(row, `
        <input type="text" class="tag-key" placeholder="Key">
        <input type="text" class="tag-value" placeholder="Value">
        <button onclick="removeTagRow(this)" class="btn-danger">✕</button>
    `);
    container.appendChild(row);
}

// 移除tag输入行
function removeTagRow(btn) {
    btn.parentElement.remove();
}

// 创建profiles
async function createProfiles() {
    if (selectedProfiles.size === 0) return;
    
    // 校验 1: 检查 map-migrated tag 是否包含 XXXX
    const tagRows = document.querySelectorAll('#createTagInputs .tag-input-row');
    let hasInvalidTag = false;
    let invalidTagMessage = '';
    
    tagRows.forEach(row => {
        const key = row.querySelector('.tag-key').value.trim();
        const value = row.querySelector('.tag-value').value.trim();
        if (key === 'map-migrated' && value.includes('XXXX')) {
            hasInvalidTag = true;
            invalidTagMessage = 'Please replace "XXXX" in map-migrated tag with actual project ID';
            row.querySelector('.tag-value').style.border = '2px solid #d13212';
            row.querySelector('.tag-value').style.background = '#fff5f5';
        }
    });
    
    if (hasInvalidTag) {
        await showConfirmDialog('Validation Error', invalidTagMessage, 'OK');
        return;
    }
    
    // 校验 2: 检查 profile name 是否包含 -tmp
    const nameInputs = document.querySelectorAll('.profile-name-input-inline');
    let hasDefaultName = false;
    
    nameInputs.forEach(input => {
        if (input.value.trim().endsWith('-tmp')) {
            hasDefaultName = true;
            input.style.border = '2px solid #d13212';
            input.style.background = '#fff5f5';
        }
    });
    
    if (hasDefaultName) {
        await showConfirmDialog(
            'Validation Warning',
            'Some profile names still contain "-tmp" suffix (highlighted in red). Please customize the names before creating.',
            'OK'
        );
        return;
    }
    
    // 自定义确认弹窗
    const count = selectedProfiles.size;
    const confirmed = await showConfirmDialog(
        'Create Inference Profiles',
        `You are about to create ${count} inference profile${count > 1 ? 's' : ''}. Continue?`,
        'Create',
        'Cancel'
    );
    
    if (!confirmed) return;
    
    const btn = document.getElementById('createProfilesBtn');
    btn.disabled = true;
    btn.textContent = 'Creating...';
    
    // 收集选中的profiles和自定义名称
    const profiles = [];
    document.querySelectorAll('.profile-name-input-inline').forEach(input => {
        const customName = input.value.trim();
        const arn = input.dataset.arn;
        
        const data = selectedProfilesData.get(arn);
        if (data) {
            profiles.push({
                name: customName || `web-test-${escapeHtml(data.name)}`,
                model_id: data.model_id,
                model_type: data.model_type
            });
        }
    });
    
    // 收集tags
    const tags = [];
    document.querySelectorAll('#createTagInputs .tag-input-row').forEach(row => {
        const key = row.querySelector('.tag-key').value.trim();
        const value = row.querySelector('.tag-value').value.trim();
        if (key && value) {
            tags.push({key, value});
        }
    });
    
    const awsProfile = document.getElementById('awsProfile').value;
    const region = document.getElementById('region').value;
    
    try {
        const res = await fetch('/api/create-profiles', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({profiles, tags, profile: awsProfile, region})
        });
        
        const result = await res.json();
        
        // 清空选中的 profiles 列表
        document.getElementById('selectedProfilesList').innerHTML = '';
        
        let html = '';
        if (result.created && result.created.length > 0) {
            html += '<h3 class="success">✅ Successfully Created Profiles:</h3>';
            html += '<div class="cards-grid" style="margin-top: 16px;">';
            
            result.created.forEach(p => {
                const tagsHtml = tags.map(t => `<span class="tag">${escapeHtml(t.key)}: ${escapeHtml(t.value)}</span>`).join('');
                html += `
                    <div class="profile-card created-profile" style="user-select: text; cursor: text;">
                        <div class="card-header">
                            <div>
                                <div class="card-title" style="user-select: text;">${escapeHtml(p.name)}</div>
                                <div class="card-badges">
                                    <span class="badge application">APPLICATION</span>
                                    <span class="badge active">ACTIVE</span>
                                </div>
                            </div>
                        </div>
                        <div class="card-info" style="user-select: text;">
                            <div><strong>Profile ARN:</strong></div>
                            <div style="font-size: 11px; font-family: monospace; word-break: break-all; user-select: text;">${escapeHtml(p.arn)}</div>
                            ${tags.length > 0 ? `
                                <div class="card-tags" style="margin-top: 8px;">
                                    ${tagsHtml}
                                </div>
                            ` : ''}
                        </div>
                    </div>
                `;
            });
            html += '</div>';
            
            // 下载CSV
            downloadCSV(result.created, tags, region);
        }
        
        if (result.errors && result.errors.length > 0) {
            html += '<div class="result-box" style="margin-top: 16px;"><h3 class="error">❌ Errors:</h3><ul>';
            result.errors.forEach(e => {
                html += `<li><strong>${escapeHtml(e.name)}</strong>: ${escapeHtml(e.error)}</li>`;
            });
            html += '</ul></div>';
        }
        
        safeSetHTML('createResult', html);
        
        // 清空选择
        if (result.created && result.created.length > 0) {
            selectedProfiles.clear();
            selectedProfilesData.clear();
            document.querySelectorAll('.profile-card.selected').forEach(card => {
                card.classList.remove('selected');
            });
            updateSelectionUI();
        }
    } catch (error) {
        showError('createResult', error.message);
    } finally {
        btn.disabled = false;
        btn.textContent = 'Create Selected Profiles';
    }
}

function downloadCSV(profiles, tags, region) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
    const filename = `inference_profiles_${timestamp}.csv`;
    
    // 格式化tags
    const tagStr = tags.map(t => `${t.key}=${t.value}`).join('; ');
    
    // 构建CSV内容
    let csv = 'Profile Name,Profile ARN,Region,Tags\n';
    profiles.forEach(p => {
        csv += `"${escapeHtml(p.name)}","${p.arn}","${escapeHtml(region)}","${tagStr}"\n`;
    });
    
    // 创建下载
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    link.click();
}

function generateFromSelected() {
    if (selectedProfiles.size === 0) return;
    
    // 收集选中的profiles数据
    const selected = [];
    document.querySelectorAll('.profile-card.selected').forEach(card => {
        const data = JSON.parse(card.dataset.profileData);
        selected.push(data);
    });
    
    // 显示生成对话框
    showGenerateDialog(selected);
}

// 显示生成对话框
function showGenerateDialog(profiles) {
    const region = document.getElementById('region').value;
    
    // 生成完整YAML模板
    let yamlContent = `# Bedrock Inference Profile Configuration File
region: ${escapeHtml(region)}

# Tags to apply to profiles
tags:
  - key: "map-migrated"
    value: "migXXXXXXXXXX"
  - key: "Environment"
    value: "Development"

# Existing profiles to tag (optional - specify either name or arn)
#existing-profiles-to-tag:
  # - name: "existing-profile-name"  # Find by profile name
  # - arn: "arn:aws:bedrock:us-west-2:123456789012:inference-profile/profile-id"  # Or find by ARN

# New profiles to create and tag
bedrock-profiles:
`;
    
    profiles.forEach(p => {
        yamlContent += `  - name: "${escapeHtml(p.name)}"\n`;
        yamlContent += `    model_id: "${p.model_id}"  # ${p.model_type === 'foundation' ? 'Foundation model ID' : 'Inference profile ARN'}\n`;
        yamlContent += `    model_type: "${p.model_type}"  # Either "foundation" or "inference"\n\n`;
    });
    
    // 创建对话框
    const dialog = document.createElement('div');
    dialog.className = 'modal-overlay';
    safeSetHTML(dialog, `
        <div class="modal-content">
            <div class="modal-header">
                <h2>Generate YAML Configuration</h2>
                <button onclick="closeGenerateDialog()" class="close-btn">✕</button>
            </div>
            <div class="modal-body">
                <div class="form-group">
                    <label>YAML Configuration (Editable):</label>
                    <textarea id="yamlPreview" rows="25">${yamlContent}</textarea>
                </div>
            </div>
            <div class="modal-footer">
                <button onclick="closeGenerateDialog()" class="btn-secondary">Cancel</button>
                <button onclick="downloadYaml()" class="btn-primary">Download YAML</button>
            </div>
        </div>
    `);
    
    document.body.appendChild(dialog);
}

// 关闭对话框
function closeGenerateDialog() {
    const dialog = document.querySelector('.modal-overlay');
    if (dialog) dialog.remove();
}

// 下载YAML
async function downloadYaml() {
    const yamlContent = document.getElementById('yamlPreview').value;
    
    // 下载YAML
    const yamlBlob = new Blob([yamlContent], { type: 'text/yaml' });
    const yamlUrl = URL.createObjectURL(yamlBlob);
    const yamlLink = document.createElement('a');
    yamlLink.href = yamlUrl;
    yamlLink.download = `bedrock-profiles-${Date.now()}.yaml`;
    yamlLink.click();
    
    closeGenerateDialog();
}
