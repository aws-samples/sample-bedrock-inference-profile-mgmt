// ============================================
// Profiles - View Profiles page
// ============================================

function showProfileHelp() {
    document.getElementById('profileHelpModal').style.display = 'flex';
}

function closeProfileHelp() {
    document.getElementById('profileHelpModal').style.display = 'none';
}

// 点击模态框外部关闭
window.onclick = function(event) {
    const modal = document.getElementById('profileHelpModal');
    if (event.target === modal) {
        closeProfileHelp();
    }
}

// 显示 Profile 详情浮窗
function showProfileDetails(event, profile, provider, profileType) {
    event.stopPropagation();
    
    // 移除已存在的浮窗
    const existing = document.getElementById('profileModal');
    if (existing) existing.remove();
    
    const modal = document.createElement('div');
    modal.id = 'profileModal';
    modal.className = 'modal-overlay';
    // 使用 DOM API 构建 modal
    const modalContent = document.createElement('div');
    modalContent.className = 'modal-content';
    
    // Header
    const modalHeader = document.createElement('div');
    modalHeader.className = 'modal-header';
    const h3 = document.createElement('h3');
    h3.textContent = '📋 Profile Details';
    const closeBtn = document.createElement('button');
    closeBtn.className = 'modal-close';
    closeBtn.textContent = '✕';
    closeBtn.onclick = closeProfileModal;
    modalHeader.append(h3, closeBtn);
    
    // Body
    const modalBody = document.createElement('div');
    modalBody.className = 'modal-body';
    
    // 辅助函数：创建 detail section
    function createDetailSection(label, value, copyValue) {
        const section = document.createElement('div');
        section.className = 'detail-section';
        section.addEventListener('click', (e) => copyToClipboard(copyValue || value, e));
        
        const labelDiv = document.createElement('div');
        labelDiv.className = 'detail-label';
        labelDiv.textContent = label + ':';
        
        const valueDiv = document.createElement('div');
        valueDiv.className = 'detail-value';
        valueDiv.textContent = value;
        
        section.append(labelDiv, valueDiv);
        return section;
    }
    
    modalBody.appendChild(createDetailSection('Name', profile.name));
    modalBody.appendChild(createDetailSection('Profile ARN', profile.inferenceProfileArn));
    modalBody.appendChild(createDetailSection('Profile ID', profile.modelId));
    
    // Model ARN
    if (profile.modelArn && profile.modelArn.length > 0 && profile.modelArn[0]) {
        const arnSection = document.createElement('div');
        arnSection.className = 'detail-section';
        const filteredArns = profile.modelArn.filter(arn => arn);
        arnSection.addEventListener('click', (e) => copyToClipboard(filteredArns.join('\n'), e));
        
        const arnLabel = document.createElement('div');
        arnLabel.className = 'detail-label';
        arnLabel.textContent = 'Model ARN:';
        
        const arnValue = document.createElement('div');
        arnValue.className = 'detail-value';
        filteredArns.forEach((arn, i) => {
            if (i > 0) arnValue.appendChild(document.createElement('br'));
            arnValue.appendChild(document.createTextNode(arn));
        });
        
        arnSection.append(arnLabel, arnValue);
        modalBody.appendChild(arnSection);
    }
    
    // Detail grid
    const detailGrid = document.createElement('div');
    detailGrid.className = 'detail-grid';
    detailGrid.appendChild(createDetailSection('Provider', provider));
    detailGrid.appendChild(createDetailSection('Region', profile.region));
    detailGrid.appendChild(createDetailSection('Status', profile.status));
    
    const typeSection = document.createElement('div');
    typeSection.className = 'detail-section';
    typeSection.addEventListener('click', (e) => copyToClipboard(profileType, e));
    const typeLabel = document.createElement('div');
    typeLabel.className = 'detail-label';
    typeLabel.textContent = 'Type:';
    const typeValue = document.createElement('div');
    typeValue.className = 'detail-value';
    typeValue.textContent = profileType.toUpperCase();
    typeSection.append(typeLabel, typeValue);
    detailGrid.appendChild(typeSection);
    modalBody.appendChild(detailGrid);
    
    // Tags
    if (profile.tags && profile.tags.length > 0) {
        const tagSection = document.createElement('div');
        tagSection.className = 'detail-section';
        tagSection.addEventListener('click', (e) => copyToClipboard(profile.tags.map(t => t.key + '=' + t.value).join(', '), e));
        
        const tagLabel = document.createElement('div');
        tagLabel.className = 'detail-label';
        tagLabel.textContent = 'Tags:';
        
        const tagValues = document.createElement('div');
        tagValues.className = 'detail-tags';
        profile.tags.forEach(t => {
            const div = document.createElement('div');
            const strong = document.createElement('strong');
            strong.textContent = t.key + ':';
            div.append(strong, ' ' + t.value);
            tagValues.appendChild(div);
        });
        
        tagSection.append(tagLabel, tagValues);
        modalBody.appendChild(tagSection);
    }
    
    modalContent.append(modalHeader, modalBody);
    modal.appendChild(modalContent);
    
    document.body.appendChild(modal);
    
    // 点击背景关闭
    modal.addEventListener('click', (e) => {
        if (e.target === modal) closeProfileModal();
    });
}

function closeProfileModal() {
    const modal = document.getElementById('profileModal');
    if (modal) modal.remove();
}

// 复制到剪贴板
function copyToClipboard(text, event) {
    event.stopPropagation();
    navigator.clipboard.writeText(text).then(() => {
        const section = event.currentTarget;
        const flash = document.createElement('div');
        flash.className = 'copy-flash';
        flash.textContent = '✓ Copied!';
        section.style.position = 'relative';
        section.appendChild(flash);
        
        setTimeout(() => flash.remove(), 1000);
    }).catch(err => {
        console.error('Failed to copy:', err);
    });
}

// 初始化

function renderFilters() {
    const container = document.getElementById('providerFilters');
    
    // 提取所有厂商
    const providers = {};
    let withTags = 0;
    let withoutTags = 0;
    let globalCount = 0;
    let regionalCount = 0;
    let applicationCount = 0;
    let foundationCount = 0;
    
    Object.keys(allProfiles).forEach(key => {
        const [provider, scope] = key.split('|');
        if (!providers[provider]) {
            providers[provider] = 0;
        }
        providers[provider] += allProfiles[key].length;
        
        // 统计tags和scope
        allProfiles[key].forEach(p => {
            if (p.tags && p.tags.length > 0) {
                withTags++;
            } else {
                withoutTags++;
            }
            
            // 统计scope
            if (scope === 'Foundation Models') {
                foundationCount++;
            } else if (scope === 'Global') {
                globalCount++;
            } else if (scope === 'Regional') {
                regionalCount++;
            } else if (scope === 'Application') {
                applicationCount++;
            }
        });
    });
    
    // 构建过滤器 - 使用 DOM API 构建动态部分
    const filtersContainer = document.createElement('div');
    filtersContainer.className = 'filters-container';
    
    // Header
    const header = document.createElement('div');
    header.className = 'filters-header';
    header.onclick = toggleFilters;
    header.innerHTML = '<h3>🔽 Filters</h3><span class="filters-toggle">Click to expand/collapse</span>';
    filtersContainer.appendChild(header);
    
    // Content
    const content = document.createElement('div');
    content.className = 'filters-content';
    content.id = 'filtersContent';
    
    // Search section
    const searchSection = document.createElement('div');
    searchSection.className = 'filter-section full-width';
    searchSection.innerHTML = '<div class="filter-header"><h3>Search</h3></div>';
    const searchOptions = document.createElement('div');
    searchOptions.className = 'filter-options';
    const searchInput = document.createElement('input');
    searchInput.type = 'text';
    searchInput.id = 'search';
    searchInput.placeholder = '🔍 Search by name, model ID, or provider...';
    searchInput.style.cssText = 'width: 100%; padding: 8px; border: 1px solid #d5dbdb; border-radius: 6px;';
    searchInput.oninput = filterProfiles;
    searchOptions.appendChild(searchInput);
    searchSection.appendChild(searchOptions);
    content.appendChild(searchSection);
    
    // Providers section
    const provSection = document.createElement('div');
    provSection.className = 'filter-section full-width';
    provSection.innerHTML = '<div class="filter-header"><h3>Providers</h3><button class="btn-clear" onclick="clearFilter(\'providers\')">✕</button></div>';
    const provOptions = document.createElement('div');
    provOptions.className = 'filter-options';
    Object.entries(providers).forEach(([prov, count]) => {
        const chip = document.createElement('div');
        chip.className = 'filter-chip';
        chip.dataset.filter = 'provider';
        chip.dataset.value = prov;
        chip.textContent = prov + ' ';
        const span = document.createElement('span');
        span.className = 'count';
        span.textContent = `(${count})`;
        chip.appendChild(span);
        provOptions.appendChild(chip);
    });
    provSection.appendChild(provOptions);
    content.appendChild(provSection);
    
    // Scope section
    const scopeSection = document.createElement('div');
    scopeSection.className = 'filter-section';
    scopeSection.innerHTML = '<div class="filter-header"><h3>Profile Scope</h3><button class="btn-clear" onclick="clearFilter(\'scope\')">✕</button></div>';
    const scopeOptions = document.createElement('div');
    scopeOptions.className = 'filter-options';
    [['global', 'Global', globalCount], ['regional', 'Regional', regionalCount], ['application', 'Application', applicationCount], ['foundation', 'Foundation', foundationCount]].forEach(([val, label, cnt]) => {
        if (cnt > 0) {
            const chip = document.createElement('div');
            chip.className = 'filter-chip';
            chip.dataset.filter = 'scope';
            chip.dataset.value = val;
            chip.textContent = label + ' ';
            const span = document.createElement('span');
            span.className = 'count';
            span.textContent = `(${cnt})`;
            chip.appendChild(span);
            scopeOptions.appendChild(chip);
        }
    });
    scopeSection.appendChild(scopeOptions);
    content.appendChild(scopeSection);
    
    // Tags section
    const tagsSection = document.createElement('div');
    tagsSection.className = 'filter-section';
    tagsSection.innerHTML = '<div class="filter-header"><h3>Tags</h3><button class="btn-clear" onclick="clearFilter(\'tags\')">✕</button></div>';
    const tagsOptions = document.createElement('div');
    tagsOptions.className = 'filter-options';
    [['with', 'With', withTags], ['without', 'Without', withoutTags]].forEach(([val, label, cnt]) => {
        const chip = document.createElement('div');
        chip.className = 'filter-chip';
        chip.dataset.filter = 'tags';
        chip.dataset.value = val;
        chip.textContent = label + ' ';
        const span = document.createElement('span');
        span.className = 'count';
        span.textContent = `(${cnt})`;
        chip.appendChild(span);
        tagsOptions.appendChild(chip);
    });
    tagsSection.appendChild(tagsOptions);
    content.appendChild(tagsSection);
    
    // DataZone section
    const dzSection = document.createElement('div');
    dzSection.className = 'filter-section';
    dzSection.innerHTML = '<div class="filter-header"><h3>Exclude</h3></div>';
    const dzOptions = document.createElement('div');
    dzOptions.className = 'filter-options';
    
    // Hide DataZone checkbox
    const dzLabel = document.createElement('label');
    dzLabel.className = 'checkbox-label';
    const dzCheckbox = document.createElement('input');
    dzCheckbox.type = 'checkbox';
    dzCheckbox.id = 'excludeDataZone';
    dzCheckbox.checked = filters.excludeDataZone;
    dzCheckbox.onchange = function() { toggleDataZoneFilter(this.checked); };
    const dzSpan = document.createElement('span');
    dzSpan.textContent = 'Hide DataZone';
    dzLabel.append(dzCheckbox, dzSpan);
    dzOptions.appendChild(dzLabel);
    
    // Hide INFERENCE_PROFILE_ONLY checkbox
    const ioLabel = document.createElement('label');
    ioLabel.className = 'checkbox-label';
    const ioCheckbox = document.createElement('input');
    ioCheckbox.type = 'checkbox';
    ioCheckbox.id = 'excludeInferenceOnly';
    ioCheckbox.checked = filters.excludeInferenceOnly;
    ioCheckbox.onchange = function() { toggleInferenceOnlyFilter(this.checked); };
    const ioSpan = document.createElement('span');
    ioSpan.textContent = 'Hide INFERENCE_PROFILE_ONLY';
    ioLabel.append(ioCheckbox, ioSpan);
    dzOptions.appendChild(ioLabel);
    
    dzSection.appendChild(dzOptions);
    content.appendChild(dzSection);
    
    filtersContainer.appendChild(content);
    container.textContent = '';
    container.appendChild(filtersContainer);
    
    // 绑定点击事件
    container.querySelectorAll('.filter-chip').forEach(chip => {
        chip.addEventListener('click', () => toggleFilter(chip));
    });
}

// 切换过滤器展开/收起
function toggleFilters() {
    const content = document.getElementById('filtersContent');
    const header = document.querySelector('.filters-header h3');
    if (content.style.display === 'none') {
        content.style.display = 'grid';
        header.textContent = '🔽 Filters';
    } else {
        content.style.display = 'none';
        header.textContent = '▶️ Filters';
    }
}

// 切换 DataZone 过滤
function toggleDataZoneFilter(checked) {
    filters.excludeDataZone = checked;
    renderProfiles();
}

// 切换 INFERENCE_PROFILE_ONLY 过滤
function toggleInferenceOnlyFilter(checked) {
    filters.excludeInferenceOnly = checked;
    renderProfiles();
}

// 切换过滤器
function toggleFilter(chip) {
    const filterType = chip.dataset.filter;
    const value = chip.dataset.value;
    
    if (filterType === 'provider') {
        if (filters.providers.has(value)) {
            filters.providers.delete(value);
            chip.classList.remove('active');
        } else {
            filters.providers.add(value);
            chip.classList.add('active');
        }
    } else if (filterType === 'tags') {
        if (filters.tags === value) {
            filters.tags = null;
            chip.classList.remove('active');
        } else {
            filters.tags = value;
            // 移除同组其他active
            chip.parentElement.querySelectorAll('.filter-chip').forEach(c => c.classList.remove('active'));
            chip.classList.add('active');
        }
    } else if (filterType === 'scope') {
        if (filters.scope === value) {
            filters.scope = null;
            chip.classList.remove('active');
        } else {
            filters.scope = value;
            // 移除同组其他active
            chip.parentElement.querySelectorAll('.filter-chip').forEach(c => c.classList.remove('active'));
            chip.classList.add('active');
        }
    }
    
    renderProfiles();
}

// 渲染Profiles
function renderProfiles() {
    const container = document.getElementById('profilesList');
    
    if (Object.keys(allProfiles).length === 0) {
        container.innerHTML = '<div class="no-results">No profiles found. Click "Load Profiles" to fetch data.</div>';
        return;
    }
    
    const grid = document.createElement('div');
    grid.className = 'cards-grid';
    
    const sortedKeys = Object.keys(allProfiles).sort();
    
    for (const key of sortedKeys) {
        const [provider, scope] = key.split('|');
        
        const profiles = allProfiles[key];
        
        profiles.forEach(p => {
            p._provider = provider;
            if (filters.excludeDataZone && p.tags && p.tags.some(t => t.key === 'AmazonDataZoneDomain')) {
                return;
            }
            
            // 应用过滤器
            if (filters.providers.size > 0 && !filters.providers.has(provider)) {
                return;
            }
            
            if (filters.tags === 'with' && (!p.tags || p.tags.length === 0)) {
                return;
            }
            if (filters.tags === 'without' && p.tags && p.tags.length > 0) {
                return;
            }
            
            // Scope过滤
            if (filters.scope) {
                if (filters.scope === 'global' && scope !== 'Global') {
                    return;
                }
                if (filters.scope === 'regional' && scope !== 'Regional') {
                    return;
                }
                if (filters.scope === 'application' && scope !== 'Application') {
                    return;
                }
                if (filters.scope === 'foundation' && scope !== 'Foundation Models') {
                    return;
                }
            }
            
            // Model ID 模糊匹配
            if (filters.modelId && !p.modelId.toLowerCase().includes(filters.modelId.toLowerCase())) {
                return;
            }
            
            // 排除 INFERENCE_PROFILE_ONLY
            if (filters.excludeInferenceOnly && p.inferenceOnly) {
                return;
            }
            
            const card = document.createElement('div');
            card.className = 'profile-card';
            
            const profileType = p.inferenceProfileArn.includes('application-inference-profile') ? 'application' : 'system';
            const isGlobal = scope === 'Global';
            
            // 使用 DOM API 构建 card
            const cardHeader = document.createElement('div');
            cardHeader.className = 'card-header';
            
            const headerLeft = document.createElement('div');
            const title = document.createElement('div');
            title.className = 'card-title';
            title.textContent = p.name;
            
            const badges = document.createElement('div');
            badges.className = 'card-badges';
            
            const typeBadge = document.createElement('span');
            typeBadge.className = `badge ${profileType}`;
            typeBadge.textContent = profileType.toUpperCase();
            
            const scopeBadge = document.createElement('span');
            scopeBadge.className = `badge ${isGlobal ? 'global' : 'regional'}`;
            scopeBadge.textContent = scope;
            
            const statusBadge = document.createElement('span');
            statusBadge.className = 'badge active';
            statusBadge.textContent = p.status;
            
            badges.append(typeBadge);
            if (scope !== 'Application' && scope !== 'Foundation Models') {
                badges.append(scopeBadge);
            }
            badges.append(statusBadge);
            if (p.inferenceOnly) {
                const inferenceOnlyBadge = document.createElement('span');
                inferenceOnlyBadge.className = 'badge inference';
                inferenceOnlyBadge.textContent = 'INFERENCE_PROFILE ONLY';
                inferenceOnlyBadge.title = 'This model only supports INFERENCE_PROFILE type, not ON_DEMAND';
                badges.append(inferenceOnlyBadge);
            }
            headerLeft.append(title, badges);
            
            const detailsBtn = document.createElement('button');
            detailsBtn.className = 'btn-details';
            detailsBtn.textContent = 'Details';
            detailsBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                showProfileDetails(e, p, provider, profileType);
            });
            
            cardHeader.append(headerLeft, detailsBtn);
            
            const cardInfo = document.createElement('div');
            cardInfo.className = 'card-info';
            
            [['Provider', provider], ['Region', p.region], ['Profile ID', p.modelId]].forEach(([label, val]) => {
                const div = document.createElement('div');
                const strong = document.createElement('strong');
                strong.textContent = label + ':';
                div.append(strong, ' ' + val);
                cardInfo.appendChild(div);
            });
            
            if (p.tags && p.tags.length > 0) {
                const tagsDiv = document.createElement('div');
                tagsDiv.className = 'card-tags';
                p.tags.forEach(t => {
                    const span = document.createElement('span');
                    span.className = 'tag';
                    span.textContent = `${t.key}: ${t.value}`;
                    tagsDiv.appendChild(span);
                });
                cardInfo.appendChild(tagsDiv);
            }
            
            card.append(cardHeader, cardInfo);
            
            // 添加点击选择功能
            card.dataset.profileId = p.inferenceProfileArn;
            card.dataset.modelId = p.modelId;
            card.dataset.name = p.name;
            
            if (selectedProfiles.has(p.inferenceProfileArn)) {
                card.classList.add('selected');
            }
            
            card.style.userSelect = 'text';
            
            // Disable selection for INFERENCE_PROFILE ONLY models
            if (p.inferenceOnly) {
                card.classList.add('disabled');
                card.title = 'Cannot create application profile: This model only supports INFERENCE_PROFILE type';
            } 
            // Disable selection for application profiles (cannot create profile from profile)
            else if (p.inferenceProfileArn && p.inferenceProfileArn.includes('application-inference-profile')) {
                card.classList.add('disabled');
                card.title = 'Cannot create profile from application profile';
            }
            else {
                card.addEventListener('click', (e) => {
                    if (!e.target.closest('.btn-details') && !window.getSelection().toString()) {
                        toggleProfileSelection(card, p);
                    }
                });
            }
            
            grid.appendChild(card);
        });
    }
    
    if (grid.children.length === 0) {
        container.innerHTML = '<div class="no-results">No profiles match the selected filters.</div>';
        updateProfileCount(0);
    } else {
        // 创建结果面板
        const resultsPanel = document.createElement('div');
        resultsPanel.className = 'results-panel';
        safeSetHTML(resultsPanel, `
            <div class="results-header">
                <h3>Search Results</h3>
                <div id="selectedProfilesMini" class="selected-profiles-mini"></div>
                <div class="results-actions">
                    <span id="profileCount" class="count-badge">${escapeHtml(String(grid.children.length))} profiles</span>
                    <button onclick="selectAllProfiles()" class="btn-secondary">Select All</button>
                    <button onclick="clearAllProfiles()" class="btn-secondary">Clear All</button>
                    <button onclick="goToCreateView()" class="btn-create">Create Profiles</button>
                </div>
            </div>
        `);
        resultsPanel.appendChild(grid);
        
        container.innerHTML = '';
        container.appendChild(resultsPanel);
        updateProfileCount(grid.children.length);
        updateSelectedProfilesMini();
    }
}

// 搜索过滤
function filterProfiles() {
    const search = document.getElementById('search').value.toLowerCase();
    document.querySelectorAll('.profile-card').forEach(card => {
        const text = card.textContent.toLowerCase();
        card.style.display = text.includes(search) ? 'block' : 'none';
    });
}

// 生成YAML
async function generateYaml() {
    const keyword = document.getElementById('yamlKeyword').value;
    const tagValue = document.getElementById('yamlTagValue').value;
    const region = document.getElementById('region').value;
    
    const filtered = [];
    for (const profiles of Object.values(allProfiles)) {
        for (const p of profiles) {
            if (!keyword || p.name.toLowerCase().includes(keyword.toLowerCase())) {
                filtered.push({
                    name: p.name,
                    model_id: p.inferenceProfileArn,
                    model_type: 'inference'
                });
            }
        }
    }
    
    const res = await fetch('/api/generate-yaml', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({region, tagValue, selected: filtered})
    });
    
    const result = await res.json();
    
    // 使用 DOM API
    const container = document.getElementById('yamlResult');
    const p = document.createElement('p');
    p.style.color = 'green';
    p.textContent = `✅ Generated: ${result.filename}`;
    container.innerHTML = '';
    container.appendChild(p);
}

// 创建Tags
async function createTags() {
    const profileArn = document.getElementById('tagProfileArn').value;
    const profile = document.getElementById('awsProfile').value;
    const region = document.getElementById('region').value;
    
    const tags = [];
    document.querySelectorAll('.tag-input-row').forEach(div => {
        const key = div.querySelector('.tag-key').value;
        const value = div.querySelector('.tag-value').value;
        if (key && value) tags.push({key, value});
    });
    
    const res = await fetch('/api/create-tags', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({profile, region, profileArn, tags})
    });
    
    const result = await res.json();
    const tagResultEl = document.getElementById('tagResult');
    const p = document.createElement('p');
    p.style.color = result.success ? 'green' : 'red';
    p.textContent = result.success ? '✅ Tags applied successfully' : '❌ Failed to apply tags';
    tagResultEl.textContent = '';
    tagResultEl.appendChild(p);
}

// 添加Tag输入
function addTagInput() {
    const container = document.getElementById('tagInputs');
    const div = document.createElement('div');
    div.className = 'tag-input-row';
    safeSetHTML(div, `
        <input type="text" placeholder="Key" class="tag-key">
        <input type="text" placeholder="Value" class="tag-value">
    `);
    container.appendChild(div);
}

// 清除过滤器
function clearFilter(filterType) {
    if (filterType === 'providers') {
        filters.providers.clear();
        document.querySelectorAll('[data-filter="provider"]').forEach(chip => {
            chip.classList.remove('active');
        });
    } else if (filterType === 'tags') {
        filters.tags = null;
        document.querySelectorAll('[data-filter="tags"]').forEach(chip => {
            chip.classList.remove('active');
        });
    } else if (filterType === 'scope') {
        filters.scope = null;
        document.querySelectorAll('[data-filter="scope"]').forEach(chip => {
            chip.classList.remove('active');
        });
    } else if (filterType === 'modelId') {
        filters.modelId = '';
        const input = document.getElementById('modelIdFilter');
        if (input) input.value = '';
    }
    renderProfiles();
}

// Model ID 过滤
function filterByModelId(value) {
    filters.modelId = value.trim();
    renderProfiles();
}

// 更新显示数量
function updateProfileCount(count) {
    const badge = document.getElementById('profileCount');
    badge.textContent = `${count} profile${count !== 1 ? 's' : ''}`;
}

// 切换profile选择
function toggleProfileSelection(card, profile) {
    const id = profile.inferenceProfileArn;
    
    if (selectedProfiles.has(id)) {
        selectedProfiles.delete(id);
        selectedProfilesData.delete(id);
        card.classList.remove('selected');
    } else {
        selectedProfiles.add(id);
        // 存储完整数据
        // inferenceOnly models must use system inference profile ARN, not foundation-model ARN
        const modelType = profile.inferenceOnly ? 'inference' :
                         profile.isFoundationModel ? 'foundation' : 
                         (/^(global|us|eu|apac|ap|jp|ca|sa|me|af)\./.test(profile.modelId)) ? 'inference' : 'foundation';
        
        selectedProfilesData.set(id, {
            name: profile.name,
            model_id: modelType === 'foundation' ? profile.modelId : profile.inferenceProfileArn,
            arn: profile.inferenceProfileArn,
            model_type: modelType,
            provider: profile._provider || profile.providerName || 'Unknown'
        });
        card.classList.add('selected');
    }
    
    // 存储到 dataset 用于兼容
    card.dataset.profileData = JSON.stringify(selectedProfilesData.get(id) || {});
    
    // 更新按钮状态
    updateSelectionUI();
    updateSelectedProfilesMini();
}

// 更新选择UI状态
function updateSelectionUI() {
    const count = selectedProfiles.size;
    const selectedCountEl = document.getElementById('selectedCount');
    if (selectedCountEl) {
        selectedCountEl.textContent = `${count} selected`;
    }
    
    const createBtn = document.getElementById('createProfilesBtn');
    if (createBtn) {
        createBtn.disabled = count === 0;
    }
    
    // 如果当前在 Create 页面，更新列表
    const createView = document.getElementById('createView');
    if (createView && createView.classList.contains('active')) {
        updateSelectedProfilesList();
    }
}

// 重置选中状态
function clearProfileSelections() {
    selectedProfiles.clear();
    selectedProfilesData.clear();
    document.querySelectorAll('.profile-card.selected').forEach(c => c.classList.remove('selected'));
    updateSelectionUI();
    updateSelectedProfilesMini();
}

// 更新 mini 选中提示区
function updateSelectedProfilesMini() {
    const miniContainer = document.getElementById('selectedProfilesMini');
    if (!miniContainer) return;
    
    if (selectedProfiles.size === 0) {
        miniContainer.innerHTML = '';
        miniContainer.style.display = 'none';
        return;
    }
    
    miniContainer.style.display = 'flex';
    let html = '';
    for (const [arn, data] of selectedProfilesData) {
        const shortName = data.name.length > 30 ? data.name.substring(0, 30) + '...' : data.name;
        html += `<span class="mini-profile-tag" onclick="removeProfileSelection('${escapeHtml(arn)}')" title="${escapeHtml(data.name)}">
            ${escapeHtml(shortName)} <span class="mini-tag-close">✕</span>
        </span>`;
    }
    safeSetHTML(miniContainer, html);
}

// 移除单个选中的 profile
function removeProfileSelection(arn) {
    selectedProfiles.delete(arn);
    selectedProfilesData.delete(arn);
    
    // 更新卡片状态
    document.querySelectorAll('.profile-card').forEach(card => {
        if (card.dataset.profileId === arn) {
            card.classList.remove('selected');
        }
    });
    
    updateSelectionUI();
    updateSelectedProfilesMini();
}

// 全选
function selectAllProfiles() {
    document.querySelectorAll('.profile-card').forEach(card => {
        const id = card.dataset.profileId;
        if (!selectedProfiles.has(id)) {
            card.click();
        }
    });
}

// 清空选择
function clearAllProfiles() {
    document.querySelectorAll('.profile-card.selected').forEach(card => {
        card.click();
    });
}
