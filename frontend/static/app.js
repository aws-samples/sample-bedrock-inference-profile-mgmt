let allProfiles = {};
let selectedProfiles = new Set();
let selectedProfilesData = new Map();
let mapSelectedModels = new Set(); // MAP Dashboard 选中的 modelId
let filters = {
    providers: new Set(),
    tags: null,
    scope: null,
    modelId: '',
    excludeDataZone: true,  // 默认排除 DataZone profiles
    excludeInferenceOnly: false  // 默认不排除 INFERENCE_PROFILE_ONLY
};

// HTML 转义函数，防止 XSS
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// 安全设置 HTML - 使用 DOMParser 解析后插入，避免直接 innerHTML 赋值
function safeSetHTML(element, html) {
    if (typeof element === 'string') {
        element = document.getElementById(element);
    }
    if (!element) return;
    // 使用 Range API 安全解析 HTML，避免 innerHTML
    const range = document.createRange();
    range.selectNodeContents(element);
    range.deleteContents();
    element.appendChild(range.createContextualFragment(html));
}

// 安全设置文本内容
function setTextContent(element, text) {
    if (typeof element === 'string') {
        element = document.getElementById(element) || document.querySelector(element);
    }
    if (element) {
        element.textContent = text;
    }
}

// 显示错误消息（使用 DOM API）
function showError(containerId, message) {
    const container = document.getElementById(containerId);
    if (!container) return;
    
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error';
    errorDiv.textContent = `❌ Error: ${message}`;
    
    container.innerHTML = ''; // 清空
    container.appendChild(errorDiv);
}

// 显示 Profile Types 帮助
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
async function init() {
    await loadAwsProfiles();
    setupNavigation();
}

// 加载AWS Profiles
async function loadAwsProfiles() {
    const res = await fetch('/api/aws-profiles');
    const profiles = await res.json();
    const select = document.getElementById('awsProfile');
    const myProfilesSelect = document.getElementById('myProfilesAwsProfile');
    
    // 使用 DOM API 构建选项
    select.textContent = '';
    profiles.forEach(p => {
        const opt = document.createElement('option');
        opt.value = p;
        opt.textContent = p;
        select.appendChild(opt);
    });
    if (myProfilesSelect) {
        myProfilesSelect.textContent = '';
        profiles.forEach(p => {
            const opt = document.createElement('option');
            opt.value = p;
            opt.textContent = p;
            myProfilesSelect.appendChild(opt);
        });
    }
}

// 导航切换
function setupNavigation() {
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const view = item.dataset.view;
            switchToView(view);
        });
    });
}

// 切换到指定视图
function switchToView(view) {
    // 更新导航状态
    document.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active'));
    document.querySelector(`.nav-item[data-view="${view}"]`).classList.add('active');
    
    // 切换视图
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    document.getElementById(view + 'View').classList.add('active');
    
    // topBar在3个主要视图显示：View Profiles, My Profiles, MAP Dashboard
    const topBar = document.getElementById('topBar');
    if (topBar) {
        topBar.style.display = (view === 'profiles' || view === 'myprofiles' || view === 'mapv2') ? 'flex' : 'none';
    }
    
    // 切换到Create视图时更新选中列表
    if (view === 'create') {
        updateSelectedProfilesList();
        updateSelectionUI();
    }
    // 切换到My Profiles时加载数据
    if (view === 'myprofiles') {
        loadMyProfiles();
    }
    // 切换到MAP Dashboard时加载数据
    if (view === 'mapv2') {
        loadMapProjectsV2();
        if (!cachedMapV2Metrics) {
            loadMapDashboardV2();
        }
    }
}

// 跳转到 Create 页面
function goToCreateView() {
    switchToView('create');
}

// 加载数据
async function loadData() {
    const profile = document.getElementById('awsProfile').value;
    const region = document.getElementById('region').value;
    
    // Check current view
    const activeView = document.querySelector('.view.active');
    const viewId = activeView ? activeView.id : 'profilesView';
    
    if (viewId === 'mapView') {
        // MAP Dashboard - clear cache and reload
        cachedMapData = null;
        loadMapDashboard();
    } else {
        // Load profiles data
        document.getElementById('profilesList').innerHTML = '<div class="loading">Loading profiles...</div>';
        
        try {
            const res = await fetch(`/api/profiles?profile=${profile}&region=${escapeHtml(region)}`);
            
            if (!res.ok) {
                const error = await res.json();
                throw new Error(error.error || 'Failed to load profiles');
            }
            
            allProfiles = await res.json();
            
            renderFilters();
            renderProfiles();
        } catch (err) {
            const container = document.getElementById('profilesList');
            container.textContent = '';
            
            const errorDiv = document.createElement('div');
            errorDiv.className = 'error-message';
            errorDiv.style.cssText = 'padding: 40px; text-align: center; color: #d13212;';
            
            const h3 = document.createElement('h3');
            h3.textContent = '⚠️ Error Loading Profiles';
            
            const p1 = document.createElement('p');
            p1.textContent = err.message;
            
            const p2 = document.createElement('p');
            p2.style.cssText = 'margin-top: 20px; color: #666;';
            const strong = document.createElement('strong');
            strong.textContent = region;
            p2.append('Bedrock may not be available in ', strong, '.', document.createElement('br'), 'Please select a supported region (us-east-1, us-west-2, etc.)');
            
            errorDiv.append(h3, p1, p2);
            container.appendChild(errorDiv);
            console.error('Failed to load profiles:', err);
        }
    }
}

// 渲染过滤器
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
            
            badges.append(typeBadge, scopeBadge, statusBadge);
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

// 更新选中的profiles列表（Create视图）
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

// 自定义确认对话框
function showConfirmDialog(title, message, confirmText, cancelText) {
    return new Promise((resolve) => {
        const dialog = document.createElement('div');
        dialog.className = 'custom-dialog-overlay';
        const isDanger = confirmText === 'Delete';
        
        const footerButtons = cancelText 
            ? `<button class="btn-secondary" onclick="this.closest('.custom-dialog-overlay').remove(); window.dialogResolve(false);">${escapeHtml(cancelText)}</button>
               <button class="${isDanger ? 'btn-danger' : 'btn-primary'}" onclick="this.closest('.custom-dialog-overlay').remove(); window.dialogResolve(true);">${escapeHtml(confirmText)}</button>`
            : `<button class="btn-primary" onclick="this.closest('.custom-dialog-overlay').remove(); window.dialogResolve(true);">${escapeHtml(confirmText)}</button>`;
        
        safeSetHTML(dialog, `
            <div class="custom-dialog">
                <div class="dialog-header">
                    <h3>${escapeHtml(title)}</h3>
                </div>
                <div class="dialog-body">
                    <p>${escapeHtml(message)}</p>
                </div>
                <div class="dialog-footer">
                    ${footerButtons}
                </div>
            </div>
        `);
        document.body.appendChild(dialog);
        window.dialogResolve = resolve;
    });
}

// 删除确认对话框（需要输入名称）
function showDeleteConfirmDialog(profileName) {
    return new Promise((resolve) => {
        const dialog = document.createElement('div');
        dialog.className = 'custom-dialog-overlay';
        safeSetHTML(dialog, `
            <div class="custom-dialog">
                <div class="dialog-header">
                    <h3>Delete Profile</h3>
                </div>
                <div class="dialog-body">
                    <p>Are you sure you want to delete profile "<strong>${escapeHtml(profileName)}</strong>"?</p>
                    <p style="margin-top: 12px;">This action cannot be undone.</p>
                    <div style="margin-top: 16px;">
                        <label style="display: block; margin-bottom: 8px; font-weight: 500;">
                            Type the profile name to confirm:
                        </label>
                        <input type="text" id="deleteConfirmInput" placeholder="${profileName}" 
                               style="width: 100%; padding: 8px; border: 1px solid #d1d5db; border-radius: 6px; font-size: 14px;">
                    </div>
                </div>
                <div class="dialog-footer">
                    <button class="btn-secondary" onclick="this.closest('.custom-dialog-overlay').remove(); window.deleteDialogResolve(false);">Cancel</button>
                    <button class="btn-danger" id="confirmDeleteBtn" disabled>Delete</button>
                </div>
            </div>
        `);
        document.body.appendChild(dialog);
        
        const input = dialog.querySelector('#deleteConfirmInput');
        const deleteBtn = dialog.querySelector('#confirmDeleteBtn');
        
        // 监听输入，匹配时启用删除按钮
        input.addEventListener('input', () => {
            deleteBtn.disabled = input.value !== profileName;
        });
        
        // 回车键确认
        input.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && input.value === profileName) {
                dialog.remove();
                resolve(true);
            }
        });
        
        deleteBtn.onclick = () => {
            if (input.value === profileName) {
                dialog.remove();
                resolve(true);
            }
        };
        
        window.deleteDialogResolve = resolve;
        
        // 自动聚焦输入框
        setTimeout(() => input.focus(), 100);
    });
}

// 下载CSV
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

// 加载我的profiles
let myProfilesData = [];
let sortDirection = 'asc';

// 渲染 My Profiles 过滤区
function renderMyProfilesFilters(tagKeys) {
    const container = document.getElementById('myProfilesFilters');
    if (!container) return;
    
    safeSetHTML(container, `
        <div class="filters-container">
            <div class="filters-header" onclick="toggleMyProfilesFilters()">
                <h3>🔽 Filters</h3>
                <span class="filters-toggle">Click to expand/collapse</span>
            </div>
            <div class="filters-content" id="myProfilesFiltersContent">
                <div class="filter-section">
                    <div class="filter-header">
                        <h3>Filter by Tag</h3>
                    </div>
                    <div class="filter-options" style="display: flex; gap: 8px;">
                        <select id="tagKeyFilter" style="flex: 1; padding: 8px; border: 1px solid #d5dbdb; border-radius: 6px;">
                            <option value="">-- Select Tag Key --</option>
                            ${tagKeys.map(key => `<option value="${escapeHtml(key)}">${escapeHtml(key)}</option>`).join('')}
                        </select>
                        <input type="text" id="tagValueFilter" placeholder="Tag value" 
                               style="flex: 1; padding: 8px; border: 1px solid #d5dbdb; border-radius: 6px;">
                    </div>
                </div>
                
                <div class="filter-section">
                    <div class="filter-header">
                        <h3>Exclude DataZone</h3>
                    </div>
                    <div class="filter-options">
                        <label class="checkbox-label">
                            <input type="checkbox" id="excludeDataZoneMyProfiles" checked onchange="renderMyProfiles()">
                            <span>Hide DataZone profiles</span>
                        </label>
                    </div>
                </div>
            </div>
        </div>
    `);
    
    // 绑定过滤器事件
    const tagKeyFilter = document.getElementById('tagKeyFilter');
    const tagValueFilter = document.getElementById('tagValueFilter');
    
    if (tagKeyFilter) {
        tagKeyFilter.addEventListener('change', renderMyProfiles);
    }
    if (tagValueFilter) {
        tagValueFilter.addEventListener('input', renderMyProfiles);
    }
}

// 切换 My Profiles 过滤器
function toggleMyProfilesFilters() {
    const content = document.getElementById('myProfilesFiltersContent');
    const header = document.querySelector('#myProfilesFilters .filters-header h3');
    if (content.style.display === 'none') {
        content.style.display = 'grid';
        header.textContent = '🔽 Filters';
    } else {
        content.style.display = 'none';
        header.textContent = '▶️ Filters';
    }
}

async function loadMyProfiles() {
    const profile = document.getElementById('awsProfile').value;
    const region = document.getElementById('region').value;
    
    document.getElementById('myProfilesList').innerHTML = '<div class="loading">Loading profiles...</div>';
    
    try {
        let url = `/api/application-profiles?profile=${profile}&region=${escapeHtml(region)}`;
        
        const res = await fetch(url);
        const profiles = await res.json();
        
        if (profiles.error) {
            showError('myProfilesList', profiles.error);
            return;
        }
        
        if (profiles.length === 0) {
            document.getElementById('myProfilesList').innerHTML = '<p class="info-message">No profiles found.</p>';
            return;
        }
        
        myProfilesData = profiles;
        
        // 收集所有 tag keys
        const tagKeys = new Set();
        profiles.forEach(p => {
            if (p.tags) {
                p.tags.forEach(t => tagKeys.add(t.key));
            }
        });
        
        // 渲染过滤区
        renderMyProfilesFilters(Array.from(tagKeys).sort());
        
        renderMyProfiles();
    } catch (error) {
        showError('myProfilesList', error.message);
    }
}

function sortMyProfiles() {
    sortDirection = sortDirection === 'asc' ? 'desc' : 'asc';
    renderMyProfiles();
}

function renderMyProfiles() {
    const excludeDataZone = document.getElementById('excludeDataZoneMyProfiles')?.checked ?? true;
    const tagKey = document.getElementById('tagKeyFilter')?.value || '';
    const tagValue = document.getElementById('tagValueFilter')?.value.trim().toLowerCase() || '';
    
    // 过滤 DataZone profiles
    let filtered = myProfilesData;
    if (excludeDataZone) {
        filtered = myProfilesData.filter(p => 
            !p.tags || !p.tags.some(t => t.key === 'AmazonDataZoneDomain')
        );
    }
    
    // 按 tag key + value 过滤
    if (tagKey && tagValue) {
        filtered = filtered.filter(p => {
            if (!p.tags) return false;
            const tag = p.tags.find(t => t.key === tagKey);
            return tag && tag.value.toLowerCase().includes(tagValue);
        });
    }
    
    const sorted = [...filtered].sort((a, b) => {
        const aVal = a.name.toLowerCase();
        const bVal = b.name.toLowerCase();
        
        if (sortDirection === 'asc') {
            return aVal > bVal ? 1 : -1;
        } else {
            return aVal < bVal ? 1 : -1;
        }
    });
    
    // 更新计数
    const countBadge = document.getElementById('myProfilesCount');
    if (countBadge) {
        const totalCount = myProfilesData.length;
        const filteredCount = sorted.length;
        const hiddenCount = totalCount - filteredCount;
        if (hiddenCount > 0) {
            countBadge.textContent = `${filteredCount} profiles (${hiddenCount} hidden)`;
        } else {
            countBadge.textContent = `${filteredCount} profiles`;
        }
    }
    
    const sortIcon = sortDirection === 'asc' ? '↑' : '↓';
    
    let html = '<div class="profiles-table"><table><thead><tr>';
    html += `<th class="sortable" onclick="sortMyProfiles()">Name ${escapeHtml(sortIcon)}</th>`;
    html += '<th>Model ARN</th><th>Status</th><th>Tags</th><th>Actions</th></tr></thead><tbody>';
    
    sorted.forEach(p => {
        const tagsStr = p.tags ? p.tags.map(t => `${t.key}=${t.value}`).join(', ') : 'None';
        const modelArnStr = p.modelArn && p.modelArn.length > 0 ? p.modelArn.join('\n') : 'N/A';
        
        html += `
            <tr>
                <td><strong>${escapeHtml(p.name)}</strong><br><small>${escapeHtml(p.inferenceProfileArn)}</small></td>
                <td><small style="white-space:pre-line">${escapeHtml(modelArnStr)}</small></td>
                <td><span class="status-badge ${p.status.toLowerCase()}">${escapeHtml(p.status)}</span></td>
                <td>${escapeHtml(tagsStr)}</td>
                <td class="actions">
                    <button onclick='openCloudWatchMetrics(${JSON.stringify(p.modelId)}, "${escapeHtml(p.region)}")' class="btn-small" title="View CloudWatch Metrics">📊 Monitor</button>
                    <button onclick='editTags(${JSON.stringify(p.inferenceProfileArn)}, ${JSON.stringify(p.tags || [])})' class="btn-small">Edit Tags</button>
                    <button onclick='deleteProfile(${JSON.stringify(p.inferenceProfileArn)}, "${escapeHtml(p.name)}")' class="btn-small btn-danger">Delete</button>
                </td>
            </tr>
        `;
    });
    
    html += '</tbody></table></div>';
    safeSetHTML('myProfilesList', html);
}

// 应用tag过滤
function applyTagFilter() {
    loadMyProfiles();
}

// 编辑tags
function editTags(arn, currentTags) {
    // 创建弹窗
    const dialog = document.createElement('div');
    dialog.className = 'modal-overlay';
    
    let tagsHtml = '';
    if (currentTags.length > 0) {
        currentTags.forEach((tag, idx) => {
            tagsHtml += `
                <div class="tag-input-row">
                    <input type="text" class="tag-key" value="${escapeHtml(tag.key)}" placeholder="Key">
                    <input type="text" class="tag-value" value="${escapeHtml(tag.value)}" placeholder="Value">
                    <button onclick="removeTagRow(this)" class="btn-danger">✕</button>
                </div>
            `;
        });
    } else {
        tagsHtml = `
            <div class="tag-input-row">
                <input type="text" class="tag-key" placeholder="Key">
                <input type="text" class="tag-value" placeholder="Value">
                <button onclick="removeTagRow(this)" class="btn-danger">✕</button>
            </div>
        `;
    }
    
    safeSetHTML(dialog, `
        <div class="modal-content">
            <div class="modal-header">
                <h2>Edit Tags</h2>
                <button onclick="closeEditTagsDialog()" class="close-btn">✕</button>
            </div>
            <div class="modal-body">
                <div class="form-group">
                    <label>Tags:</label>
                    <div id="editTagInputs">${tagsHtml}</div>
                    <button onclick="addEditTagRow()" class="btn-secondary">+ Add Tag</button>
                </div>
            </div>
            <div class="modal-footer">
                <button onclick="closeEditTagsDialog()" class="btn-secondary">Cancel</button>
                <button onclick="saveProfileTags('${arn}')" class="btn-primary">Save Tags</button>
            </div>
        </div>
    `);
    
    document.body.appendChild(dialog);
}

// 添加tag行（编辑弹窗）
function addEditTagRow() {
    const container = document.getElementById('editTagInputs');
    const row = document.createElement('div');
    row.className = 'tag-input-row';
    safeSetHTML(row, `
        <input type="text" class="tag-key" placeholder="Key">
        <input type="text" class="tag-value" placeholder="Value">
        <button onclick="removeTagRow(this)" class="btn-danger">✕</button>
    `);
    container.appendChild(row);
}

// 关闭编辑tags弹窗
function closeEditTagsDialog() {
    const dialog = document.querySelector('.modal-overlay');
    if (dialog) dialog.remove();
}

// 保存profile tags
async function saveProfileTags(arn) {
    const tags = [];
    document.querySelectorAll('#editTagInputs .tag-input-row').forEach(row => {
        const key = row.querySelector('.tag-key').value.trim();
        const value = row.querySelector('.tag-value').value.trim();
        if (key && value) {
            tags.push({key, value});
        }
    });
    
    const profile = document.getElementById('awsProfile').value;
    const region = document.getElementById('region').value;
    
    showLoadingToast('Updating tags...');
    
    try {
        const res = await fetch('/api/profile/tags', {
            method: 'PUT',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({profile_arn: arn, tags, profile, region})
        });
        
        const result = await res.json();
        hideLoadingToast();
        
        if (result.success) {
            showSuccessToast('Tags updated successfully!');
            closeEditTagsDialog();
            loadMyProfiles();
        } else {
            showErrorToast(`Error: ${result.error}`);
        }
    } catch (error) {
        hideLoadingToast();
        showErrorToast(`Error: ${error.message}`);
    }
}

// 打开 CloudWatch 监控
function openCloudWatchMetrics(modelId, region) {
    // 构建 CloudWatch Console 深链接
    // 使用 Metrics Insights 查询来过滤特定的 inference profile
    const query = `SELECT AVG(Invocations) FROM SCHEMA("AWS/Bedrock", InferenceProfileId) WHERE InferenceProfileId = '${modelId}'`;
    
    // CloudWatch Console URL 结构
    const baseUrl = `https://console.aws.amazon.com/cloudwatch/home`;
    const params = new URLSearchParams({
        region: region
    });
    
    // 使用 Metrics Explorer 方式（更简单）
    const metricsUrl = `${baseUrl}?${params.toString()}#metricsV2:graph=~();namespace=~'AWS*2fBedrock;dimensions=~'InferenceProfileId;dimensionValue=~'${modelId}`;
    
    // 在新标签页打开
    window.open(metricsUrl, '_blank');
}

// 删除profile
async function deleteProfile(arn, name) {
    const confirmed = await showDeleteConfirmDialog(name);
    
    if (!confirmed) return;
    
    const profile = document.getElementById('awsProfile').value;
    const region = document.getElementById('region').value;
    
    showLoadingToast('Deleting profile...');
    
    try {
        const res = await fetch('/api/profile', {
            method: 'DELETE',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({profile_arn: arn, profile, region})
        });
        
        const result = await res.json();
        hideLoadingToast();
        
        if (result.success) {
            showSuccessToast('Profile deleted successfully!');
            loadMyProfiles();
        } else {
            showErrorToast(`Error: ${result.error}`);
        }
    } catch (error) {
        hideLoadingToast();
        showErrorToast(`Error: ${error.message}`);
    }
}

// Toast 通知
function showSuccessToast(message) {
    showToast(message, 'success');
}

function showErrorToast(message) {
    showToast(message, 'error');
}

function showLoadingToast(message) {
    const toast = document.createElement('div');
    toast.id = 'loadingToast';
    toast.className = 'toast toast-loading';
    
    // 使用 DOM API
    const spinner = document.createElement('div');
    spinner.className = 'toast-spinner';
    
    const messageSpan = document.createElement('span');
    messageSpan.textContent = message;
    
    toast.appendChild(spinner);
    toast.appendChild(messageSpan);
    document.body.appendChild(toast);
    setTimeout(() => toast.classList.add('show'), 10);
}

function hideLoadingToast() {
    const toast = document.getElementById('loadingToast');
    if (toast) {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
    }
}

function showToast(message, type) {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    
    // 使用 DOM API 替代 innerHTML
    const iconSpan = document.createElement('span');
    iconSpan.className = 'toast-icon';
    iconSpan.textContent = type === 'success' ? '✓' : '✕';
    
    const messageSpan = document.createElement('span');
    messageSpan.textContent = message;
    
    toast.appendChild(iconSpan);
    toast.appendChild(messageSpan);
    document.body.appendChild(toast);
    
    setTimeout(() => toast.classList.add('show'), 10);
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// 从选中的profiles生成YAML（保留原功能）
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

// 折叠侧边栏
function toggleSidebar() {
    document.getElementById('sidebar').classList.toggle('collapsed');
}

function toggleReferences() {
    const menu = document.getElementById('referencesMenu');
    menu.classList.toggle('show');
}

// 点击外部关闭 references 菜单
document.addEventListener('click', (e) => {
    if (!e.target.closest('.references-dropdown')) {
        const menu = document.getElementById('referencesMenu');
        if (menu) menu.classList.remove('show');
    }
});

// 启动
init();

// ============================================
// MAP Dashboard Functions
// ============================================

async function loadMapProjects() {
    const profile = document.getElementById('awsProfile').value;
    const region = document.getElementById('region').value;
    
    try {
        const res = await fetch(`/api/map-projects?profile=${profile}&region=${escapeHtml(region)}`);
        const projects = await res.json();
        
        const select = document.getElementById('mapProjectId');
        safeSetHTML(select, '<option value="">All MAP Projects</option>');
        projects.forEach(proj => {
            const option = document.createElement('option');
            option.value = proj;
            option.textContent = proj;
            select.appendChild(option);
        });
        
        // Removed auto-load on project selection
    } catch (error) {
        console.error('Failed to load MAP projects:', error);
    }
}

// 缓存完整的 MAP dashboard 数据
let cachedMapData = null;

async function loadMapDashboard() {
    const profile = document.getElementById('awsProfile').value;
    const region = document.getElementById('region').value;
    const timeRange = document.getElementById('mapTimeRange').value;
    
    document.getElementById('mapContent').innerHTML = '<div class="loading">Loading data...</div>';
    
    try {
        // 并行加载 MAP dashboard 和 profiles 数据（查询所有 MAP projects）
        const [mapRes, profilesRes] = await Promise.all([
            fetch('/api/map-dashboard', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ awsProfile: profile, region, timeRange, mapProject: '' })
            }),
            fetch(`/api/profiles?profile=${profile}&region=${escapeHtml(region)}`)
        ]);
        
        const data = await mapRes.json();
        allProfiles = await profilesRes.json();  // 缓存 profiles 数据
        
        if (!data.success) {
            showError('mapContent', data.error);
            return;
        }
        
        // 缓存完整数据
        cachedMapData = data.models;
        
        // 应用当前选择的 MAP project 过滤
        filterMapDashboard();
    } catch (error) {
        showError('mapContent', error.message);
    }
}

// 前端过滤 MAP dashboard 数据
function filterMapDashboard() {
    if (!cachedMapData) {
        loadMapDashboard();
        return;
    }
    
    const mapProject = document.getElementById('mapProjectId').value;
    const timeRange = document.getElementById('mapTimeRange').value;
    
    // 如果选择了特定项目，过滤数据
    let filteredModels = cachedMapData;
    
    if (mapProject) {
        filteredModels = cachedMapData.map(model => {
            // 过滤出属于该项目的 profiles
            const projectProfiles = model.profiles.filter(p => 
                p.tags['map-migrated'] === mapProject
            );
            
            const profileInvocations = projectProfiles.reduce((sum, p) => sum + p.invocations, 0);
            
            return {
                ...model,
                profiles: projectProfiles,
                profileInvocations: profileInvocations,
                hasProfiles: projectProfiles.length > 0
            };
        }).filter(m => m.modelInvocations > 0 || m.profileInvocations > 0 || m.hasProfiles);
    }
    
    renderMapDashboard(filteredModels, timeRange);
}

function renderMapDashboard(models, timeRange) {
    // 分类逻辑：
    // 1. Direct Model Calls: foundation model，没有 MAP profiles，有直接调用
    // 2. System Profiles: system profile，没有 MAP profiles（避免重复）
    // 3. Partial Coverage: 有 MAP profiles，还有直接调用（包括 foundation 和 system）
    // 4. Fully Migrated: 有 MAP profiles，没有直接调用（不要求 profile 有调用量）
    
    const noProfiles = models.filter(m => !m.hasProfiles && m.modelInvocations > 0 && m.modelType !== 'system');
    const systemModels = models.filter(m => m.modelType === 'system' && !m.hasProfiles);
    const withProfiles = models.filter(m => m.hasProfiles && m.modelInvocations > 0);
    const completed = models.filter(m => m.hasProfiles && m.modelInvocations === 0);
    
    const totalModels = models.length;
    const needMigration = noProfiles.length + systemModels.length;  // 需要创建 MAP profiles 的
    const hasMigration = withProfiles.length + completed.length;  // 已有 MAP profiles 的
    const totalMapCalls = models.reduce((sum, m) => sum + (m.profileInvocations || 0), 0);
    
    // 格式化调用次数
    const formatCalls = (count) => {
        if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
        return count.toString();
    };
    
    // Summary
    let summaryHtml = `
        <div class="map-summary">
            <div class="summary-card">
                <div class="summary-label">Total Models</div>
                <div class="summary-value">${totalModels}</div>
            </div>
            <div class="summary-card" style="background: #fff5f5; border-color: #d13212;">
                <div class="summary-label">❌ Need MAP Profiles</div>
                <div class="summary-value">${needMigration}</div>
            </div>
            <div class="summary-card success">
                <div class="summary-label">✅ Have MAP Profiles</div>
                <div class="summary-value">${hasMigration}</div>
            </div>
            <div class="summary-card" style="background: #f0f8ff; border-color: #0073bb;">
                <div class="summary-label">MAP Profile Calls</div>
                <div class="summary-value">${formatCalls(totalMapCalls)}</div>
            </div>
        </div>
    `;
    safeSetHTML('mapSummary', summaryHtml);
    
    // Content
    let html = '';
    
    if (noProfiles.length > 0) {
        html += `<div class="map-section">
            <h3 class="section-title alert" onclick="toggleSection(this)">
                <span>🔴 Direct Model Calls (No MAP Profiles) (${escapeHtml(String(noProfiles.length))})</span>
                <span class="collapse-icon">▼</span>
            </h3>
            <div class="section-content">`;
        noProfiles.forEach(m => {
            const canSelect = m.modelType === 'foundation' || m.modelType === 'system';
            html += `
                <div class="map-model-group ${canSelect ? 'selectable' : ''} ${mapSelectedModels.has(m.modelId) ? 'selected' : ''}" ${canSelect ? `onclick="toggleMapModelSelection('${escapeHtml(m.modelId)}', this)"` : ''}>
                    <div class="model-header">
                        <div class="model-title-wrapper">
                            <strong>${escapeHtml(m.modelId)}</strong>
                            <button class="btn-copy-inline" onclick="showMapModelDetails(event, ${JSON.stringify(m).replace(/"/g, '&quot;')})" title="View Details">ℹ️</button>
                        </div>
                        <span class="collapse-icon" onclick="toggleModelGroup(this)">▼</span>
                    </div>
                    <div class="model-content">
                        <div class="model-summary">
                            <div class="metric">Direct Model Calls: <strong>${formatCalls(m.modelInvocations)}</strong></div>
                            <div class="metric">MAP Profiles: <span class="badge-alert">None</span></div>
                        </div>
                    </div>
                </div>
            `;
        });
        html += '</div></div>';
    }
    
    if (systemModels.length > 0) {
        html += `<div class="map-section">
            <h3 class="section-title" style="color: #0073bb; border-left-color: #0073bb; background: #f0f8ff;" onclick="toggleSection(this)">
                <span>🔵 System Inference Profiles (global/us) (${escapeHtml(String(systemModels.length))})</span>
                <span class="collapse-icon">▼</span>
            </h3>
            <div class="section-content">`;
        systemModels.forEach(m => {
            const canSelect = m.modelType === 'system';
            html += `
                <div class="map-model-group ${canSelect ? 'selectable' : ''} ${mapSelectedModels.has(m.modelId) ? 'selected' : ''}" ${canSelect ? `onclick="toggleMapModelSelection('${escapeHtml(m.modelId)}', this)"` : ''}>
                    <div class="model-header">
                        <div class="model-title-wrapper">
                            <strong>${escapeHtml(m.modelId)}</strong>
                            <button class="btn-copy-inline" onclick="showMapModelDetails(event, ${JSON.stringify(m).replace(/"/g, '&quot;')})" title="View Details">ℹ️</button>
                        </div>
                        <span class="collapse-icon" onclick="toggleModelGroup(this)">▼</span>
                    </div>
                    <div class="model-content">
                        <div class="model-summary">
                            <div class="metric">Total Calls: <strong>${formatCalls(m.modelInvocations)}</strong></div>
                            <div class="metric">🔵 System Profile Calls: <strong>${formatCalls(m.modelInvocations)}</strong></div>
                            <div class="metric">MAP Profiles: <span class="badge-alert">None</span></div>
                        </div>
                    </div>
                </div>
            `;
        });
        html += '</div></div>';
    }
    
    if (withProfiles.length > 0) {
        html += `<div class="map-section">
            <h3 class="section-title warning" onclick="toggleSection(this)">
                <span>⚠️ Partial Coverage (Mixed Traffic) (${escapeHtml(String(withProfiles.length))})</span>
                <span class="collapse-icon">▼</span>
            </h3>
            <div class="section-content">`;
        withProfiles.forEach(m => {
            const totalCalls = m.modelInvocations + m.profileInvocations;
            const appCoverage = m.profileInvocations / totalCalls * 100;
            const directCoverage = m.modelInvocations / totalCalls * 100;
            
            html += `
                <div class="map-model-group">
                    <div class="model-header">
                        <div class="model-title-wrapper">
                            <strong>${escapeHtml(m.modelId)}</strong>
                            <span style="color: #f39c12; font-size: 0.9em; margin-left: 8px;">⚠️ Mixed Traffic</span>
                            <button class="btn-copy-inline" onclick="showMapModelDetails(event, ${JSON.stringify(m).replace(/"/g, '&quot;')})" title="View Details">ℹ️</button>
                        </div>
                        <span class="collapse-icon" onclick="toggleModelGroup(this)">▼</span>
                    </div>
                    <div class="model-content">
                        <div class="model-summary">
                            <div class="metric">Total Calls: <strong>${formatCalls(totalCalls)}</strong></div>
                            <div class="metric">🔴 Direct Model: <strong>${formatCalls(m.modelInvocations)}</strong> (${directCoverage.toFixed(0)}%)</div>
                            <div class="metric">🟢 MAP Profiles: <strong>${formatCalls(m.profileInvocations)}</strong> (${appCoverage.toFixed(0)}%)</div>
                            <div class="metric" style="margin-top: 8px; padding: 8px; background: #fff3cd; border-radius: 4px;">
                                💡 <strong>Action:</strong> Migrate ${directCoverage.toFixed(0)}% direct traffic to MAP profiles
                            </div>
                        </div>
                        <div style="margin-top: 12px; font-weight: 600;">MAP Application Profiles:</div>
                        <div class="profiles-grid">
            `;
            m.profiles.forEach(p => {
                const mapTag = p.tags['map-migrated'] || 'N/A';
                const profileArn = `arn:aws:bedrock:us-west-2:${p.accountId || '...'}:inference-profile/${p.profileId}`;
                html += `
                    <div class="map-card warning">
                        <div class="card-header">
                            <div class="card-title">${escapeHtml(p.name || p.profileId)}</div>
                        </div>
                        <div class="card-info">
                            <div><strong>MAP Tag:</strong> <code>${escapeHtml(mapTag)}</code></div>
                            <div><strong>Profile ID:</strong> <code>${escapeHtml(p.profileId)}</code></div>
                            <div><strong>ARN:</strong> <code style="font-size: 0.85em; word-break: break-all;">${escapeHtml(profileArn)}</code></div>
                            <div><strong>Calls:</strong> ${formatCalls(p.invocations)}</div>
                        </div>
                    </div>
                `;
            });
            html += `
                        </div>
                    </div>
                </div>
            `;
        });
        html += '</div></div>';
    }
    
    if (completed.length > 0) {
        html += `<div class="map-section">
            <h3 class="section-title success" onclick="toggleSection(this)">
                <span>✅ Fully Migrated to MAP Profiles (${escapeHtml(String(completed.length))})</span>
                <span class="collapse-icon">▼</span>
            </h3>
            <div class="section-content">`;
        completed.forEach(m => {
            html += `
                <div class="map-model-group">
                    <div class="model-header">
                        <div class="model-title-wrapper">
                            <strong>${escapeHtml(m.modelId)}</strong>
                            <button class="btn-copy-inline" onclick="showMapModelDetails(event, ${JSON.stringify(m).replace(/"/g, '&quot;')})" title="View Details">ℹ️</button>
                        </div>
                        <span class="collapse-icon" onclick="toggleModelGroup(this)">▼</span>
                    </div>
                    <div class="model-content">
                        <div class="model-summary">
                            <div class="metric">Total Calls: <strong>${formatCalls(m.profileInvocations)}</strong></div>
                            <div class="metric">🔴 Direct Model: <strong>0</strong></div>
                            <div class="metric">🟢 MAP Profiles: <strong>${formatCalls(m.profileInvocations)}</strong></div>
                        </div>
                        ${(m.systemProfiles || []).length > 0 ? `
                            <div style="margin: 12px 0; padding: 10px; background: #f0f8ff; border-radius: 4px; border-left: 3px solid #0073bb;">
                                <strong>System Profiles (global/us):</strong>
                                ${m.systemProfiles.map(sp => `<div style="margin-top: 4px;">• ${escapeHtml(sp.profileId)}: ${formatCalls(sp.invocations)} calls</div>`).join('')}
                            </div>
                        ` : ''}
                        <div style="margin-top: 12px; font-weight: 600;">MAP Application Profiles:</div>
                        <div class="profiles-grid">
            `;
            m.profiles.forEach(p => {
                const mapTag = p.tags['map-migrated'] || 'N/A';
                const profileArn = `arn:aws:bedrock:us-west-2:${p.accountId || '...'}:inference-profile/${p.profileId}`;
                html += `
                    <div class="map-card success">
                        <div class="card-header">
                            <div class="card-title">${escapeHtml(p.name || p.profileId)}</div>
                        </div>
                        <div class="card-info">
                            <div><strong>MAP Tag:</strong> <code>${escapeHtml(mapTag)}</code></div>
                            <div><strong>Profile ID:</strong> <code>${escapeHtml(p.profileId)}</code></div>
                            <div><strong>ARN:</strong> <code style="font-size: 0.85em; word-break: break-all;">${escapeHtml(profileArn)}</code></div>
                            <div><strong>Calls:</strong> ${formatCalls(p.invocations)}</div>
                        </div>
                    </div>
                `;
            });
            html += `
                        </div>
                    </div>
                </div>
            `;
        });
        html += '</div></div>';
    }
    
    if (models.length === 0) {
        html = '<p class="info-message">No models found. Select a MAP project or check your region.</p>';
    }
    
    safeSetHTML('mapContent', html);
}

// 切换section展开/收起
function toggleSection(header) {
    const content = header.nextElementSibling;
    header.classList.toggle('collapsed');
    content.classList.toggle('collapsed');
    
    if (content.style.display === 'none') {
        content.style.display = 'grid';
    } else {
        content.style.display = 'none';
    }
}

// 切换卡片body展开/收起
function toggleCardBody(header) {
    event.stopPropagation();
    const card = header.closest('.map-card');
    const body = card.querySelector('.card-body');
    const actions = card.querySelector('.card-actions');
    
    header.classList.toggle('collapsed');
    
    if (body.classList.contains('collapsed')) {
        body.classList.remove('collapsed');
        body.style.maxHeight = body.scrollHeight + 'px';
        if (actions) actions.style.display = 'flex';
    } else {
        body.style.maxHeight = body.scrollHeight + 'px';
        setTimeout(() => {
            body.classList.add('collapsed');
            body.style.maxHeight = '0';
        }, 10);
        if (actions) actions.style.display = 'none';
    }
}

// 切换section展开/收起
function toggleSection(header) {
    const content = header.nextElementSibling;
    header.classList.toggle('collapsed');
    content.classList.toggle('collapsed');
    
    if (content.style.display === 'none') {
        content.style.display = 'grid';
    } else {
        content.style.display = 'none';
    }
}

// 切换卡片body展开/收起
function toggleCardBody(header) {
    event.stopPropagation();
    const card = header.closest('.map-card');
    const body = card.querySelector('.card-body');
    const actions = card.querySelector('.card-actions');
    
    header.classList.toggle('collapsed');
    
    if (body.classList.contains('collapsed')) {
        body.classList.remove('collapsed');
        body.style.maxHeight = body.scrollHeight + 'px';
        if (actions) actions.style.display = 'flex';
    } else {
        body.style.maxHeight = body.scrollHeight + 'px';
        setTimeout(() => {
            body.classList.add('collapsed');
            body.style.maxHeight = '0';
        }, 10);
        if (actions) actions.style.display = 'none';
    }
}


// 切换模型组展开/收起
function toggleModelGroup(icon) {
    event.stopPropagation();
    const header = icon.closest('.model-header');
    const group = header.closest('.map-model-group');
    const content = group.querySelector('.model-content');
    
    header.classList.toggle('collapsed');
    
    if (content.classList.contains('collapsed')) {
        content.classList.remove('collapsed');
        content.style.maxHeight = content.scrollHeight + 'px';
    } else {
        content.style.maxHeight = content.scrollHeight + 'px';
        setTimeout(() => {
            content.classList.add('collapsed');
            content.style.maxHeight = '0';
        }, 10);
    }
}

// 显示 MAP model 详情
async function showMapModelDetails(event, model) {
    event.stopPropagation();
    
    // 如果 allProfiles 未加载
    if (!allProfiles || Object.keys(allProfiles).length === 0) {
        showToast('Loading profile data, please try again...', 'warning');
        return;
    }
    
    // 查找匹配的 profile
    let foundProfile = null;
    let provider = '';
    
    for (const key in allProfiles) {
        const [prov, scope] = key.split('|');
        const profiles = allProfiles[key];
        
        for (const p of profiles) {
            // 匹配逻辑：
            // 1. 直接匹配 modelId（foundation model 或 profile ID）
            // 2. 匹配 inferenceProfileArn 中的 profile ID
            const profileId = p.inferenceProfileArn.split('/').pop();
            if (p.modelId === model.modelId || profileId === model.modelId) {
                foundProfile = p;
                provider = prov;
                break;
            }
        }
        if (foundProfile) break;
    }
    
    if (foundProfile) {
        const profileType = foundProfile.inferenceProfileArn.includes('application-inference-profile') ? 'application' : 'system';
        showProfileDetails(event, foundProfile, provider, profileType);
    } else {
        // 对于没有找到的 foundation model，显示信息
        showToast(`Model ${escapeHtml(model.modelId)}: Direct calls ${model.modelInvocations.toLocaleString()}. Consider creating MAP profiles.`, 'info');
    }
}


// MAP Dashboard 选择模型
function toggleMapModelSelection(modelId, el) {
    // Ignore clicks on buttons/links inside the card
    if (event && (event.target.closest('.btn-copy-inline') || event.target.closest('.collapse-icon'))) return;
    if (mapSelectedModels.has(modelId)) {
        mapSelectedModels.delete(modelId);
        el.classList.remove('selected');
    } else {
        mapSelectedModels.add(modelId);
        el.classList.add('selected');
    }
    updateMapSelectionUI();
}

// 更新 MAP 选择 UI
function updateMapSelectionUI() {
    const count = mapSelectedModels.size;
    const countEl = document.getElementById('mapSelectedCount');
    const btnEl = document.getElementById('mapCreateBtn');
    
    if (countEl) countEl.textContent = count;
    if (btnEl) btnEl.disabled = count === 0;
}

// 从 MAP Dashboard 创建 profiles
async function createProfilesFromMap() {
    if (mapSelectedModels.size === 0) {
        showToast('Please select at least one model', 'warning');
        return;
    }
    
    // 切换到 View Profiles 页面
    switchToView('profiles');
    
    // 如果 View Profiles 还没有加载数据，先加载
    if (!allProfiles || Object.keys(allProfiles).length === 0) {
        showToast('Loading profiles...', 'info');
        await loadData();
    }
    
    // 清除所有过滤器，确保所有卡片都可见
    filters.providers.clear();
    filters.scope = null;
    filters.modelId = '';
    
    // 重新渲染以显示所有卡片
    renderProfiles();
    
    // 等待渲染完成后选中
    setTimeout(() => {
        selectProfilesByModelIds(mapSelectedModels);
    }, 100);
}

// 根据 modelId 选中 View Profiles 中的卡片
function selectProfilesByModelIds(modelIds) {
    let selectedCount = 0;
    let skippedCount = 0;
    let notFoundIds = [];
    
    // 遍历所有 profile 卡片
    document.querySelectorAll('.profile-card').forEach(card => {
        const cardModelId = card.dataset.modelId;
        
        // 检查是否在选中列表中
        if (cardModelId && modelIds.has(cardModelId)) {
            // 检查卡片是否可选（没有被禁用）
            const isDisabled = card.style.cursor === 'not-allowed';
            
            if (isDisabled) {
                skippedCount++;
                console.log(`Skipped disabled model: ${cardModelId} (${card.title})`);
            } else if (!card.classList.contains('selected')) {
                // 如果还没选中且可选，则选中
                card.click();
                selectedCount++;
            }
        }
    });
    
    // 检查哪些没找到
    modelIds.forEach(id => {
        const found = Array.from(document.querySelectorAll('.profile-card')).some(
            card => card.dataset.modelId === id
        );
        if (!found) {
            notFoundIds.push(id);
        }
    });
    
    let message = '';
    if (selectedCount > 0) {
        message = `Selected ${selectedCount} models from MAP Dashboard`;
    }
    if (skippedCount > 0) {
        message += (message ? '. ' : '') + `Skipped ${skippedCount} incompatible models`;
    }
    
    if (message) {
        showToast(message, selectedCount > 0 ? 'success' : 'warning');
    }
    
    if (notFoundIds.length > 0) {
        console.warn('Models not found in View Profiles:', notFoundIds);
    }
}

// ============================================
// MAP Dashboard V2 - Lazy Loading
// ============================================

let cachedMapV2Metrics = null;
let cachedMapV2Profiles = null;
let mapv2SelectedModels = new Set();
let mapV2ProfilesLoading = false;
let cachedMapV2MetricsMs = 0;
let cachedMapV2ProfilesMs = 0;

async function loadMapProjectsV2() {
    const profile = document.getElementById('awsProfile').value;
    const region = document.getElementById('region').value;
    try {
        const res = await fetch(`/api/map-projects?profile=${profile}&region=${escapeHtml(region)}`);
        const projects = await res.json();
        const select = document.getElementById('mapv2ProjectId');
        safeSetHTML(select, '<option value="">All MAP Projects</option>');
        projects.forEach(proj => {
            const option = document.createElement('option');
            option.value = proj;
            option.textContent = proj;
            select.appendChild(option);
        });
    } catch (error) {
        console.error('Failed to load MAP projects:', error);
    }
}

async function loadMapDashboardV2() {
    const profile = document.getElementById('awsProfile').value;
    const region = document.getElementById('region').value;
    const timeRange = document.getElementById('mapv2TimeRange').value;

    cachedMapV2Metrics = null;
    cachedMapV2Profiles = null;
    mapV2ProfilesLoading = false;
    cachedMapV2MetricsMs = 0;
    cachedMapV2ProfilesMs = 0;

    // Show loading with animated status
    safeSetHTML('mapv2Summary', `<div style="text-align:right;font-size:0.85em;margin-bottom:8px;color:#f39c12;">
        <span class="map-v2-loading-dots">⏳ Loading metrics</span>
        <style>.map-v2-loading-dots::after{content:'';animation:dots 1.5s steps(3,end) infinite}@keyframes dots{0%{content:''}33%{content:'.'}66%{content:'..'}100%{content:'...'}}</style>
    </div>`);
    safeSetHTML('mapv2Content', '<div class="loading">Loading metrics...</div>');

    const t0 = performance.now();

    try {
        // Phase 1: Fast metrics
        const metricsRes = await fetch('/api/map-dashboard/v2/metrics', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ awsProfile: profile, region, timeRange })
        });
        const metricsData = await metricsRes.json();

        if (!metricsData.success) {
            showError('mapv2Content', metricsData.error);
            return;
        }

        const t1 = performance.now();
        cachedMapV2Metrics = metricsData;
        cachedMapV2MetricsMs = t1 - t0;

        // Mark phase 2 loading BEFORE render so UI shows loading state
        mapV2ProfilesLoading = true;

        // Render phase 1 immediately
        renderMapDashboardV2();

        // Phase 2: Load profiles in background
        const profilesRes = await fetch('/api/map-dashboard/v2/profiles', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ awsProfile: profile, region, mapProject: '' })
        });
        const profilesData = await profilesRes.json();

        if (profilesData.success) {
            cachedMapV2Profiles = profilesData.profilesBySource;
        }
        mapV2ProfilesLoading = false;
        cachedMapV2ProfilesMs = performance.now() - t1;

        // Auto re-render with full data
        renderMapDashboardV2();

    } catch (error) {
        showError('mapv2Content', error.message);
    }
}

function filterMapDashboardV2() {
    if (!cachedMapV2Metrics) {
        loadMapDashboardV2();
        return;
    }
    renderMapDashboardV2();
}

function renderMapDashboardV2() {
    if (!cachedMapV2Metrics) return;

    const mapProject = document.getElementById('mapv2ProjectId').value;
    const models = cachedMapV2Metrics.models;
    const appProfileIds = cachedMapV2Metrics.appProfileIds || {};
    const profilesBySource = cachedMapV2Profiles || null;

    // Merge app profile data if available
    let mergedModels = models.map(m => ({ ...m, profiles: [], profileInvocations: 0, hasProfiles: false }));

    if (profilesBySource) {
        // Build profileId -> invocations lookup from appProfileIds
        const profileInvocations = appProfileIds;

        // For each source model, attach its app profiles and sum invocations
        const modelMap = {};
        mergedModels.forEach(m => { modelMap[m.modelId] = m; });

        for (const [sourceId, profiles] of Object.entries(profilesBySource)) {
            // Filter by MAP project if selected
            let filteredProfiles = profiles;
            if (mapProject) {
                filteredProfiles = profiles.filter(p => p.tags['map-migrated'] === mapProject);
            }
            if (filteredProfiles.length === 0) continue;

            // Attach invocations to each profile
            filteredProfiles.forEach(p => {
                p.invocations = profileInvocations[p.profileId] || 0;
            });

            const totalProfileInvocations = filteredProfiles.reduce((sum, p) => sum + p.invocations, 0);

            if (modelMap[sourceId]) {
                // Source model already in list (has direct calls)
                modelMap[sourceId].profiles = filteredProfiles;
                modelMap[sourceId].profileInvocations = totalProfileInvocations;
                modelMap[sourceId].hasProfiles = true;
            } else {
                // Source model has no direct calls, only MAP profile calls
                const parts = sourceId.split('.', 1);
                const known = new Set(['global','us','eu','apac','ap','jp','ca','sa','me','af']);
                const p0 = sourceId.split('.')[0];
                mergedModels.push({
                    modelId: sourceId,
                    modelType: known.has(p0) ? 'system' : 'foundation',
                    scope: known.has(p0) ? p0 : '',
                    modelInvocations: 0,
                    profiles: filteredProfiles,
                    profileInvocations: totalProfileInvocations,
                    hasProfiles: true
                });
            }
        }
    }

    // Filter out models with no activity (when project filter applied)
    if (mapProject && profilesBySource) {
        mergedModels = mergedModels.filter(m => m.modelInvocations > 0 || m.profileInvocations > 0 || m.hasProfiles);
    }

    // Classify
    const noProfiles = mergedModels.filter(m => !m.hasProfiles && m.modelInvocations > 0 && m.modelType !== 'system');
    const systemModels = mergedModels.filter(m => m.modelType === 'system' && !m.hasProfiles);
    const withProfiles = mergedModels.filter(m => m.hasProfiles && m.modelInvocations > 0);
    const completed = mergedModels.filter(m => m.hasProfiles && m.modelInvocations === 0);

    const totalModels = mergedModels.filter(m => m.modelInvocations > 0 || m.hasProfiles).length;
    const needMigration = noProfiles.length + systemModels.length;
    const hasMigration = withProfiles.length + completed.length;
    const totalMapCalls = mergedModels.reduce((sum, m) => sum + (m.profileInvocations || 0), 0);

    const formatCalls = (count) => count >= 1000 ? `${(count / 1000).toFixed(1)}K` : count.toString();

    // Timing & status info
    let timingHtml = '';
    if (cachedMapV2MetricsMs > 0) {
        if (cachedMapV2Profiles) {
            // Phase 2 done
            timingHtml = `<div style="text-align:right;font-size:0.85em;margin-bottom:8px;color:#1a8754;">
                ✅ All data loaded — Metrics: ${(cachedMapV2MetricsMs/1000).toFixed(2)}s | Profiles: ${(cachedMapV2ProfilesMs/1000).toFixed(2)}s | Total: ${((cachedMapV2MetricsMs+cachedMapV2ProfilesMs)/1000).toFixed(2)}s
            </div>`;
        } else if (mapV2ProfilesLoading) {
            // Phase 1 done, phase 2 loading
            timingHtml = `<div style="text-align:right;font-size:0.85em;margin-bottom:8px;color:#f39c12;">
                ⚡ Metrics loaded (${(cachedMapV2MetricsMs/1000).toFixed(2)}s) — <span class="map-v2-loading-dots">⏳ Loading profiles</span>
            </div>
            <style>.map-v2-loading-dots::after{content:'';animation:dots 1.5s steps(3,end) infinite}@keyframes dots{0%{content:''}33%{content:'.'}66%{content:'..'}100%{content:'...'}}</style>`;
        } else {
            // Only phase 1
            timingHtml = `<div style="text-align:right;font-size:0.85em;margin-bottom:8px;color:#666;">
                ⚡ Metrics: ${(cachedMapV2MetricsMs/1000).toFixed(2)}s
            </div>`;
        }
    }

    // Summary
    let summaryHtml = timingHtml + `
        <div class="map-summary">
            <div class="summary-card">
                <div class="summary-label">Total Models</div>
                <div class="summary-value">${totalModels}</div>
            </div>
            <div class="summary-card" style="background: #fff5f5; border-color: #d13212;">
                <div class="summary-label">❌ Need MAP Profiles</div>
                <div class="summary-value">${needMigration}</div>
            </div>
            <div class="summary-card success">
                <div class="summary-label">✅ Have MAP Profiles</div>
                <div class="summary-value">${hasMigration}</div>
            </div>
            <div class="summary-card" style="background: #f0f8ff; border-color: #0073bb;">
                <div class="summary-label">MAP Profile Calls</div>
                <div class="summary-value">${formatCalls(totalMapCalls)}</div>
            </div>
        </div>
    `;
    safeSetHTML('mapv2Summary', summaryHtml);

    // Content - reuse same rendering logic as v1
    let html = '';

    // 🔴 Direct Model Calls
    if (noProfiles.length > 0) {
        html += `<div class="map-section">
            <h3 class="section-title alert" onclick="toggleSection(this)">
                <span>🔴 Direct Model Calls (No MAP Profiles) (${escapeHtml(String(noProfiles.length))})</span>
                <span class="collapse-icon">▼</span>
            </h3>
            <div class="section-content">`;
        noProfiles.forEach(m => {
            html += renderMapV2ModelCard(m, true);
        });
        html += '</div></div>';
    }

    // 🔵 System Profiles
    if (systemModels.length > 0) {
        html += `<div class="map-section">
            <h3 class="section-title" style="color: #0073bb; border-left-color: #0073bb; background: #f0f8ff;" onclick="toggleSection(this)">
                <span>🔵 System Inference Profiles (${escapeHtml(String(systemModels.length))})</span>
                <span class="collapse-icon">▼</span>
            </h3>
            <div class="section-content">`;
        systemModels.forEach(m => {
            html += renderMapV2ModelCard(m, true);
        });
        html += '</div></div>';
    }

    // ⚠️ Partial Coverage
    if (withProfiles.length > 0) {
        html += `<div class="map-section">
            <h3 class="section-title warning" onclick="toggleSection(this)">
                <span>⚠️ Partial Coverage (Mixed Traffic) (${escapeHtml(String(withProfiles.length))})</span>
                <span class="collapse-icon">▼</span>
            </h3>
            <div class="section-content">`;
        withProfiles.forEach(m => {
            const totalCalls = m.modelInvocations + m.profileInvocations;
            const directPct = (m.modelInvocations / totalCalls * 100).toFixed(0);
            const appPct = (m.profileInvocations / totalCalls * 100).toFixed(0);
            html += `
                <div class="map-model-group">
                    <div class="model-header">
                        <div class="model-title-wrapper">
                            <strong>${escapeHtml(m.modelId)}</strong>
                        </div>
                        <span class="collapse-icon" onclick="toggleModelGroup(this)">▼</span>
                    </div>
                    <div class="model-content">
                        <div class="model-summary">
                            <div class="metric">Total Calls: <strong>${formatCalls(totalCalls)}</strong></div>
                            <div class="metric">🔴 Direct Model: <strong>${formatCalls(m.modelInvocations)}</strong> (${directPct}%)</div>
                            <div class="metric">🟢 MAP Profiles: <strong>${formatCalls(m.profileInvocations)}</strong> (${appPct}%)</div>
                        </div>
                        <div style="margin-top: 12px; font-weight: 600;">MAP Application Profiles:</div>
                        <div class="profiles-grid">`;
            m.profiles.forEach(p => {
                html += renderMapV2ProfileCard(p, 'warning');
            });
            html += '</div></div></div>';
        });
        html += '</div></div>';
    }

    // ✅ Fully Migrated
    if (completed.length > 0) {
        html += `<div class="map-section">
            <h3 class="section-title success" onclick="toggleSection(this)">
                <span>✅ Fully Migrated to MAP Profiles (${escapeHtml(String(completed.length))})</span>
                <span class="collapse-icon">▼</span>
            </h3>
            <div class="section-content">`;
        completed.forEach(m => {
            html += `
                <div class="map-model-group">
                    <div class="model-header">
                        <div class="model-title-wrapper"><strong>${escapeHtml(m.modelId)}</strong></div>
                        <span class="collapse-icon" onclick="toggleModelGroup(this)">▼</span>
                    </div>
                    <div class="model-content">
                        <div class="model-summary">
                            <div class="metric">🟢 MAP Profiles: <strong>${formatCalls(m.profileInvocations)}</strong></div>
                        </div>
                        <div style="margin-top: 12px; font-weight: 600;">MAP Application Profiles:</div>
                        <div class="profiles-grid">`;
            m.profiles.forEach(p => {
                html += renderMapV2ProfileCard(p, 'success');
            });
            html += '</div></div></div>';
        });
        html += '</div></div>';
    }

    // Loading indicator for profiles phase 2
    if (!profilesBySource && mapV2ProfilesLoading) {
        html += `<div class="loading" style="margin-top:16px;padding:16px;background:#fff8e1;border:1px solid #ffe082;border-radius:8px;">
            <div style="font-size:1.1em;"><span class="map-v2-loading-dots">⏳ Loading application profiles</span></div>
            <div style="font-size:0.85em;color:#666;margin-top:6px;">⚠️ Partial Coverage and ✅ Fully Migrated will appear automatically</div>
        </div>`;
    }

    if (mergedModels.length === 0 && !mapV2ProfilesLoading) {
        html = '<p class="info-message">No models found. Select a MAP project or check your region.</p>';
    }

    safeSetHTML('mapv2Content', html);
}

function renderMapV2ModelCard(m, selectable) {
    const formatCalls = (count) => count >= 1000 ? `${(count / 1000).toFixed(1)}K` : count.toString();
    const isSelected = mapv2SelectedModels.has(m.modelId);
    return `
        <div class="map-model-group ${selectable ? 'selectable' : ''} ${isSelected ? 'selected' : ''}" ${selectable ? `onclick="toggleMapV2ModelSelection('${escapeHtml(m.modelId)}', this)"` : ''}>
            <div class="model-header">
                <div class="model-title-wrapper"><strong>${escapeHtml(m.modelId)}</strong></div>
                <span class="collapse-icon" onclick="toggleModelGroup(this)">▼</span>
            </div>
            <div class="model-content">
                <div class="model-summary">
                    <div class="metric">${m.modelType === 'system' ? 'System Profile' : 'Direct Model'} Calls: <strong>${formatCalls(m.modelInvocations)}</strong></div>
                    <div class="metric">MAP Profiles: <span class="badge-alert">None</span></div>
                </div>
            </div>
        </div>`;
}

function renderMapV2ProfileCard(p, cssClass) {
    const formatCalls = (count) => count >= 1000 ? `${(count / 1000).toFixed(1)}K` : count.toString();
    const mapTag = p.tags['map-migrated'] || 'N/A';
    return `
        <div class="map-card ${cssClass}">
            <div class="card-header">
                <div class="card-title">${escapeHtml(p.name || p.profileId)}</div>
            </div>
            <div class="card-info">
                <div><strong>MAP Tag:</strong> <code>${escapeHtml(mapTag)}</code></div>
                <div><strong>Profile ID:</strong> <code>${escapeHtml(p.profileId)}</code></div>
                <div><strong>Calls:</strong> ${formatCalls(p.invocations || 0)}</div>
            </div>
        </div>`;
}

function toggleMapV2ModelSelection(modelId, el) {
    if (event && (event.target.closest('.btn-copy-inline') || event.target.closest('.collapse-icon'))) return;
    if (mapv2SelectedModels.has(modelId)) {
        mapv2SelectedModels.delete(modelId);
        el.classList.remove('selected');
    } else {
        mapv2SelectedModels.add(modelId);
        el.classList.add('selected');
    }
    const countEl = document.getElementById('mapv2SelectedCount');
    const btnEl = document.getElementById('mapv2CreateBtn');
    if (countEl) countEl.textContent = mapv2SelectedModels.size;
    if (btnEl) btnEl.disabled = mapv2SelectedModels.size === 0;
}

async function createProfilesFromMapV2() {
    if (mapv2SelectedModels.size === 0) {
        showToast('Please select at least one model', 'warning');
        return;
    }
    switchToView('profiles');
    if (!allProfiles || Object.keys(allProfiles).length === 0) {
        showToast('Loading profiles...', 'info');
        await loadData();
    }
    filters.providers.clear();
    filters.scope = null;
    filters.modelId = '';
    renderProfiles();
    setTimeout(() => { selectProfilesByModelIds(mapv2SelectedModels); }, 100);
}
