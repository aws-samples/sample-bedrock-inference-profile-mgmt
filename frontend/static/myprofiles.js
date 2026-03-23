// ============================================
// My Profiles - My Created Profiles page
// ============================================

// 加载我的profiles
let myProfilesData = [];
let myProfilesPage = 1;
const myProfilesPageSize = 20;
let myProfilesSortCol = 'name';
let myProfilesSortDir = 'asc';

// 渲染 My Profiles 过滤区
function renderMyProfilesFilters(tagKeys) {
    const container = document.getElementById('myProfilesFilters');
    if (!container) return;
    
    // 过滤掉 DataZone 相关的 tag keys
    const filteredKeys = tagKeys.filter(k => k !== 'AmazonDataZoneDomain' && !k.startsWith('AmazonDataZone'));
    
    const tagInputsHtml = filteredKeys.map(key => 
        `<div class="tag-filter-row">
            <label class="tag-filter-label">${escapeHtml(key)}</label>
            <span>=</span>
            <input type="text" class="tag-filter-input" data-tag-key="${escapeHtml(key)}" 
                   placeholder="e.g. ${escapeHtml(getTagValueHint(key))}">
        </div>`
    ).join('');
    
    safeSetHTML(container, `
        <div class="filters-container">
            <div class="filters-header" onclick="toggleMyProfilesFilters()">
                <h3>🔽 Filters</h3>
                <span class="filters-toggle">Click to expand/collapse</span>
            </div>
            <div class="filters-content" id="myProfilesFiltersContent" style="display:grid; grid-template-columns:1fr; gap:12px;">
                <div class="filter-row" style="display:flex; gap:16px; align-items:flex-start; flex-wrap:wrap;">
                    <div style="flex:1; min-width:200px;">
                        <div class="filter-header"><h3>Search by Name</h3></div>
                        <input type="text" id="myProfilesNameFilter" placeholder="Type to filter by name..."
                               style="width:100%; padding:8px; border:1px solid #d5dbdb; border-radius:6px;">
                    </div>
                    <div style="flex:2; min-width:300px;">
                        <div class="filter-header"><h3>Filter by Tags</h3></div>
                        <div style="display:flex; gap:12px; flex-wrap:wrap;">
                            ${filteredKeys.map(key => 
                                `<div style="display:flex; align-items:center; gap:4px;">
                                    <label class="tag-filter-label">${escapeHtml(key)}</label>
                                    <span>=</span>
                                    <input type="text" class="tag-filter-input" data-tag-key="${escapeHtml(key)}" 
                                           placeholder="${escapeHtml(getTagValueHint(key))}"
                                           style="width:140px; padding:6px 8px; border:1px solid #d5dbdb; border-radius:6px; font-size:13px;">
                                </div>`
                            ).join('')}
                        </div>
                    </div>
                    <div>
                        <div class="filter-header"><h3>Options</h3></div>
                        <label class="checkbox-label">
                            <input type="checkbox" id="excludeDataZoneMyProfiles" checked onchange="myProfilesPage=1;renderMyProfiles()">
                            <span>Hide DataZone</span>
                        </label>
                    </div>
                </div>
            </div>
        </div>
    `);
    
    document.getElementById('myProfilesNameFilter').addEventListener('input', () => { myProfilesPage=1; renderMyProfiles(); });
    container.querySelectorAll('.tag-filter-input').forEach(input => {
        input.addEventListener('input', () => { myProfilesPage=1; renderMyProfiles(); });
    });
}

// 获取 tag value 的 hint（取第一个已有值作为示例）
function getTagValueHint(tagKey) {
    for (const p of myProfilesData) {
        const tag = (p.tags||[]).find(t => t.key === tagKey);
        if (tag) return tag.value;
    }
    return '';
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

function sortMyProfiles(col) {
    if (myProfilesSortCol === col) {
        myProfilesSortDir = myProfilesSortDir === 'asc' ? 'desc' : 'asc';
    } else {
        myProfilesSortCol = col;
        myProfilesSortDir = 'asc';
    }
    myProfilesPage = 1;
    renderMyProfiles();
}

function goToMyProfilesPage(page) {
    myProfilesPage = page;
    renderMyProfiles();
}

function renderMyProfiles() {
    const excludeDataZone = document.getElementById('excludeDataZoneMyProfiles')?.checked ?? true;
    const nameFilter = (document.getElementById('myProfilesNameFilter')?.value || '').trim().toLowerCase();
    
    // 过滤 DataZone profiles
    let filtered = myProfilesData;
    if (excludeDataZone) {
        filtered = filtered.filter(p => 
            !p.tags || !p.tags.some(t => t.key === 'AmazonDataZoneDomain')
        );
    }
    
    // 按名字过滤
    if (nameFilter) {
        filtered = filtered.filter(p => p.name.toLowerCase().includes(nameFilter));
    }
    
    // 按 tag 过滤（多个 tag key 输入框，全部匹配）
    document.querySelectorAll('.tag-filter-input').forEach(input => {
        const key = input.dataset.tagKey;
        const val = input.value.trim().toLowerCase();
        if (val) {
            filtered = filtered.filter(p => 
                p.tags && p.tags.some(t => t.key === key && t.value.toLowerCase().includes(val))
            );
        }
    });
    
    const sorted = [...filtered].sort((a, b) => {
        let aVal, bVal;
        switch (myProfilesSortCol) {
            case 'status': aVal = a.status.toLowerCase(); bVal = b.status.toLowerCase(); break;
            case 'tags': aVal = (a.tags||[]).map(t=>t.key).join(','); bVal = (b.tags||[]).map(t=>t.key).join(','); break;
            default: aVal = a.name.toLowerCase(); bVal = b.name.toLowerCase();
        }
        const cmp = aVal > bVal ? 1 : aVal < bVal ? -1 : 0;
        return myProfilesSortDir === 'asc' ? cmp : -cmp;
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
    
    // 分页
    const totalPages = Math.max(1, Math.ceil(sorted.length / myProfilesPageSize));
    if (myProfilesPage > totalPages) myProfilesPage = totalPages;
    const startIdx = (myProfilesPage - 1) * myProfilesPageSize;
    const pageData = sorted.slice(startIdx, startIdx + myProfilesPageSize);
    
    const sortIcon = (col) => myProfilesSortCol === col ? (myProfilesSortDir === 'asc' ? ' ↑' : ' ↓') : '';
    
    let html = '<div class="profiles-table"><table><thead><tr>';
    html += `<th class="sortable" onclick="sortMyProfiles('name')">Name${escapeHtml(sortIcon('name'))}</th>`;
    html += '<th>Model ARN</th>';
    html += `<th class="sortable" onclick="sortMyProfiles('status')">Status${escapeHtml(sortIcon('status'))}</th>`;
    html += `<th class="sortable" onclick="sortMyProfiles('tags')">Tags${escapeHtml(sortIcon('tags'))}</th>`;
    html += '<th>Actions</th></tr></thead><tbody>';
    
    pageData.forEach(p => {
        const tagsHtml = p.tags && p.tags.length > 0 
            ? p.tags.map(t => `<span class="tag-badge"><span class="tag-badge-key">${escapeHtml(t.key)}</span>${escapeHtml(t.value)}</span>`).join(' ')
            : '<span style="color:#888">None</span>';
        const modelArnStr = p.modelArn && p.modelArn.length > 0 ? p.modelArn.join('\n') : 'N/A';
        
        html += `
            <tr>
                <td><strong>${escapeHtml(p.name)}</strong><br><small>${escapeHtml(p.inferenceProfileArn)}</small></td>
                <td><small style="white-space:pre-line">${escapeHtml(modelArnStr)}</small></td>
                <td><span class="status-badge ${p.status.toLowerCase()}">${escapeHtml(p.status)}</span></td>
                <td>${tagsHtml}</td>
                <td class="actions">
                    <button onclick='editTags(${JSON.stringify(p.inferenceProfileArn)}, ${JSON.stringify(p.tags || [])})' class="btn-small">Edit Tags</button>
                    <button onclick='deleteProfile(${JSON.stringify(p.inferenceProfileArn)}, "${escapeHtml(p.name)}")' class="btn-small btn-danger">Delete</button>
                </td>
            </tr>
        `;
    });
    
    html += '</tbody></table></div>';
    
    // 分页控件
    if (totalPages > 1) {
        html += '<div class="pagination">';
        html += `<button class="pagination-btn" onclick="goToMyProfilesPage(1)" ${myProfilesPage===1?'disabled':''}>«</button>`;
        html += `<button class="pagination-btn" onclick="goToMyProfilesPage(${myProfilesPage-1})" ${myProfilesPage===1?'disabled':''}>‹</button>`;
        
        // 显示页码：当前页附近的页码
        let startPage = Math.max(1, myProfilesPage - 2);
        let endPage = Math.min(totalPages, myProfilesPage + 2);
        if (startPage > 1) html += '<span class="pagination-ellipsis">…</span>';
        for (let i = startPage; i <= endPage; i++) {
            html += `<button class="pagination-btn ${i===myProfilesPage?'active':''}" onclick="goToMyProfilesPage(${i})">${i}</button>`;
        }
        if (endPage < totalPages) html += '<span class="pagination-ellipsis">…</span>';
        
        html += `<button class="pagination-btn" onclick="goToMyProfilesPage(${myProfilesPage+1})" ${myProfilesPage===totalPages?'disabled':''}>›</button>`;
        html += `<button class="pagination-btn" onclick="goToMyProfilesPage(${totalPages})" ${myProfilesPage===totalPages?'disabled':''}>»</button>`;
        html += `<span class="pagination-info">${startIdx+1}-${Math.min(startIdx+myProfilesPageSize, sorted.length)} of ${sorted.length}</span>`;
        html += '</div>';
    }
    
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
function openCloudWatchDashboards() {
    const region = document.getElementById('region').value;
    window.open(`https://${region}.console.aws.amazon.com/cloudwatch/home?region=${region}#dashboards`, '_blank');
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
