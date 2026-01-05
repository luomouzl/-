import { saveSettingsDebounced } from "../../../script.js";
import { extension_settings, getContext } from "../../extensions.js";
import { eventSource, event_types } from "../../../script.js";

const extensionName = "auto-retry";
const extensionFolderPath = `scripts/extensions/${extensionName}/`;

let extensionSettings = {
    enabled: true,
    maxRetries: 1,
    retryDelay: 1000 // 延迟1秒后重试
};

// 跟踪重试状态
let retryCount = new Map();

// 加载设置
function loadSettings() {
    if (extension_settings[extensionName]) {
        Object.assign(extensionSettings, extension_settings[extensionName]);
    }
    updateUI();
}

// 保存设置
function saveSettings() {
    extension_settings[extensionName] = extensionSettings;
    saveSettingsDebounced();
}

// 更新UI状态
function updateUI() {
    $('#auto_retry_enabled').prop('checked', extensionSettings.enabled);
    $('#auto_retry_max').val(extensionSettings.maxRetries);
    $('#auto_retry_delay').val(extensionSettings.retryDelay);
}

// 监听生成失败事件
function onGenerationError(eventData) {
    if (!extensionSettings.enabled) {
        return;
    }

    console.log('[Auto Retry] Generation failed, attempting retry...');
    
    const messageId = eventData?.messageId || 'default';
    const currentRetries = retryCount.get(messageId) || 0;

    if (currentRetries < extensionSettings.maxRetries) {
        retryCount.set(messageId, currentRetries + 1);
        
        console.log(`[Auto Retry] Retry attempt ${currentRetries + 1}/${extensionSettings.maxRetries}`);
        
        // 延迟后重试
        setTimeout(() => {
            try {
                // 触发重新生成
                const context = getContext();
                if (eventData?.isRegenerate) {
                    // 重新生成最后一条消息
                    $('#option_regenerate').trigger('click');
                } else {
                    // 重新发送
                    context.generate('auto_retry');
                }
            } catch (error) {
                console.error('[Auto Retry] Retry failed:', error);
                retryCount.delete(messageId);
            }
        }, extensionSettings.retryDelay);
    } else {
        console.log('[Auto Retry] Max retries reached');
        retryCount.delete(messageId);
        toastr.error(`消息发送失败，已重试 ${extensionSettings.maxRetries} 次`, 'Auto Retry');
    }
}

// 监听生成成功事件（清除重试计数）
function onGenerationSuccess(eventData) {
    const messageId = eventData?.messageId || 'default';
    if (retryCount.has(messageId)) {
        console.log('[Auto Retry] Generation succeeded after retry');
        retryCount.delete(messageId);
        toastr.success('消息发送成功', 'Auto Retry');
    }
}

// 创建UI
function createUI() {
    const html = `
        <div class="auto-retry-settings">
            <div class="inline-drawer">
                <div class="inline-drawer-toggle inline-drawer-header">
                    <b>Auto Retry</b>
                    <div class="inline-drawer-icon fa-solid fa-circle-chevron-down down"></div>
                </div>
                <div class="inline-drawer-content">
                    <label class="checkbox_label">
                        <input id="auto_retry_enabled" type="checkbox" />
                        <span>启用自动重试</span>
                    </label>
                    <div class="range-block">
                        <label for="auto_retry_max">最大重试次数</label>
                        <input id="auto_retry_max" type="number" min="1" max="5" value="1" />
                    </div>
                    <div class="range-block">
                        <label for="auto_retry_delay">重试延迟(毫秒)</label>
                        <input id="auto_retry_delay" type="number" min="500" max="10000" step="500" value="1000" />
                    </div>
                    <small class="notes">失败时会自动重试发送消息或重新生成</small>
                </div>
            </div>
        </div>
    `;

    $('#extensions_settings2').append(html);

    // 绑定事件
    $('#auto_retry_enabled').on('change', function() {
        extensionSettings.enabled = $(this).prop('checked');
        saveSettings();
    });

    $('#auto_retry_max').on('change', function() {
        extensionSettings.maxRetries = parseInt($(this).val());
        saveSettings();
    });

    $('#auto_retry_delay').on('change', function() {
        extensionSettings.retryDelay = parseInt($(this).val());
        saveSettings();
    });
}

// 初始化插件
jQuery(async () => {
    console.log('[Auto Retry] Initializing...');
    
    // 创建UI
    createUI();
    
    // 加载设置
    loadSettings();

    // 监听事件
    eventSource.on(event_types.GENERATION_ENDED, onGenerationSuccess);
    eventSource.on(event_types.GENERATION_STOPPED, onGenerationError);
    
    // 也可以监听其他错误事件
    // 使用更底层的方式拦截fetch错误
    const originalGenerate = window.Generate?.onSuccess;
    if (originalGenerate) {
        window.Generate.onError = function(...args) {
            onGenerationError({});
            return originalGenerate.apply(this, args);
        };
    }

    console.log('[Auto Retry] Initialized successfully');
});
