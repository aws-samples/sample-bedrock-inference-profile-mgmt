// ============================================
// App - Main application entry point
// ============================================

let allProfiles = {};
let allProfilesRegion = '';
let selectedProfiles = new Set();
let selectedProfilesData = new Map();
let filters = {
    providers: new Set(),
    tags: null,
    scope: null,
    modelId: '',
    excludeDataZone: true,
    excludeInferenceOnly: true
};


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
    
    // 切换到Create视图时更新选中列表，并应用配置
    if (view === 'create') {
        applyCreateConfig();
        updateSelectedProfilesList();
        updateSelectionUI();
    }
    // 切换到My Profiles时加载数据
    if (view === 'myprofiles') {
        loadMyProfiles();
    }
    // 切换到MAP Dashboard时加载数据
    if (view === 'mapv2') {
        initMapv2DatePicker();
        loadMapProjectsV2();
        if (!cachedMapV2Metrics) {
            loadMapDashboardV2();
        }
    }
}

// 创建配置（由弹窗设置）
let createConfig = { mapProjectId: '', namingRule: 'date', namingTemplate: '{cleanModelName}-{YYYYMMDD}' };

// 跳转到 Create 页面（弹出配置弹窗）
function goToCreateView() {
    if (selectedProfiles.size === 0) {
        showToast('Please select at least one profile', 'warning');
        return;
    }
    showCreateConfigDialog();
}

function showCreateConfigDialog() {
    const dialog = document.createElement('div');
    dialog.className = 'custom-dialog-overlay';
    safeSetHTML(dialog, `
        <div class="custom-dialog" style="max-width: 560px;">
            <div class="dialog-header"><h3>Create Profile Settings</h3></div>
            <div class="dialog-body" style="padding: 24px 28px;">
                <div style="margin-bottom: 24px;">
                    <label style="font-weight:600; display:block; margin-bottom:8px; font-size:14px;">MAP Project ID</label>
                    <input type="text" id="cfgMapProjectId" placeholder="PE-112233AABBCC" 
                           style="width:100%; padding:10px 12px; border:1px solid #d1d5db; border-radius:6px; font-size:14px;"
                           value="${escapeHtml(createConfig.mapProjectId)}">
                    <div style="color:#888; font-size:12px; margin-top:6px;">Enter project ID (PE- prefix will be removed automatically)</div>
                </div>
                <div>
                    <label style="font-weight:600; display:block; margin-bottom:10px; font-size:14px;">Profile Naming Rule</label>
                    <div style="display:flex; flex-direction:column; gap:12px;" id="cfgNamingRules">
                        <label style="display:flex; align-items:center; gap:8px; cursor:pointer;">
                            <input type="radio" name="namingRule" value="raw" ${createConfig.namingRule === 'raw' ? 'checked' : ''}>
                            <span>Original name — <code>{ModelName}</code></span>
                        </label>
                        <label style="display:flex; align-items:center; gap:8px; cursor:pointer;">
                            <input type="radio" name="namingRule" value="date" ${createConfig.namingRule === 'date' ? 'checked' : ''}>
                            <span>With date — <code>{ModelName}-{YYYYMMDD}</code></span>
                        </label>
                        <label style="display:flex; align-items:center; gap:8px; cursor:pointer;">
                            <input type="radio" name="namingRule" value="custom" ${createConfig.namingRule === 'custom' ? 'checked' : ''}>
                            <span>Custom template:</span>
                        </label>
                        <input type="text" id="cfgCustomTemplate" placeholder="{ModelName}-{YYYYMMDD}" 
                               style="padding:10px 12px; border:1px solid #d1d5db; border-radius:6px; font-size:14px; margin-left:28px; width:calc(100% - 28px);"
                               value="${escapeHtml(createConfig.namingRule === 'custom' ? createConfig.namingTemplate.replace(/\{cleanModelName\}/g, '{ModelName}') : '{ModelName}-{YYYYMMDD}')}">
                        <div style="color:#888; font-size:12px; margin-left:28px; margin-top:8px; background:#f7f8fa; border-radius:6px; padding:10px 14px; line-height:2;">
                            Use <code>{ModelName}</code> and <code>{YYYYMMDD}</code> as placeholders.<br><br>
                            <strong>Examples:</strong><br>
                            <code>bizName-{ModelName}-{YYYYMMDD}</code> → hello-claude-opus-4.6-20260401<br>
                            <code>{ModelName}-{YYYYMMDD}-abc</code> → claude-opus-4.6-20260401-abc<br>
                            <code>{ModelName}-abc123</code> → claude-opus-4.6-abc123
                        </div>
                    </div>
                </div>
            </div>
            <div class="dialog-footer" style="padding: 16px 28px;">
                <button class="btn-secondary" id="cfgCancelBtn">Cancel</button>
                <button class="btn-primary" id="cfgConfirmBtn">Continue</button>
            </div>
        </div>
    `);
    document.body.appendChild(dialog);

    const customInput = dialog.querySelector('#cfgCustomTemplate');
    // 切换 radio 时聚焦自定义输入框
    dialog.querySelectorAll('input[name="namingRule"]').forEach(r => {
        r.addEventListener('change', () => {
            customInput.style.opacity = r.value === 'custom' && r.checked ? '1' : '0.5';
        });
    });
    // 初始状态
    const checkedRule = dialog.querySelector('input[name="namingRule"]:checked');
    customInput.style.opacity = checkedRule && checkedRule.value === 'custom' ? '1' : '0.5';
    // 点击自定义输入框自动选中 custom radio
    customInput.addEventListener('focus', () => {
        dialog.querySelector('input[name="namingRule"][value="custom"]').checked = true;
        customInput.style.opacity = '1';
    });

    dialog.querySelector('#cfgCancelBtn').onclick = () => dialog.remove();
    dialog.querySelector('#cfgConfirmBtn').onclick = () => {
        // 读取 MAP 项目号，去除 PE- 前缀
        let mapId = dialog.querySelector('#cfgMapProjectId').value.trim();
        mapId = mapId.replace(/^PE-/i, '');

        // 读取命名规则
        const rule = dialog.querySelector('input[name="namingRule"]:checked').value;
        let template;
        if (rule === 'raw') template = '{cleanModelName}';
        else if (rule === 'date') template = '{cleanModelName}-{YYYYMMDD}';
        else template = (customInput.value.trim() || '{ModelName}-{YYYYMMDD}').replace(/\{ModelName\}/g, '{cleanModelName}');

        createConfig = { mapProjectId: mapId, namingRule: rule, namingTemplate: template };
        dialog.remove();
        switchToView('create');
    };
}

// 应用弹窗配置到 Create 页面
function applyCreateConfig() {
    // 填充 map-migrated tag value
    if (createConfig.mapProjectId) {
        const tagRows = document.querySelectorAll('#createTagInputs .tag-input-row');
        tagRows.forEach(row => {
            const keyInput = row.querySelector('.tag-key');
            const valInput = row.querySelector('.tag-value');
            if (keyInput && keyInput.value.trim() === 'map-migrated') {
                valInput.value = 'mig' + createConfig.mapProjectId;
                valInput.style.border = '';
                valInput.style.background = '';
            }
        });
    }
}

// 根据配置生成 profile 名称
function generateProfileName(cleanModelName) {
    const today = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    return createConfig.namingTemplate
        .replace(/\{cleanModelName\}/g, cleanModelName)
        .replace(/\{YYYYMMDD\}/g, today);
}

// 加载数据
async function loadData() {
    const profile = document.getElementById('awsProfile').value;
    const region = document.getElementById('region').value;
    
    clearProfileSelections();
    
    // Check current view
    const activeView = document.querySelector('.view.active');
    const viewId = activeView ? activeView.id : 'profilesView';
    
    if (viewId === 'mapv2View') {
        // MAP Dashboard V2 - clear cache and reload
        cachedMapV2Metrics = null;
        cachedMapV2Profiles = null;
        loadMapDashboardV2();
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
            allProfilesRegion = region;
            
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
            if (err.message === 'Failed to fetch') {
                p2.textContent = 'Unable to connect to the server. Please check if the application is running and try again.';
            } else {
                const strong = document.createElement('strong');
                strong.textContent = region;
                p2.append('Bedrock may not be available in ', strong, '.', document.createElement('br'), 'Please select a supported region (us-east-1, us-west-2, etc.)');
            }
            
            errorDiv.append(h3, p1, p2);
            container.appendChild(errorDiv);
            console.error('Failed to load profiles:', err);
        }
    }
}

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
