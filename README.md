# monkeytools

> 针对各种网站的油猴（Tampermonkey / Greasemonkey）脚本集合

## 目录结构

```
monkeytools/
└── scripts/
    └── crackmes-one-tracker/   # crackmes.one 完成进度追踪脚本
```

## 脚本列表

| 脚本 | 目标网站 | 说明 |
|------|----------|------|
| [crackmes-one-tracker](./scripts/crackmes-one-tracker/) | [crackmes.one](https://crackmes.one) | 追踪哪些 crackme 已经完成，在搜索列表和详情页显示完成状态 |

## 安装方式

1. 浏览器安装 [Tampermonkey](https://www.tampermonkey.net/)（Chrome / Firefox / Edge 均支持）
2. 进入对应脚本目录，按照该目录下的 `README.md` 说明安装

## 开发规范

- 每个脚本放在 `scripts/<脚本名>/` 目录下
- 脚本文件命名为 `<脚本名>.user.js`
- 每个脚本目录包含独立的 `README.md`