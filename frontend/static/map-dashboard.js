// ============================================
// MAP Dashboard
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

// 显示 MAP Dashboard profile 小卡片详情
function showMapProfileDetails(event, profileId) {
    event.stopPropagation();
    
    for (const key in allProfiles) {
        const [provider] = key.split('|');
        for (const p of allProfiles[key]) {
            const pid = p.inferenceProfileArn.split('/').pop();
            if (pid === profileId) {
                const profileType = p.inferenceProfileArn.includes('application-inference-profile') ? 'application' : 'system';
                showProfileDetails(event, p, provider, profileType);
                return;
            }
        }
    }
    
    showToast(`Profile ${profileId} not found in current region.`, 'warning');
}


// MAP Dashboard 选择模型
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

// MAP Dashboard date range picker
let mapv2DatePicker = null;
let mapv2StartDate = null;
let mapv2EndDate = null;

function formatDateRangeLabel(start, end) {
    const days = Math.round((end - start) / 86400000);
    const fmt = d => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    return `${fmt(start)} – ${fmt(end)}  (${days}d)`;
}

function setMapv2DateLabel(label) {
    // Flatpickr overwrites value, so use setTimeout to set after
    setTimeout(() => { document.getElementById('mapv2DateRange').value = label; }, 0);
}

function initMapv2DatePicker() {
    if (mapv2DatePicker) return;
    
    const now = new Date();
    const d7ago = new Date(now);
    d7ago.setDate(d7ago.getDate() - 7);
    mapv2StartDate = d7ago;
    mapv2EndDate = now;
    
    const shortcuts = [
        { label: 'Last 3 days', days: 3 },
        { label: 'Last 7 days', days: 7 },
        { label: 'Last 14 days', days: 14 },
        { label: 'Last 30 days', days: 30 },
        { label: 'Last 90 days', days: 90 },
    ];
    
    mapv2DatePicker = flatpickr('#mapv2DateRange', {
        mode: 'range',
        dateFormat: 'Y-m-d',
        defaultDate: [d7ago, now],
        maxDate: 'today',
        onReady: function(selectedDates, dateStr, instance) {
            const container = document.createElement('div');
            container.className = 'flatpickr-shortcuts';
            shortcuts.forEach(s => {
                const btn = document.createElement('button');
                btn.textContent = s.label;
                btn.type = 'button';
                btn.className = 'flatpickr-shortcut-btn';
                btn.addEventListener('click', () => {
                    const end = new Date();
                    const start = new Date();
                    start.setDate(start.getDate() - s.days);
                    instance.setDate([start, end], true);
                    mapv2StartDate = start;
                    mapv2EndDate = end;
                    setMapv2DateLabel(s.label);
                    instance.close();
                });
                container.appendChild(btn);
            });
            instance.calendarContainer.appendChild(container);
        },
        onChange: function(selectedDates) {
            if (selectedDates.length === 2) {
                mapv2StartDate = selectedDates[0];
                mapv2EndDate = selectedDates[1];
                setMapv2DateLabel(formatDateRangeLabel(selectedDates[0], selectedDates[1]));
            }
        },
        onClose: function(selectedDates) {
            if (selectedDates.length === 2) {
                loadMapDashboardV2();
            }
        }
    });
    
    document.getElementById('mapv2DateRange').value = 'Last 7 days';
}

async function loadMapDashboardV2() {
    clearProfileSelections();
    mapv2SelectedModels.clear();
    const countEl = document.getElementById('mapv2SelectedCount');
    const btnEl = document.getElementById('mapv2CreateBtn');
    if (countEl) countEl.textContent = '0';
    if (btnEl) btnEl.disabled = true;
    const profile = document.getElementById('awsProfile').value;
    const region = document.getElementById('region').value;

    // Preload profiles data for Details buttons
    if (allProfilesRegion !== region || Object.keys(allProfiles).length === 0) {
        fetch(`/api/profiles?profile=${profile}&region=${escapeHtml(region)}`)
            .then(res => res.ok ? res.json() : {})
            .then(data => { allProfiles = data; allProfilesRegion = region; });
    }

    if (!mapv2StartDate || !mapv2EndDate) {
        const now = new Date();
        mapv2EndDate = now;
        mapv2StartDate = new Date(now);
        mapv2StartDate.setDate(mapv2StartDate.getDate() - 7);
    }

    const fmt = d => d.toISOString().split('T')[0];
    const payload = {
        awsProfile: profile,
        region,
        startTime: fmt(mapv2StartDate) + 'T00:00:00Z',
        endTime: fmt(mapv2EndDate) + 'T23:59:59Z'
    };

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
            body: JSON.stringify(payload)
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

    // Build inference-only model set from allProfiles (loaded async from /api/profiles)
    const inferenceOnlyModels = new Set();
    if (allProfiles && Object.keys(allProfiles).length > 0) {
        for (const profiles of Object.values(allProfiles)) {
            for (const p of profiles) {
                if (p.inferenceOnly) inferenceOnlyModels.add(p.modelId);
            }
        }
    }

    // Merge app profile data if available
    let mergedModels = models.map(m => {
        const copy = { ...m, profiles: [], profileInvocations: 0, hasProfiles: false };
        // Mark inference-profile-only models called directly as invalid
        if (m.modelType === 'foundation' && inferenceOnlyModels.has(m.modelId)) {
            copy.modelType = 'invalid_direct_call';
        }
        return copy;
    });

    const known = new Set(['global','us','eu','apac','ap','jp','ca','sa','me','af']);

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

            // Split profiles by scope (global vs regional)
            const globalProfiles = filteredProfiles.filter(p => p.scope === 'global');
            const regionalProfiles = filteredProfiles.filter(p => p.scope !== 'global');
            const totalProfileInvocations = filteredProfiles.reduce((s, p) => s + p.invocations, 0);

            const isInvalid = modelMap[sourceId] && modelMap[sourceId].modelType === 'invalid_direct_call';

            // Attach to foundation model entry if it exists and is valid
            if (modelMap[sourceId] && !isInvalid) {
                modelMap[sourceId].profiles = filteredProfiles;
                modelMap[sourceId].profileInvocations = totalProfileInvocations;
                modelMap[sourceId].hasProfiles = true;
            }

            // Attach MAP profiles to matching system profiles by scope
            let globalAttached = false;
            let regionalAttached = false;
            for (const m of mergedModels) {
                if (m.modelType !== 'system') continue;
                const base = m.modelId.substring(m.modelId.indexOf('.') + 1);
                if (base !== sourceId) continue;

                const isGlobalSystem = m.scope === 'global';
                const scopedProfiles = isGlobalSystem ? globalProfiles : regionalProfiles;
                if (scopedProfiles.length > 0) {
                    m.profiles = [...scopedProfiles];
                    m.profileInvocations = scopedProfiles.reduce((s, p) => s + p.invocations, 0);
                    m.hasProfiles = true;
                    if (isGlobalSystem) globalAttached = true;
                    else regionalAttached = true;
                }
            }

            // Create fallback entries for unattached profiles
            if (!globalAttached && globalProfiles.length > 0 && (isInvalid || !modelMap[sourceId])) {
                mergedModels.push({
                    modelId: `global.${sourceId}`,
                    modelType: 'system',
                    scope: 'global',
                    modelInvocations: 0,
                    profiles: globalProfiles,
                    profileInvocations: globalProfiles.reduce((s, p) => s + p.invocations, 0),
                    hasProfiles: true
                });
                globalAttached = true;
            }
            // Fallback for unattached regional or all profiles
            if (!modelMap[sourceId] && !isInvalid && !globalAttached && !regionalAttached) {
                // No system profile match, no foundation model match — use sourceId as-is
                mergedModels.push({
                    modelId: sourceId,
                    modelType: 'foundation',
                    scope: '',
                    modelInvocations: 0,
                    profiles: filteredProfiles,
                    profileInvocations: totalProfileInvocations,
                    hasProfiles: true
                });
            } else if (!regionalAttached && regionalProfiles.length > 0 && (isInvalid || !modelMap[sourceId])) {
                // Derive regional prefix from current region
                const region = document.getElementById('region').value || 'us-east-1';
                const regionPrefix = region.startsWith('eu') ? 'eu' :
                    region.startsWith('ap') ? 'apac' :
                    region.startsWith('me') ? 'me' :
                    region.startsWith('af') ? 'af' :
                    region.startsWith('sa') ? 'sa' :
                    region.startsWith('ca') ? 'ca' : 'us';
                mergedModels.push({
                    modelId: `${regionPrefix}.${sourceId}`,
                    modelType: 'system',
                    scope: 'us',
                    modelInvocations: 0,
                    profiles: regionalProfiles,
                    profileInvocations: regionalProfiles.reduce((s, p) => s + p.invocations, 0),
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
    const invalidCalls = mergedModels.filter(m => m.modelType === 'invalid_direct_call');
    const noProfiles = mergedModels.filter(m => !m.hasProfiles && m.modelInvocations > 0 && m.modelType === 'foundation');
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
                            <div class="metric">${m.modelType === 'system' ? '🔵 System Profile' : '🔴 Direct Model'}: <strong>${formatCalls(m.modelInvocations)}</strong> (${directPct}%)</div>
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

    // ⛔ Invalid Direct Calls (inference-profile-only models called directly)
    if (invalidCalls.length > 0) {
        html += `<div class="map-section">
            <h3 class="section-title" style="color: #6c757d; border-left-color: #6c757d; background: #f8f9fa;" onclick="toggleSection(this)">
                <span>⛔ Invalid Direct Calls (${escapeHtml(String(invalidCalls.length))}) — These models require inference profiles</span>
                <span class="collapse-icon">▼</span>
            </h3>
            <div class="section-content">`;
        invalidCalls.forEach(m => {
            html += renderMapV2ModelCard(m, false);
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
                    <div class="metric">${m.modelType === 'system' ? 'System Profile' : m.modelType === 'invalid_direct_call' ? '⛔ Invalid Direct' : 'Direct Model'} Calls: <strong>${formatCalls(m.modelInvocations)}</strong></div>
                    <div class="metric">MAP Profiles: <span class="badge-alert">None</span></div>
                </div>
            </div>
        </div>`;
}

function renderMapV2ProfileCard(p, cssClass) {
    const formatCalls = (count) => count >= 1000 ? `${(count / 1000).toFixed(1)}K` : count.toString();
    const tagsHtml = Object.entries(p.tags).map(([k, v]) =>
        `<span class="tag">${escapeHtml(k)}: ${escapeHtml(v)}</span>`
    ).join(' ');
    return `
        <div class="map-card ${cssClass}">
            <div class="card-header">
                <div class="card-title">${escapeHtml(p.name || p.profileId)}</div>
                <button class="btn-details" onclick="showMapProfileDetails(event, '${escapeHtml(p.profileId)}')">Details</button>
            </div>
            <div class="card-info">
                <div><strong>Profile ID:</strong> <code>${escapeHtml(p.profileId)}</code></div>
                <div><strong>Calls:</strong> ${formatCalls(p.invocations || 0)}</div>
                <div class="card-tags">${tagsHtml}</div>
            </div>
        </div>`;
}

function toggleMapV2ModelSelection(modelId, el) {
    if (event && (event.target.closest('.btn-copy-inline') || event.target.closest('.collapse-icon'))) return;
    if (!cachedMapV2Metrics || mapV2ProfilesLoading) return;
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
    clearProfileSelections();
    switchToView('profiles');
    const region = document.getElementById('region').value;
    if (allProfilesRegion !== region || Object.keys(allProfiles).length === 0) {
        await loadData();
    }
    filters.providers.clear();
    filters.scope = null;
    filters.modelId = '';
    renderProfiles();
    setTimeout(() => { selectProfilesByModelIds(mapv2SelectedModels); }, 100);
}
