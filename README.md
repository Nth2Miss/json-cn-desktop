# JSON助手 - json.cn 桌面版 (Tauri 2)

> 基于 https://www.json.cn/jsononline/ 制作的独立桌面应用，离线可用、体积小、支持大文件与文件关联。

![Tauri2](https://img.shields.io/badge/Tauri-2.0-blue) ![Vite](https://img.shields.io/badge/Vite-6.4-646cff) ![License](https://img.shields.io/badge/license-MIT-green)

## 功能对照原站

| 功能 | 状态 | 说明 |
|------|------|------|
| 实时解析/格式化 | ✅ | `jsonlint-mod` 校验，错误定位到行 |
| 语法高亮 | ✅ | 复刻原站配色：key紫 `#92278f` / string绿 `#3ab54a` / number蓝 `#25aae2` |
| 折叠/展开 | ✅ | `Array[N]` / `Object{...}` 逐级折叠 |
| 压缩 | ✅ | 去除空白，保护字符串内空格 (`yxpnbsp` 占位) |
| 转XML | ✅ | `xml2json` / `json2xml` 双向，原站算法移植 |
| 显示行号 | ✅ | 左右同步滚动，`text-nowrap` 横向滚动 |
| 清空/复制/保存 | ✅ | 复制自动展开；保存支持 Tauri 对话框 |
| 保留转义 | ✅ | `\\` -> `\\\\` 预处理 |
| 大数精度 | ✅ | `BigNumber.js` + 8步正则，>2^53 不丢失 |
| 拖拽分隔 | ✅ | 限制 260px ~ 视口-400px |
| 全屏 | ✅ | `F11` / `Esc` |
| 示例 | ✅ | 含超大数、中文、兰亭序 |
| **桌面增强** |||
| 文件打开 | ✅ | `Ctrl+O`，拖拽文件到输入区，Tauri 原生对话框 |
| 文件关联 | ✅ | 双击 `.json` 用本应用打开 (`tauri.conf.json: fileAssociations`) |
| 离线 | ✅ | 零后端 |
| 自动换行切换 | ✅ | 行号模式下自动计算 `cols` |

## 快速开始

### 方式一：浏览器预览 (无需 Rust)

```bash
cd json-cn-desktop
pnpm install
pnpm dev
# 打开 http://localhost:1420
```

已验证：`pnpm build` 可直接生成 `dist/` 静态站点，可用任意静态服务器托管。

### 方式二：Tauri 桌面版 (需 Rust + MSVC)

**前置依赖**

1. Rust `1.77.2+` 已安装（`cargo --version`）
2. Windows 需 **Visual Studio Build Tools 2022** + `Desktop development with C++`
   ```bash
   winget install --id Microsoft.VisualStudio.2022.BuildTools --override "--wait --passive --add Microsoft.VisualStudio.Workload.VCTools --includeRecommended"
   ```
   安装后重启终端，确保 `where link.exe` 有输出。

**运行**

```bash
pnpm tauri dev      # 开发模式，热重载
pnpm tauri build    # 产出安装包 (msi/nsis) 在 src-tauri/target/release/bundle/
```

> 若 `cargo check` 报错 `link.exe not found`，即为 BuildTools 未安装。

## 项目结构

```
json-cn-desktop/
├─ src/
│  ├─ main.js    # 核心：JSONFormat(移植) + BigNumber + xml2json + 8按钮逻辑 + 拖拽
│  ├─ style.css  # 亮/暗色主题，复刻原站卡片阴影
│  └─ index.html # 无 jQuery，纯原生
├─ src-tauri/
│  ├─ Cargo.toml        # tauri 2 + dialog/fs/opener 插件
│  ├─ tauri.conf.json   # 窗口 1280x800, fileAssociations: .json
│  ├─ capabilities/default.json
│  └─ src/main.rs       # 极简后端，仅窗口标题
├─ dist/           # pnpm build 产物
├─ vite.config.js  # Tauri 专用：port 1420  strictPort
└─ package.json
```

## 关键实现剖析

### 大数处理 (原站 `jquery.json.js:177-210`)

```js
// 8 步正则把数字包前缀 jsondotcnprefix，再用 reviver 还原为 BigNumber
let s = origin.replace(/([^\\]")\s*:\s*([-+Ee0-9.]+)/g, '$1: "jsondotcnprefix$2"')
 // ... 共8个replace ...
JSON.parse(s, (k,v)=> v.startsWith('jsondotcnprefix') ? new BigNumber(v.slice(15)) : v)
```

### 格式化渲染

`format()` 递归按 `type: Null/Boolean/Number/String/Array/Object` 生成带 `data-type` 的 HTML，缩进用 `4×&nbsp;`，`%yxpnbspyxp;` 占位后续替换。

### 校验

用 `jsonlint-mod` 的 `parse()` 替代原站 `jsonlint`，错误信息直接显示在底部状态栏与输入区下方。

## 构建产物大小

- 前端 `dist`: ~70KB (gzip ~24KB)
- Tauri 安装包: Windows msi ~6-8MB (Rust 静态链接)

## 常见问题

**Q: 右侧显示 `&nbsp;` 未渲染？**
A: 已做 `replace(/%yxpnbspyxp;/g,"&nbsp;")`，若仍出现请检查 `innerHTML` 赋值顺序。

**Q: 粘贴大 JSON 卡顿？**
A: 原站一次性 `innerHTML` 在 >5MB JSON 会卡，本版可后续改虚拟滚动 + Web Worker。

**Q: 如何打包图标？**
A: 替换 `src-tauri/icons/icon.png` (1024x1024) + `icon.ico`，或用 `pnpm tauri icon icon.png` 自动生成。

## 许可

MIT，基于公开的 json.cn 前端逻辑学习与重写，仅供学习交流。

## 致谢

- 原站 https://www.json.cn/jsononline/ 的 `bignumber.js@9.0.0` 与 `jquery.json.js` 算法
- Tauri 官方 `create-tauri-app` 模板
