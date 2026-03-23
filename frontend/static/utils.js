// ============================================
// Utils - Common utility functions
// ============================================

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

