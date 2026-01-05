
(function() {
    'use strict';

    const extensionName = "auto-retry";
    
    let settings = {
        enabled: true,
        maxRetries: 1,
        retryDelay: 1000
    };

    let retryCount = 0;
    let lastAction = null; // 'send' or 'regenerate'

    // 加载设置
    function loadSettings() {
        const saved = localStorage.getItem(`${extensionName}_settings`);
        if (saved) {
            try {
                settings = JSON.parse(saved);
            } catch (e) {
                console.error('[Auto Retry] Load error:', e);
            }
        }
        updateUI();
    }

    // 保存设置
    function saveSettings() {
        localStorage.setItem(`${extensionName}_settings`, JSON.stringify(settings));
    }

    // 更新UI
    function updateUI() {
        $('#auto_retry_enabled').prop('checked', settings.enabled);
        $('#auto_retry_max').val(settings.maxRetries);
        $('#auto_retry_delay').val(settings.retryDelay);
    }

    // 记录用户操作
    function trackUserAction() {
        // 监听发送按钮
        $(document).on('click', '#send_but', function() {
            lastAction = 'send';
            retryCount = 0;
            console.log('[Auto Retry] User clicked send');
        });

        // 监听重新生成按钮
        $(document).on('click', '#option_regenerate', function() {
            lastAction = 'regenerate';
            retryCount = 0;
            console.log('[Auto Retry] User clicked regenerate');
        });
    }

    // 监听网络错误
    function setupErrorMonitoring() {
        // 监听所有AJAX错误
        $(document).ajaxError(function(event, jqXHR, ajaxSettings, thrownError) {
            if (!settings.enabled) return;
            
            // 只处理生成相关的请求
            const url = ajaxSettings.url || '';
            if (!url.includes('/generate') && !url.includes('/api/')) {
                return;
            }

            console.log('[Auto Retry] Request failed:', url, thrownError);
            
            // 检查是否应该重试
            if (lastAction && retryCount < settings.maxRetries) {
                retryCount++;
                console.log(`[Auto Retry] Retrying ${retryCount}/${settings.maxRetries}...`);
                
                toastr.info(`正在重试 ${retryCount}/${settings.maxRetries}...`, 'Auto Retry');
                
                setTimeout(function() {
                    performRetry();
                }, settings.retryDelay);
            } else if (retryCount >= settings.maxRetries) {
                console.log('[Auto Retry] Max retries reached');
                toastr.error(`已重试 ${settings.maxRetries} 次仍失败`, 'Auto Retry');
                retryCount = 0;
                lastAction = null;
            }
        });

        // 监听AJAX成功（重置状态）
        $(document).ajaxSuccess(function(event, jqXHR, ajaxSettings) {
            const url = ajaxSettings.url || '';
            if (url.includes('/generate') || url.includes('/api/')) {
                if (retryCount > 0) {
                    console.log('[Auto Retry] Success after retry');
                    toastr.success(`重试成功！`, 'Auto Retry');
                }
                retryCount = 0;
                lastAction = null;
            }
        });
    }

    // 执行重试
    function performRetry() {
        try {
            if (lastAction === 'send') {
                console.log('[Auto Retry] Retrying send...');
                const sendBtn = $('#send_but');
                if (sendBtn.length && !sendBtn.prop('disabled')) {
                    sendBtn.trigger('click');
                }
            } else if (lastAction === 'regenerate') {
                console.log('[Auto Retry] Retrying regenerate...');
                const regenBtn = $('#option_regenerate');
                if (regenBtn.length && regenBtn.is(':visible') && !regenBtn.prop('disabled')) {
                    regenBtn.trigger('click');
                }
            }
        } catch (error) {
            console.error('[Auto Retry] Retry error:', error);
            retryCount = 0;
            lastAction = null;
        }
    }

    // 创建UI
    function createUI() {
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
                        <br><br>
                        <label for="auto_retry_max">
                            <small>最大重试次数：</small>
                        </label>
                        <input id="auto_retry_max" class="text_pole" type="number" min="1" max="5" value="1" style="width: 80px;" />
                        <br><br>
                        <label for="auto_retry_delay">
                            <small>重试延迟(毫秒)：</small>
                        </label>
                        <input id="auto_retry_delay" class="text_pole" type="number" min="500" max="10000" step="500" value="1000" style="width: 80px;" />
                        <br><br>
                        <small class="notes">当发送或重新生成失败时自动重试</small>
                    </div>
                </div>
            </div>
        `;

        $('#extensions_settings').append(html);

        // 绑定事件
        $('#auto_retry_enabled').on('change', function() {
            settings.enabled = $(this).prop('checked');
            saveSettings();
        });

        $('#auto_retry_max').on('change', function() {
            settings.maxRetries = parseInt($(this).val()) || 1;
            saveSettings();
        });

        $('#auto_retry_delay').on('change', function() {
            settings.retryDelay = parseInt($(this).val()) || 1000;
            saveSettings();
        });
    }

    // 初始化
    jQuery(function() {
        console.log('[Auto Retry] Initializing...');
        
        setTimeout(function() {
            try {
                createUI();
                loadSettings();
                trackUserAction();
                setupErrorMonitoring();
                
                console.log('[Auto Retry] Loaded successfully');
            } catch (error) {
                console.error('[Auto Retry] Init error:', error);
            }
        }, 1000);
    });

})();
