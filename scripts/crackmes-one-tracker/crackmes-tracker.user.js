// ==UserScript==
// @name         crackmes.one 完成进度追踪
// @namespace    https://github.com/BetaCat76/monkeytools
// @version      2.2.0
// @description  追踪哪些 crackme 已经完成，在搜索列表和详情页高亮显示完成状态，支持收藏功能、搁置功能和用户页展示收藏列表
// @author       BetaCat76
// @match        https://crackmes.one/search*
// @match        https://crackmes.one/crackme/*
// @match        https://crackmes.one/user/*
// @updateURL    https://raw.githubusercontent.com/BetaCat76/monkeytools/main/scripts/crackmes-one-tracker/crackmes-tracker.user.js
// @downloadURL  https://raw.githubusercontent.com/BetaCat76/monkeytools/main/scripts/crackmes-one-tracker/crackmes-tracker.user.js
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_setClipboard
// @license      MIT
// ==/UserScript==

(function () {
    'use strict';

    const LOG_PREFIX = '[crackmes-tracker]';

    function dbg(...args) {
        console.log(LOG_PREFIX, ...args);
    }

    dbg('脚本已加载', 'URL:', window.location.href, 'readyState:', document.readyState);

    // ─── 存储键名 ──────────────────────────────────────────────────────────────
    const STORAGE_KEY = 'crackmes_completed';
    const FAVORITES_KEY = 'crackmes_favorites';
    const SEARCH_FILTERS_KEY = 'crackmes_search_filters';
    const SHELVED_KEY = 'crackmes_shelved';

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

    // ─── 读取 / 写入收藏列表 ───────────────────────────────────────────────────

    /**
     * @typedef {{ id: string, name: string, difficulty: string, platform: string, language: string }} CrackmeInfo
     * @returns {{ [id: string]: CrackmeInfo }}
     */
    function loadFavorites() {
        try {
            const raw = GM_getValue(FAVORITES_KEY, '{}');
            const parsed = JSON.parse(raw);
            return (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) ? parsed : {};
        } catch (_) {
            return {};
        }
    }

    /** @param {{ [id: string]: CrackmeInfo }} favs */
    function saveFavorites(favs) {
        GM_setValue(FAVORITES_KEY, JSON.stringify(favs));
    }

    /** @param {CrackmeInfo} info */
    function addFavorite(info) {
        const favs = loadFavorites();
        favs[info.id] = info;
        saveFavorites(favs);
    }

    /** @param {string} id */
    function removeFavorite(id) {
        const favs = loadFavorites();
        delete favs[id];
        saveFavorites(favs);
    }

    /** @param {string} id @returns {boolean} */
    function isFavorited(id) {
        return id in loadFavorites();
    }

    // ─── 读取 / 写入搁置列表 ───────────────────────────────────────────────────

    /** @returns {string[]} 已搁置的 crackme ID 数组 */
    function loadShelved() {
        try {
            const raw = GM_getValue(SHELVED_KEY, '[]');
            const parsed = JSON.parse(raw);
            return Array.isArray(parsed) ? parsed : [];
        } catch (_) {
            return [];
        }
    }

    /** @param {string[]} list */
    function saveShelved(list) {
        GM_setValue(SHELVED_KEY, JSON.stringify(list));
    }

    /** @param {string} id */
    function markShelved(id) {
        const list = loadShelved();
        if (!list.includes(id)) {
            list.push(id);
            saveShelved(list);
        }
    }

    /** @param {string} id */
    function unmarkShelved(id) {
        const list = loadShelved().filter(x => x !== id);
        saveShelved(list);
    }

    /** @param {string} id @returns {boolean} */
    function isShelved(id) {
        return loadShelved().includes(id);
    }

    // ─── 读取 / 写入搜索筛选条件 ───────────────────────────────────────────────

    /**
     * @typedef {{ [key: string]: string | boolean }} SearchFilters
     * @returns {SearchFilters}
     */
    function loadSearchFilters() {
        try {
            const raw = GM_getValue(SEARCH_FILTERS_KEY, '{}');
            const parsed = JSON.parse(raw);
            return (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) ? parsed : {};
        } catch (_) {
            return {};
        }
    }

    /** @param {SearchFilters} filters */
    function saveSearchFilters(filters) {
        GM_setValue(SEARCH_FILTERS_KEY, JSON.stringify(filters));
    }

    // ─── HTML 转义 ─────────────────────────────────────────────────────────────

    /** @param {string} str @returns {string} */
    function escapeHtml(str) {
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
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
        if (document.getElementById('cm-tracker-styles')) return;
        const style = document.createElement('style');
        style.id = 'cm-tracker-styles';
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
            /* 详情页完成按钮 */
            #cm-btn-toggle-done {
                padding: 6px 14px;
                border: none;
                border-radius: 4px;
                cursor: pointer;
                font-size: 14px;
                font-weight: 600;
                background-color: #28a745;
                color: #fff;
                vertical-align: middle;
            }
            #cm-btn-toggle-done.is-done {
                background-color: #6c757d;
            }
            /* 详情页收藏按钮 */
            #cm-btn-toggle-fav {
                padding: 6px 14px;
                border: none;
                border-radius: 4px;
                cursor: pointer;
                font-size: 14px;
                font-weight: 600;
                background-color: #ffc107;
                color: #212529;
                vertical-align: middle;
            }
            #cm-btn-toggle-fav.is-fav {
                background-color: #fd7e14;
                color: #fff;
            }
            /* 详情页搁置按钮 */
            #cm-btn-toggle-shelve {
                padding: 6px 14px;
                border: none;
                border-radius: 4px;
                cursor: pointer;
                font-size: 14px;
                font-weight: 600;
                background-color: #adb5bd;
                color: #212529;
                vertical-align: middle;
            }
            #cm-btn-toggle-shelve.is-shelved {
                background-color: #6c757d;
                color: #fff;
            }
            /* 搁置徽章（搜索列表） */
            .cm-shelved-badge {
                display: inline-flex;
                align-items: center;
                justify-content: center;
                width: 20px;
                height: 20px;
                border-radius: 50%;
                background-color: #6c757d;
                color: #fff;
                font-size: 13px;
                font-weight: bold;
                margin-left: 6px;
                vertical-align: middle;
                flex-shrink: 0;
            }
            .cm-shelved-row {
                background-color: rgba(108, 117, 125, 0.10) !important;
            }
            /* 用户页收藏列表 */
            #cm-favorites-section {
                margin-top: 30px;
                padding: 16px;
                background: #2b2f36;
                border: 1px solid #495057;
                border-radius: 8px;
                color: #e9ecef;
            }
            #cm-favorites-section h4 {
                margin-bottom: 12px;
                font-size: 18px;
                font-weight: 700;
                color: #e9ecef;
            }
            .cm-fav-table {
                width: 100%;
                border-collapse: collapse;
                font-size: 14px;
                color: #e9ecef;
            }
            .cm-fav-table th,
            .cm-fav-table td {
                padding: 8px 10px;
                border: 1px solid #495057;
                text-align: left;
                vertical-align: middle;
            }
            .cm-fav-table thead th {
                background-color: #343a40;
                font-weight: 600;
                color: #e9ecef;
            }
            .cm-fav-table tbody tr:nth-child(even) {
                background-color: #343a40;
            }
            .cm-fav-table tbody tr.cm-done-row {
                background-color: rgba(40, 167, 69, 0.18) !important;
            }
            .cm-fav-table a {
                color: #6ea8fe;
            }
            .cm-fav-status-done {
                color: #5cb85c;
                font-weight: 600;
            }
            .cm-fav-status-pending {
                color: #e06c75;
                font-weight: 600;
            }
            /* 导出/导入浮动面板 */
            #cm-btn-wrapper {
                display: inline-flex;
                align-items: center;
                gap: 8px;
                flex-wrap: nowrap;
            }
            #cm-tracker-panel {
                position: fixed;
                bottom: 16px;
                right: 16px;
                z-index: 9999;
                background: #fff;
                border: 1px solid #ccc;
                border-radius: 8px;
                padding: 10px 14px;
                box-shadow: 0 4px 12px rgba(0,0,0,0.15);
                font-family: sans-serif;
                font-size: 13px;
                display: flex;
                align-items: center;
                gap: 8px;
            }
            #cm-btn-export {
                padding: 5px 10px;
                border: none;
                border-radius: 4px;
                cursor: pointer;
                font-size: 12px;
                background-color: #6c757d;
                color: #fff;
            }
            #cm-btn-import {
                padding: 5px 10px;
                border: none;
                border-radius: 4px;
                cursor: pointer;
                font-size: 12px;
                background-color: #17a2b8;
                color: #fff;
            }
            #cm-tracker-status {
                font-size: 12px;
                color: #555;
            }
        `;
        document.head.appendChild(style);
    }

    /**
     * 如果切换按钮已存在，刷新其文字和样式以反映最新完成状态。
     * @param {string} id
     */
    function refreshExistingToggle(id) {
        const btn = document.getElementById('cm-btn-toggle-done');
        if (!btn) return;
        if (isCompleted(id)) {
            btn.textContent = '✔ 已完成';
            btn.classList.add('is-done');
        } else {
            btn.textContent = '完成';
            btn.classList.remove('is-done');
        }
    }

    /**
     * 如果收藏按钮已存在，刷新其文字和样式以反映最新收藏状态。
     * @param {string} id
     */
    function refreshExistingFavToggle(id) {
        const btn = document.getElementById('cm-btn-toggle-fav');
        if (!btn) return;
        if (isFavorited(id)) {
            btn.textContent = '★ 已收藏';
            btn.classList.add('is-fav');
        } else {
            btn.textContent = '☆ 收藏';
            btn.classList.remove('is-fav');
        }
    }

    /**
     * 如果搁置按钮已存在，刷新其文字和样式以反映最新搁置状态。
     * @param {string} id
     */
    function refreshExistingShelveToggle(id) {
        const btn = document.getElementById('cm-btn-toggle-shelve');
        if (!btn) return;
        if (isShelved(id)) {
            btn.textContent = '⏸ 已搁置';
            btn.classList.add('is-shelved');
        } else {
            btn.textContent = '⏸ 搁置';
            btn.classList.remove('is-shelved');
        }
    }

    // ─── 详情页逻辑 ────────────────────────────────────────────────────────────

    /**
     * 从详情页提取 crackme 的名称、难度、平台、语言等元数据。
     * 依次尝试 table tr、dl/dt/dd、strong/b 标签等多种策略。
     * @returns {{ name: string, difficulty: string, platform: string, language: string }}
     */
    function extractCrackmeMetadata() {
        // ── 提取名称 ──
        let name = '';
        const h1 = document.querySelector('h1');
        if (h1) name = h1.textContent.trim();
        if (!name) name = document.title.split(/[-|]/)[0].trim();

        let difficulty = '', platform = '', language = '';

        // 策略 1：表格行（<tr> 中前后两个 <td>）
        document.querySelectorAll('tr').forEach(row => {
            const tds = row.querySelectorAll('td');
            if (tds.length < 2) return;
            const label = tds[0].textContent.trim().replace(/:$/, '').toLowerCase();
            const value = tds[1].textContent.trim();
            if (/difficulty/i.test(label)) difficulty = difficulty || value;
            else if (/platform/i.test(label)) platform = platform || value;
            else if (/language/i.test(label)) language = language || value;
        });

        // 策略 2：定义列表（<dt> / <dd>）
        if (!difficulty || !platform || !language) {
            document.querySelectorAll('dt').forEach(dt => {
                const label = dt.textContent.trim().replace(/:$/, '').toLowerCase();
                const dd = dt.nextElementSibling;
                if (!dd || dd.tagName !== 'DD') return;
                const value = dd.textContent.trim();
                if (/difficulty/i.test(label)) difficulty = difficulty || value;
                else if (/platform/i.test(label)) platform = platform || value;
                else if (/language/i.test(label)) language = language || value;
            });
        }

        // 策略 3：加粗文本标签（<strong>/<b>）后紧跟文本节点
        if (!difficulty || !platform || !language) {
            document.querySelectorAll('strong, b').forEach(el => {
                const label = el.textContent.trim().replace(/:$/, '').toLowerCase();
                const next = el.nextSibling;
                const value = next ? (next.textContent || next.nodeValue || '').trim() : '';
                if (!value) return;
                if (/difficulty/i.test(label)) difficulty = difficulty || value;
                else if (/platform/i.test(label)) platform = platform || value;
                else if (/language/i.test(label)) language = language || value;
            });
        }

        dbg('extractCrackmeMetadata:', { name, difficulty, platform, language });
        return { name, difficulty, platform, language };
    }

    /**
     * 尝试找到下载按钮。crackmes.one 的下载按钮通常是
     * 含有 "download" 文字或 href 含 /download 的链接/按钮。
     * @returns {Element|null}
     */
    function findDownloadButton() {
        // 优先匹配 href 含 /download 的 <a>
        const byHref = document.querySelector('a[href*="/download"]');
        if (byHref) {
            dbg('findDownloadButton: 通过 href=/download 找到', byHref);
            return byHref;
        }

        // 其次匹配文本含 Download 的按钮或链接
        const candidates = [...document.querySelectorAll('a, button')];
        const byText = candidates.find(el => /download/i.test(el.textContent.trim()));
        if (byText) {
            dbg('findDownloadButton: 通过文本 "Download" 找到', byText);
            return byText;
        }

        dbg('findDownloadButton: 未找到下载按钮，所有 <a> 和 <button>:',
            candidates.map(el => `${el.tagName} href=${el.getAttribute('href')} text="${el.textContent.trim().slice(0, 40)}"`));
        return null;
    }

    /**
     * 在下载按钮旁插入完成/已完成切换按钮和收藏/已收藏切换按钮。
     * 若下载按钮尚未出现，则延迟重试（最多 10 次，间隔 500ms）。
     */
    function insertToggleButton(id, retries) {
        retries = retries === undefined ? 0 : retries;
        dbg(`insertToggleButton: 第 ${retries + 1} 次尝试，id=${id}`);

        if (document.getElementById('cm-btn-toggle-done')) {
            dbg('insertToggleButton: 按钮已存在，跳过');
            return;
        }

        const dlBtn = findDownloadButton();
        if (!dlBtn) {
            if (retries < 10) {
                dbg(`insertToggleButton: 未找到下载按钮，${500}ms 后重试`);
                setTimeout(() => insertToggleButton(id, retries + 1), 500);
            } else {
                dbg('insertToggleButton: 已达最大重试次数，放弃');
            }
            return;
        }

        // ── 完成按钮 ──
        const btnToggle = document.createElement('button');
        btnToggle.id = 'cm-btn-toggle-done';

        function refreshToggle() {
            if (isCompleted(id)) {
                btnToggle.textContent = '✔ 已完成';
                btnToggle.classList.add('is-done');
            } else {
                btnToggle.textContent = '完成';
                btnToggle.classList.remove('is-done');
            }
        }

        btnToggle.addEventListener('click', () => {
            if (isCompleted(id)) {
                unmarkCompleted(id);
                dbg('已取消完成标记, id=', id);
            } else {
                markCompleted(id);
                dbg('已标记为完成, id=', id);
            }
            refreshToggle();
            // 同步更新浮动面板状态文字
            const statusEl = document.getElementById('cm-tracker-status');
            if (statusEl) statusEl.textContent = isCompleted(id) ? '已标记为完成' : '已取消完成';
        });

        // ── 收藏按钮 ──
        const btnFav = document.createElement('button');
        btnFav.id = 'cm-btn-toggle-fav';

        function refreshFavToggle() {
            if (isFavorited(id)) {
                btnFav.textContent = '★ 已收藏';
                btnFav.classList.add('is-fav');
            } else {
                btnFav.textContent = '☆ 收藏';
                btnFav.classList.remove('is-fav');
            }
        }

        btnFav.addEventListener('click', () => {
            if (isFavorited(id)) {
                removeFavorite(id);
                dbg('已取消收藏, id=', id);
            } else {
                const meta = extractCrackmeMetadata();
                addFavorite({ id, ...meta });
                dbg('已添加收藏, id=', id, meta);
            }
            refreshFavToggle();
            const statusEl = document.getElementById('cm-tracker-status');
            if (statusEl) statusEl.textContent = isFavorited(id) ? '已添加收藏' : '已取消收藏';
        });

        // ── 搁置按钮 ──
        const btnShelve = document.createElement('button');
        btnShelve.id = 'cm-btn-toggle-shelve';

        function refreshShelveToggle() {
            if (isShelved(id)) {
                btnShelve.textContent = '⏸ 已搁置';
                btnShelve.classList.add('is-shelved');
            } else {
                btnShelve.textContent = '⏸ 搁置';
                btnShelve.classList.remove('is-shelved');
            }
        }

        btnShelve.addEventListener('click', () => {
            if (isShelved(id)) {
                unmarkShelved(id);
                dbg('已取消搁置, id=', id);
            } else {
                markShelved(id);
                dbg('已标记为搁置, id=', id);
            }
            refreshShelveToggle();
            const statusEl = document.getElementById('cm-tracker-status');
            if (statusEl) statusEl.textContent = isShelved(id) ? '已搁置' : '已取消搁置';
        });

        // 将下载按钮和自定义按钮包裹在同一个 flex 容器中，确保它们在同一行
        const btnWrapper = document.createElement('div');
        btnWrapper.id = 'cm-btn-wrapper';
        dlBtn.parentNode.insertBefore(btnWrapper, dlBtn);
        btnWrapper.appendChild(dlBtn);
        btnWrapper.appendChild(btnToggle);
        btnWrapper.appendChild(btnFav);
        btnWrapper.appendChild(btnShelve);

        refreshToggle();
        refreshFavToggle();
        refreshShelveToggle();
        dbg('insertToggleButton: 完成/收藏/搁置按钮已与下载按钮一同放入 flex 容器');
    }

    function runDetailPage() {
        const id = extractIdFromPath();
        dbg('runDetailPage 开始, pathname=', window.location.pathname, 'id=', id);

        if (!id) {
            dbg('runDetailPage: 无法提取 id，退出');
            return;
        }

        injectStyles();
        insertToggleButton(id);

        // ── 底部浮动面板（导出 / 导入） ──
        const panel = document.createElement('div');
        panel.id = 'cm-tracker-panel';

        const btnExport = document.createElement('button');
        btnExport.id = 'cm-btn-export';
        btnExport.textContent = '📤 导出';

        const btnImport = document.createElement('button');
        btnImport.id = 'cm-btn-import';
        btnImport.textContent = '📥 导入';

        const statusEl = document.createElement('span');
        statusEl.id = 'cm-tracker-status';

        btnExport.addEventListener('click', () => {
            const json = JSON.stringify(loadCompleted(), null, 2);
            GM_setClipboard(json, 'text');
            statusEl.textContent = `已复制 ${loadCompleted().length} 条到剪贴板`;
            dbg('导出已完成列表', loadCompleted());
        });

        btnImport.addEventListener('click', () => {
            const input = prompt('请粘贴已完成列表（JSON 数组格式）：');
            if (!input) return;
            try {
                const imported = JSON.parse(input);
                if (!Array.isArray(imported)) throw new Error('必须是 JSON 数组');
                const valid = imported.filter(x => typeof x === 'string' && /^[0-9a-f]{24}$/i.test(x));
                const oldCount = loadCompleted().length;
                const merged = Array.from(new Set([...loadCompleted(), ...valid]));
                saveCompleted(merged);
                statusEl.textContent = `导入成功，共 ${merged.length} 条（新增 ${merged.length - oldCount} 条）`;
                dbg('导入完成', merged);
                refreshExistingToggle(id);
                refreshExistingFavToggle(id);
                refreshExistingShelveToggle(id);
            } catch (e) {
                statusEl.textContent = '导入失败：' + e.message;
                dbg('导入失败', e);
            }
        });

        panel.appendChild(btnExport);
        panel.appendChild(btnImport);
        panel.appendChild(statusEl);
        document.body.appendChild(panel);

        dbg('runDetailPage 完成，已完成列表:', loadCompleted());
    }

    // ─── 搜索页逻辑 ────────────────────────────────────────────────────────────

    /**
     * 遍历页面中所有指向 /crackme/:id 的链接，
     * 为已完成的条目添加徽章并高亮所在行。
     * 跳过已经被注解过的链接，避免重复插入。
     */
    function annotateSearchResults() {
        const links = document.querySelectorAll('a[href*="/crackme/"]');
        dbg(`annotateSearchResults: 找到 ${links.length} 个 crackme 链接`);

        let annotated = 0;
        links.forEach(link => {
            const id = extractIdFromPath(link.getAttribute('href') || '');
            if (!id) return;

            const alreadyDone = link.nextElementSibling && link.nextElementSibling.classList.contains('cm-done-badge');
            const alreadyShelved = link.nextElementSibling && link.nextElementSibling.classList.contains('cm-shelved-badge');

            if (isCompleted(id) && !alreadyDone) {
                // 避免重复插入已完成徽章
                const badge = document.createElement('span');
                badge.className = 'cm-done-badge';
                badge.textContent = '✔';
                badge.title = '已完成';
                link.insertAdjacentElement('afterend', badge);

                const row = link.closest('tr');
                if (row) row.classList.add('cm-done-row');

                annotated++;
            } else if (isShelved(id) && !alreadyShelved && !alreadyDone) {
                // 仅在未显示已完成徽章时显示搁置徽章，避免重复插入
                const badge = document.createElement('span');
                badge.className = 'cm-shelved-badge';
                badge.textContent = '⏸';
                badge.title = '已搁置';
                link.insertAdjacentElement('afterend', badge);

                const row = link.closest('tr');
                if (row) {
                    row.classList.add('cm-shelved-row');
                }

                annotated++;
            }
        });

        dbg(`annotateSearchResults: 标注了 ${annotated} 个条目`);
    }

    function runSearchPage() {
        dbg('runSearchPage 开始, URL=', window.location.href);
        dbg('已完成列表:', loadCompleted());

        injectStyles();

        // ── 搜索筛选条件持久化 ──────────────────────────────────────────────────

        /**
         * 收集表单中所有命名字段的当前值。
         * @param {HTMLFormElement} form
         * @returns {SearchFilters}
         */
        function collectFormFilters(form) {
            const filters = {};
            form.querySelectorAll('input, select, textarea').forEach(el => {
                if (el.type === 'hidden') return;
                const key = el.name || el.id;
                if (!key) return;
                if (el.type === 'checkbox' || el.type === 'radio') {
                    filters[key] = el.checked;
                } else {
                    filters[key] = el.value;
                }
            });
            return filters;
        }

        /**
         * 将保存的筛选条件回填到表单字段中。
         * @param {HTMLFormElement} form
         * @param {SearchFilters} filters
         */
        function restoreFormFilters(form, filters) {
            if (!filters || Object.keys(filters).length === 0) return;
            form.querySelectorAll('input, select, textarea').forEach(el => {
                if (el.type === 'hidden') return;
                const key = el.name || el.id;
                if (!key || !(key in filters)) return;
                if (el.type === 'checkbox' || el.type === 'radio') {
                    el.checked = !!filters[key];
                } else {
                    el.value = String(filters[key]);
                }
            });
            dbg('搜索筛选条件已恢复:', filters);
        }

        /**
         * 尝试找到搜索表单，最多重试 retries 次（每次间隔 300ms）。
         * 找到后绑定保存和恢复逻辑。
         * @param {number} [retries]
         */
        function setupFilterPersistence(retries) {
            retries = retries === undefined ? 0 : retries;
            const form = document.querySelector('form');
            if (!form) {
                if (retries < 10) {
                    setTimeout(() => setupFilterPersistence(retries + 1), 300);
                } else {
                    dbg('setupFilterPersistence: 未找到表单，放弃');
                }
                return;
            }

            // 仅在无查询参数的新搜索页（用户直接导航到 /search）时恢复上次条件
            if (!window.location.search) {
                restoreFormFilters(form, loadSearchFilters());
            }

            // 表单提交时保存筛选条件
            form.addEventListener('submit', () => {
                const filters = collectFormFilters(form);
                saveSearchFilters(filters);
                dbg('搜索筛选条件已保存 (表单提交):', filters);
            });

            // 同时监听搜索按钮点击（覆盖通过 JS 触发提交的情况）
            const submitBtn = form.querySelector('[type="submit"], button:not([type="button"])');
            if (submitBtn) {
                submitBtn.addEventListener('click', () => {
                    const filters = collectFormFilters(form);
                    saveSearchFilters(filters);
                    dbg('搜索筛选条件已保存 (按钮点击):', filters);
                });
            }

            dbg('setupFilterPersistence: 筛选条件持久化已设置');
        }

        setupFilterPersistence();

        // 立即处理当前内容
        annotateSearchResults();

        // 搜索页面可能通过 AJAX / 分页动态加载内容，使用 MutationObserver 监听变化。
        // 防抖处理，避免短时间内大量 DOM 变更触发过多调用。
        let debounceTimer = null;
        const observer = new MutationObserver((mutations) => {
            dbg(`MutationObserver 触发，变更数: ${mutations.length}`);
            clearTimeout(debounceTimer);
            debounceTimer = setTimeout(annotateSearchResults, 200);
        });
        observer.observe(document.body, { childList: true, subtree: true });
        dbg('runSearchPage: MutationObserver 已启动');
    }

    // ─── 用户页逻辑 ────────────────────────────────────────────────────────────

    /**
     * 在用户主页（/user/:username）底部注入收藏列表。
     * 未完成的条目排在前面，点击名称可跳转到详情页。
     */
    function runUserPage() {
        dbg('runUserPage 开始, URL=', window.location.href);

        const favs = loadFavorites();
        const favList = Object.values(favs);
        dbg('收藏列表:', favList);

        if (favList.length === 0) {
            dbg('runUserPage: 收藏列表为空，不插入面板');
            return;
        }

        injectStyles();

        // 未完成排前面，已完成排后面；同状态内保持原顺序
        favList.sort((a, b) => {
            const aDone = isCompleted(a.id);
            const bDone = isCompleted(b.id);
            if (aDone === bDone) return 0;
            return aDone ? 1 : -1;
        });

        const section = document.createElement('div');
        section.id = 'cm-favorites-section';

        const heading = document.createElement('h4');
        heading.textContent = '⭐ 我的收藏';
        section.appendChild(heading);

        const table = document.createElement('table');
        table.className = 'cm-fav-table';

        const thead = document.createElement('thead');
        thead.innerHTML = `<tr>
            <th>名称</th>
            <th>难度</th>
            <th>平台</th>
            <th>语言</th>
            <th>状态</th>
        </tr>`;
        table.appendChild(thead);

        const tbody = document.createElement('tbody');
        favList.forEach(fav => {
            const done = isCompleted(fav.id);
            const tr = document.createElement('tr');
            if (done) tr.classList.add('cm-done-row');

            const nameTd = document.createElement('td');
            const nameLink = document.createElement('a');
            nameLink.href = `/crackme/${fav.id}`;
            nameLink.textContent = fav.name || fav.id;
            nameTd.appendChild(nameLink);

            const diffTd = document.createElement('td');
            diffTd.textContent = fav.difficulty || '-';

            const platTd = document.createElement('td');
            platTd.textContent = fav.platform || '-';

            const langTd = document.createElement('td');
            langTd.textContent = fav.language || '-';

            const statusTd = document.createElement('td');
            const statusSpan = document.createElement('span');
            if (done) {
                statusSpan.className = 'cm-fav-status-done';
                statusSpan.textContent = '✔ 已完成';
            } else {
                statusSpan.className = 'cm-fav-status-pending';
                statusSpan.textContent = '未完成';
            }
            statusTd.appendChild(statusSpan);

            tr.appendChild(nameTd);
            tr.appendChild(diffTd);
            tr.appendChild(platTd);
            tr.appendChild(langTd);
            tr.appendChild(statusTd);
            tbody.appendChild(tr);
        });
        table.appendChild(tbody);
        section.appendChild(table);

        // 尝试插入到主内容区域末尾
        const mainContent = document.querySelector('main, .container, #content, .content, [role="main"]');
        if (mainContent) {
            mainContent.appendChild(section);
        } else {
            document.body.appendChild(section);
        }

        dbg('runUserPage: 收藏列表面板已注入，共', favList.length, '条');
    }

    // ─── 入口 ──────────────────────────────────────────────────────────────────

    const pathname = window.location.pathname;
    dbg('入口, pathname=', pathname);

    if (/^\/crackme\/[0-9a-f]{24}/i.test(pathname)) {
        dbg('匹配到详情页');
        // 详情页
        if (document.readyState === 'loading') {
            dbg('DOM 尚未加载完，等待 DOMContentLoaded');
            document.addEventListener('DOMContentLoaded', runDetailPage);
        } else {
            runDetailPage();
        }
    } else if (pathname.startsWith('/search')) {
        dbg('匹配到搜索页');
        // 搜索页
        if (document.readyState === 'loading') {
            dbg('DOM 尚未加载完，等待 DOMContentLoaded');
            document.addEventListener('DOMContentLoaded', runSearchPage);
        } else {
            runSearchPage();
        }
    } else if (pathname.startsWith('/user/')) {
        dbg('匹配到用户页');
        // 用户页
        if (document.readyState === 'loading') {
            dbg('DOM 尚未加载完，等待 DOMContentLoaded');
            document.addEventListener('DOMContentLoaded', runUserPage);
        } else {
            runUserPage();
        }
    } else {
        dbg('当前页面不匹配任何规则，pathname=', pathname);
    }
})();
