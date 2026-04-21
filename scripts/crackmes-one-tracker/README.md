# crackmes.one 完成进度追踪脚本

## 功能

- **搜索页**（`https://crackmes.one/search`）：在每个 crackme 条目旁显示绿色 ✔ 图标，表示已完成
- **详情页**（`https://crackmes.one/crackme/:id`）：显示"标记为已完成 / 取消完成"按钮，点击后状态立即保存
- 已完成的 crackme ID 列表通过 Tampermonkey 存储 API（`GM_setValue` / `GM_getValue`）持久化保存
- 支持导出 / 导入已完成 ID 列表（JSON 格式），方便备份与迁移

## 安装

1. 安装 [Tampermonkey](https://www.tampermonkey.net/) 浏览器扩展
2. 打开 [`crackmes-tracker.user.js`](./crackmes-tracker.user.js) 文件
3. 点击页面右上角的"Raw"按钮，Tampermonkey 会自动弹出安装对话框
4. 点击"安装"即可

## 使用

### 搜索页

访问 `https://crackmes.one/search`，已完成的 crackme 行会显示绿色 **✔** 标记。

### 详情页

访问任意 crackme 详情页，页面顶部会出现一个操作面板：

- **标记为已完成**：将当前 crackme 加入已完成列表
- **取消完成**：从已完成列表中移除
- **导出已完成列表**：将所有已完成 ID 以 JSON 格式复制到剪贴板
- **导入已完成列表**：粘贴 JSON 数据以合并已完成列表

## 数据存储

已完成 ID 保存在 Tampermonkey 的本地存储中，键名为 `crackmes_completed`，格式为 JSON 数组：

```json
["69e588308afd9d6c48b48962", "aabbcc1122334455667788ab"]
```
