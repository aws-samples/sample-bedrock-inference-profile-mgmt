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
        initMapv2DatePicker();
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
