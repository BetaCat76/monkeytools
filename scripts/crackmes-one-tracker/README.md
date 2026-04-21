# crackmes.one 完成进度追踪脚本

## 功能

- **搜索页**（`https://crackmes.one/search`）：在每个 crackme 条目旁显示绿色 ✔ 图标，表示已完成
- **详情页**（`https://crackmes.one/crackme/:id`）：在下载按钮旁添加"完成 / ✔ 已完成"切换按钮，点击后状态立即保存并切换显示
- 已完成的 crackme ID 列表通过 Tampermonkey 存储 API（`GM_setValue` / `GM_getValue`）持久化保存
- 支持导出 / 导入已完成 ID 列表（JSON 格式），方便备份与迁移
- 详情页和搜索页均输出调试日志到浏览器控制台（前缀 `[crackmes-tracker]`），可用于排查脚本不生效的原因

## 安装

1. 安装 [Tampermonkey](https://www.tampermonkey.net/) 浏览器扩展（Chrome 用户推荐使用此扩展）
2. 打开 [`crackmes-tracker.user.js`](./crackmes-tracker.user.js) 文件
3. 点击页面右上角的"Raw"按钮，Tampermonkey 会自动弹出安装对话框
4. 点击"安装"即可

## 使用

### 搜索页

访问 `https://crackmes.one/search`，已完成的 crackme 行会显示绿色 **✔** 标记。

### 详情页

访问任意 crackme 详情页：

- 下载按钮旁会出现 **"完成"** 按钮，点击后变为灰色 **"✔ 已完成"**；再次点击则取消完成状态
- 页面右下角有 **"📤 导出"** 和 **"📥 导入"** 按钮，用于备份或迁移已完成列表

## 调试

打开浏览器开发者工具（F12），切换到 **Console** 标签页，脚本会输出以 `[crackmes-tracker]` 开头的调试信息，包括：

- 脚本加载时机和当前 URL
- 是否匹配到详情页/搜索页规则
- 下载按钮查找结果
- 找到的 crackme 链接数量和标注情况

## 数据存储

已完成 ID 保存在 Tampermonkey 的本地存储中，键名为 `crackmes_completed`，格式为 JSON 数组：

```json
["69e588308afd9d6c48b48962", "aabbcc1122334455667788ab"]
```
