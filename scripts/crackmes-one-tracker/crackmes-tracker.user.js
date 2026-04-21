// ==UserScript==
// @name         crackmes.one 完成进度追踪
// @namespace    https://github.com/BetaCat76/monkeytools
// @version      1.0.0
// @description  追踪哪些 crackme 已经完成，在搜索列表和详情页高亮显示完成状态
// @author       BetaCat76
// @match        https://crackmes.one/search*
// @match        https://crackmes.one/crackme/*
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_setClipboard
// @license      MIT
// ==/UserScript==

(function () {
    'use strict';

    // ─── 存储键名 ──────────────────────────────────────────────────────────────
    const STORAGE_KEY = 'crackmes_completed';

    // ─── 读取 / 写入已完成列表 ─────────────────────────────────────────────────

    /** @returns {string[]} 已完成的 crackme ID 数组 */
    function loadCompleted() {
        try {
            const raw = GM_getValue(STORAGE_KEY, '[]');
            const parsed = JSON.parse(raw);
            return Array.isArray(parsed) ? parsed : [];
        } catch (_) {
            return [];
        }
    }

    /** @param {string[]} list */
    function saveCompleted(list) {
        GM_setValue(STORAGE_KEY, JSON.stringify(list));
    }

    /** @param {string} id */
    function markCompleted(id) {
        const list = loadCompleted();
        if (!list.includes(id)) {
            list.push(id);
            saveCompleted(list);
        }
    }

    /** @param {string} id */
    function unmarkCompleted(id) {
        const list = loadCompleted().filter(x => x !== id);
        saveCompleted(list);
    }

    /** @param {string} id @returns {boolean} */
    function isCompleted(id) {
        return loadCompleted().includes(id);
    }

    // ─── 从 URL 路径中提取 crackme ID ──────────────────────────────────────────

    /**
     * 从形如 /crackme/69e588308afd9d6c48b48962 的路径中提取 ID。
     * crackmes.one 使用 MongoDB ObjectId（24 位十六进制字符串）作为 ID。
     * @param {string} [pathname]
     * @returns {string|null}
     */
    function extractIdFromPath(pathname) {
        pathname = pathname || window.location.pathname;
        const m = pathname.match(/\/crackme\/([0-9a-f]{24})/i);
        return m ? m[1].toLowerCase() : null;
    }

    // ─── 通用样式 ──────────────────────────────────────────────────────────────

    function injectStyles() {
        const style = document.createElement('style');
        style.textContent = `
            .cm-done-badge {
                display: inline-flex;
                align-items: center;
                justify-content: center;
                width: 20px;
                height: 20px;
                border-radius: 50%;
                background-color: #28a745;
                color: #fff;
                font-size: 13px;
                font-weight: bold;
                margin-left: 6px;
                vertical-align: middle;
                flex-shrink: 0;
            }
            .cm-done-row {
                background-color: rgba(40, 167, 69, 0.08) !important;
            }
            /* 详情页操作面板 */
            #cm-tracker-panel {
                position: fixed;
                top: 70px;
                right: 16px;
                z-index: 9999;
                background: #fff;
                border: 1px solid #ccc;
                border-radius: 8px;
                padding: 12px 16px;
                box-shadow: 0 4px 12px rgba(0,0,0,0.15);
                min-width: 200px;
                font-family: sans-serif;
                font-size: 14px;
            }
            #cm-tracker-panel h4 {
                margin: 0 0 10px;
                font-size: 14px;
                color: #333;
            }
            #cm-tracker-panel button {
                display: block;
                width: 100%;
                margin-bottom: 6px;
                padding: 6px 10px;
                border: none;
                border-radius: 4px;
                cursor: pointer;
                font-size: 13px;
            }
            #cm-btn-toggle-done {
                background-color: #28a745;
                color: #fff;
            }
            #cm-btn-toggle-done.is-done {
                background-color: #dc3545;
            }
            #cm-btn-export {
                background-color: #6c757d;
                color: #fff;
            }
            #cm-btn-import {
                background-color: #17a2b8;
                color: #fff;
            }
            #cm-tracker-status {
                font-size: 12px;
                color: #555;
                margin-top: 4px;
            }
        `;
        document.head.appendChild(style);
    }

    // ─── 详情页逻辑 ────────────────────────────────────────────────────────────

    function runDetailPage() {
        const id = extractIdFromPath();
        if (!id) return;

        injectStyles();

        const panel = document.createElement('div');
        panel.id = 'cm-tracker-panel';

        const title = document.createElement('h4');
        title.textContent = '📋 完成进度追踪';

        const btnToggle = document.createElement('button');
        btnToggle.id = 'cm-btn-toggle-done';

        const btnExport = document.createElement('button');
        btnExport.id = 'cm-btn-export';
        btnExport.textContent = '📤 导出已完成列表';

        const btnImport = document.createElement('button');
        btnImport.id = 'cm-btn-import';
        btnImport.textContent = '📥 导入已完成列表';

        const statusEl = document.createElement('div');
        statusEl.id = 'cm-tracker-status';

        /** 根据当前状态刷新按钮文字和样式 */
        function refresh() {
            if (isCompleted(id)) {
                btnToggle.textContent = '✘ 取消完成';
                btnToggle.classList.add('is-done');
            } else {
                btnToggle.textContent = '✔ 标记为已完成';
                btnToggle.classList.remove('is-done');
            }
        }

        btnToggle.addEventListener('click', () => {
            if (isCompleted(id)) {
                unmarkCompleted(id);
                statusEl.textContent = '已从完成列表中移除';
            } else {
                markCompleted(id);
                statusEl.textContent = '已标记为完成！';
            }
            refresh();
        });

        btnExport.addEventListener('click', () => {
            const json = JSON.stringify(loadCompleted(), null, 2);
            GM_setClipboard(json, 'text');
            statusEl.textContent = `已复制 ${loadCompleted().length} 条记录到剪贴板`;
        });

        btnImport.addEventListener('click', () => {
            const input = prompt('请粘贴已完成列表（JSON 数组格式）：');
            if (!input) return;
            try {
                const imported = JSON.parse(input);
                if (!Array.isArray(imported)) throw new Error('导入数据必须是 JSON 数组格式，例如 ["id1","id2"]');
                const valid = imported.filter(x => typeof x === 'string' && /^[0-9a-f]{24}$/i.test(x));
                const oldCount = loadCompleted().length;
                const merged = Array.from(new Set([...loadCompleted(), ...valid]));
                saveCompleted(merged);
                statusEl.textContent = `导入成功，共 ${merged.length} 条（新增 ${merged.length - oldCount} 条）`;
                refresh();
            } catch (e) {
                statusEl.textContent = '导入失败：' + e.message;
            }
        });

        panel.appendChild(title);
        panel.appendChild(btnToggle);
        panel.appendChild(btnExport);
        panel.appendChild(btnImport);
        panel.appendChild(statusEl);
        document.body.appendChild(panel);

        refresh();
    }

    // ─── 搜索页逻辑 ────────────────────────────────────────────────────────────

    /**
     * 遍历页面中所有指向 /crackme/:id 的链接，
     * 为已完成的条目添加徽章并高亮所在行。
     * 跳过已经被注解过的链接，避免重复插入。
     */
    function annotateSearchResults() {
        const links = document.querySelectorAll('a[href*="/crackme/"]');

        links.forEach(link => {
            const id = extractIdFromPath(link.getAttribute('href') || '');
            if (!id || !isCompleted(id)) return;

            // 避免重复插入徽章
            if (link.nextElementSibling && link.nextElementSibling.classList.contains('cm-done-badge')) return;

            // 在链接后追加徽章
            const badge = document.createElement('span');
            badge.className = 'cm-done-badge';
            badge.textContent = '✔';
            badge.title = '已完成';
            link.insertAdjacentElement('afterend', badge);

            // 高亮所在行（<tr> 祖先）
            const row = link.closest('tr');
            if (row) row.classList.add('cm-done-row');
        });
    }

    function runSearchPage() {
        injectStyles();

        // 立即处理当前内容
        annotateSearchResults();

        // 搜索页面可能通过 AJAX / 分页动态加载内容，使用 MutationObserver 监听变化。
        // 防抖处理，避免短时间内大量 DOM 变更触发过多调用。
        let debounceTimer = null;
        const observer = new MutationObserver(() => {
            clearTimeout(debounceTimer);
            debounceTimer = setTimeout(annotateSearchResults, 200);
        });
        observer.observe(document.body, { childList: true, subtree: true });
    }

    // ─── 入口 ──────────────────────────────────────────────────────────────────

    const pathname = window.location.pathname;

    if (/^\/crackme\/[0-9a-f]{24}/i.test(pathname)) {
        // 详情页
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', runDetailPage);
        } else {
            runDetailPage();
        }
    } else if (pathname.startsWith('/search')) {
        // 搜索页
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', runSearchPage);
        } else {
            runSearchPage();
        }
    }
})();
