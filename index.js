(function() {
    'use strict';

    const extensionName = "auto-retry";
    
    // 默认设置
    const defaultSettings = {
        enabled: true,
        maxRetries: 1,
        retryDelay: 1000
    };

    let settings = Object.assign({}, defaultSettings);
    let isRetrying = false;
    let retryAttempts = 0;

    // 加载设置
    function loadSettings() {
        const savedSettings = localStorage.getItem(`${extensionName}_settings`);
        if (savedSettings) {
            try {
                settings = Object.assign({}, defaultSettings, JSON.parse(savedSettings));
            } catch (e) {
                console.error('[Auto Retry] Failed to load settings:', e);
            }
        }
        updateUI();
    }

    // 保存设置
    function saveSettings() {
        localStorage.setItem(`${extensionName}_settings`, JSON.stringify(settings));
        console.log('[Auto Retry] Settings saved:', settings);
    }

    // 更新UI
    function updateUI() {
        $('#auto_retry_enabled').prop('checked', settings.enabled);
        $('#auto_retry_max').val(settings.maxRetries);
        $('#auto_retry_delay').val(settings.retryDelay);
    }

    // 拦截发送按钮
    function interceptSendButton() {
        const originalSend = $('#send_but').off('click');
        
        $('#send_but').on('click', function(e) {
            if (!settings.enabled) {
                return;
            }
            
            console.log('[Auto Retry] Send button clicked');
            retryAttempts = 0;
            isRetrying = false;
        });
    }

    // 拦截重新生成按钮
    function interceptRegenerateButton() {
        $(document).on('click', '#option_regenerate', function() {
            if (!settings.enabled) {
                return;
            }
            
            console.log('[Auto Retry] Regenerate button clicked');
            retryAttempts = 0;
            isRetrying = false;
        });
    }

    // 监听AJAX错误
    function monitorAjaxErrors() {
        $(document).ajaxError(function(event, jqxhr, ajaxSettings, thrownError) {
            if (!settings.enabled || isRetrying) {
                return;
            }

            // 检查是否是生成相关的API调用
            if (ajaxSettings.url && (
                ajaxSettings.url.includes('/generate') || 
                ajaxSettings.url.includes('/api/backends')
            )) {
                console.log('[Auto Retry] Generation request failed:', thrownError);
                handleRetry();
            }
        });
    }

    // 处理重试
    function handleRetry() {
        if (retryAttempts >= settings.maxRetries) {
            console.log('[Auto Retry] Max retries reached');
            toastr.error(`请求失败，已重试 ${settings.maxRetries} 次`, 'Auto Retry');
            retryAttempts = 0;
            isRetrying = false;
            return;
        }

        retryAttempts++;
        isRetrying = true;

        console.log(`[Auto Retry] Attempting retry ${retryAttempts}/${settings.maxRetries}`);
        toastr.info(`正在重试 (${retryAttempts}/${settings.maxRetries})...`, 'Auto Retry');

        setTimeout(function() {
            try {
                // 尝试点击发送按钮
                const sendBtn = $('#send_but');
                const regenBtn = $('#option_regenerate');

                if (regenBtn.is(':visible') && !regenBtn.prop('disabled')) {
                    console.log('[Auto Retry] Triggering regenerate');
                    regenBtn.click();
                } else if (!sendBtn.prop('disabled')) {
                    console.log('[Auto Retry] Triggering send');
                    sendBtn.click();
                }

                isRetrying = false;
            } catch (error) {
                console.error('[Auto Retry] Retry failed:', error);
                isRetrying = false;
            }
        }, settings.retryDelay);
    }

    // 创建设置UI
    function createSettingsUI() {
        const html = `
            <div class="auto-retry-settings">
                <div class="inline-drawer">
                    <div class="inline-drawer-toggle inline-drawer-header">
                        <b>Auto Retry (自动重试)</b>
                        <div class="inline-drawer-icon fa-solid fa-circle-chevron-down down"></div>
                    </div>
                    <div class="inline-drawer-content">
                        <label class="checkbox_label">
                            <input id="auto_retry_enabled" type="checkbox" />
                            <span>启用自动重试</span>
                        </label>
                        <br>
                        <label for="auto_retry_max">
                            <small>最大重试次数：</small>
                        </label>
                        <input id="auto_retry_max" class="text_pole" type="number" min="1" max="5" value="1" />
                        <br>
                        <label for="auto_retry_delay">
                            <small>重试延迟(毫秒)：</small>
                        </label>
                        <input id="auto_retry_delay" class="text_pole" type="number" min="500" max="10000" step="500" value="1000" />
                        <br>
                        <small class="notes">当发送或重新生成失败时，会自动重试指定次数</small>
                    </div>
                </div>
            </div>
        `;

        $('#extensions_settings').append(html);

        // 绑定事件
        $('#auto_retry_enabled').on('change', function() {
            settings.enabled = $(this).prop('checked');
            saveSettings();
            console.log('[Auto Retry] Enabled:', settings.enabled);
        });

        $('#auto_retry_max').on('input change', function() {
            settings.maxRetries = parseInt($(this).val()) || 1;
            saveSettings();
        });

        $('#auto_retry_delay').on('input change', function() {
            settings.retryDelay = parseInt($(this).val()) || 1000;
            saveSettings();
        });
    }

    // 初始化
    jQuery(function() {
        console.log('[Auto Retry] Plugin loading...');
        
        // 等待一下确保DOM加载完成
        setTimeout(function() {
            try {
                createSettingsUI();
                loadSettings();
                interceptSendButton();
                interceptRegenerateButton();
                monitorAjaxErrors();
                
                console.log('[Auto Retry] Plugin loaded successfully');
                toastr.success('自动重试插件已加载', 'Auto Retry', { timeOut: 2000 });
            } catch (error) {
                console.error('[Auto Retry] Failed to initialize:', error);
                toastr.error('自动重试插件加载失败，请查看控制台', 'Auto Retry');
            }
        }, 1000);
    });

})();
