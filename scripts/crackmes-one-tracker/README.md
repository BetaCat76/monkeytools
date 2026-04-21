# crackmes.one 完成进度追踪脚本

## 功能

- **搜索页**（`https://crackmes.one/search`）：在每个 crackme 条目旁显示绿色 ✔ 图标，表示已完成
- **详情页**（`https://crackmes.one/crackme/:id`）：
  - 在下载按钮旁添加 **"完成 / ✔ 已完成"** 切换按钮，点击后状态立即保存并切换显示
  - 在完成按钮旁添加 **"☆ 收藏 / ★ 已收藏"** 切换按钮，点击后自动保存 crackme 的名称、难度、平台、语言
- **用户页**（`https://crackmes.one/user/:username`）：在页面底部展示已收藏的 crackme 列表，包含名称（可点击跳转详情页）、难度、平台、语言、完成状态；未完成的条目排在前面
- 已完成的 crackme ID 列表通过 Tampermonkey 存储 API（`GM_setValue` / `GM_getValue`）持久化保存
- 支持导出 / 导入已完成 ID 列表（JSON 格式），方便备份与迁移
- 支持**自动更新**：脚本头部配置了 `@updateURL` / `@downloadURL`，Tampermonkey 可自动检测并提示升级

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
- 完成按钮旁会出现 **"☆ 收藏"** 按钮，点击后变为橙色 **"★ 已收藏"**，同时记录该 crackme 的名称、难度、平台和语言；再次点击则取消收藏
- 页面右下角有 **"📤 导出"** 和 **"📥 导入"** 按钮，用于备份或迁移已完成列表

### 用户页

访问 `https://crackmes.one/user/<用户名>`，页面底部会显示 **"⭐ 我的收藏"** 列表：

| 名称 | 难度 | 平台 | 语言 | 状态 |
|------|------|------|------|------|
| 点击跳转详情页 | — | — | — | 未完成 / ✔ 已完成 |

- 未完成的条目排在前面
- 已完成的行以绿色背景高亮

## 自动更新

脚本安装后，Tampermonkey 会定期检查 GitHub 上的最新版本（通过 Raw 文件链接），有更新时会自动提示。也可在 Tampermonkey 控制台手动点击"检查更新"。

## 调试

打开浏览器开发者工具（F12），切换到 **Console** 标签页，脚本会输出以 `[crackmes-tracker]` 开头的调试信息，包括：

- 脚本加载时机和当前 URL
- 是否匹配到详情页/搜索页/用户页规则
- 下载按钮查找结果
- 找到的 crackme 链接数量和标注情况
- 收藏操作时提取到的元数据

## 数据存储

已完成 ID 保存在 Tampermonkey 的本地存储中，键名为 `crackmes_completed`，格式为 JSON 数组：

```json
["69e588308afd9d6c48b48962", "aabbcc1122334455667788ab"]
```

收藏列表保存在键名 `crackmes_favorites`，格式为以 ID 为键的 JSON 对象：

```json
{
  "69e588308afd9d6c48b48962": {
    "id": "69e588308afd9d6c48b48962",
    "name": "example crackme",
    "difficulty": "4.0",
    "platform": "Windows",
    "language": "C/C++"
  }
}
```
