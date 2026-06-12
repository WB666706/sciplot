<div align="center">

<img src="public/favicon.svg" width="72" alt="SciPlot logo" />

# SciPlot

**Publication-quality scientific plotting in your browser**
**浏览器里的论文级科研绘图工具**

[![Build](https://img.shields.io/badge/build-GitHub_Actions-2088FF?logo=githubactions&logoColor=white)](.github/workflows/deploy.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=white)](https://react.dev)
[![ECharts](https://img.shields.io/badge/ECharts-6-AA344D?logo=apacheecharts&logoColor=white)](https://echarts.apache.org)

[English](#english) · [中文](#中文)

</div>

---

## English

SciPlot is a free, open-source web app for creating publication-ready scientific figures — no installation, no account, all data stays in your browser.

### ✨ Features

- **Data import** — CSV / TSV / Excel files, clipboard paste from spreadsheets, plus an editable data table (add/remove rows & columns, fix values in place)
- **12 chart types** — line, scatter, bar, area, error bars, box plot, violin, histogram, density (KDE), heatmap, correlation matrix, radar, polar
- **Multi-panel figures** — compose A/B/C/D panels with automatic panel labels
- **Journal-grade styling** — exact figure sizes for Nature / Science / Cell / IEEE / PNAS (single & double column), colorblind-safe palettes (Okabe-Ito, NPG, Lancet, viridis…), font / line width / tick direction control, log axes, dual Y axes
- **Annotations** — arrows, lines, shapes, text, significance brackets (`*`, `p < 0.05`), freehand pen — drawn as vector SVG on top of your chart
- **Drag-to-edit** — drag data points directly on the chart; the table updates live
- **Free canvas mode** — a standalone whiteboard for schematics and mechanism diagrams
- **Export** — SVG (vector), PNG (150–1200 DPI), PDF, plus a JSON project file to save & resume your work
- **Bilingual UI** — English / 中文, light & dark themes

### 🚀 Quick start

```bash
npm install
npm run dev      # http://localhost:5173
```

Click **Sample Data** to load three example datasets and explore every chart type in seconds.

### 📦 Build & deploy

```bash
npm run build    # outputs to dist/
```

The included GitHub Actions workflow ([`deploy.yml`](.github/workflows/deploy.yml)) lints, builds, and deploys to **GitHub Pages** on every push to `main`. To enable it: repository **Settings → Pages → Source → GitHub Actions**.

### 📤 Publish to GitHub

```bash
git init
git add .
git commit -m "feat: initial SciPlot release"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/sciplot.git
git push -u origin main
```

After pushing, update `src/config.ts` with your repository URL so the header GitHub link points to your repo.

### 🛠 Tech stack

React 19 · TypeScript · Vite · Apache ECharts (SVG renderer) · Zustand · Tailwind CSS 4 · i18next · PapaParse · SheetJS · jsPDF + svg2pdf

---

## 中文

SciPlot 是一个免费开源的网页版科研绘图工具，专为论文配图设计——无需安装、无需注册，数据完全保留在本地浏览器中。

### ✨ 功能特性

- **数据导入** — 支持 CSV / TSV / Excel 文件、从表格软件直接粘贴，内置可编辑数据表格（增删行列、原位改值）
- **12 种图表** — 折线、散点、柱状、面积、误差棒、箱线图、小提琴图、直方图、密度图（核密度估计）、热力图、相关性矩阵、雷达图、极坐标图
- **子图拼版** — 多面板组合（A/B/C/D 自动标号），一张图搞定组图
- **期刊级样式** — Nature / Science / Cell / IEEE / PNAS 单双栏精确尺寸（毫米级）、色盲安全配色（Okabe-Ito、NPG、Lancet、viridis 等）、字体/线宽/刻度方向、对数轴、双 Y 轴
- **标注工具** — 箭头、线条、形状、文字、显著性括号（`*`、`p < 0.05` 一键生成）、自由画笔，全部以矢量 SVG 叠加在图表上
- **拖拽改数** — 在图上直接拖动数据点，数据表实时同步
- **自由画布** — 独立白板模式，绘制示意图、流程图、机理图
- **多格式导出** — SVG（矢量）、PNG（150–1200 DPI）、PDF，支持项目文件（JSON）保存与恢复
- **双语界面** — 中文 / English 一键切换，深浅色主题

### 🚀 快速开始

```bash
npm install
npm run dev      # 打开 http://localhost:5173
```

点击「**示例数据**」即可载入三组示例数据集，几秒内体验所有图表类型。

### 📦 构建与部署

```bash
npm run build    # 产物输出到 dist/
```

仓库内置 GitHub Actions 工作流（[`deploy.yml`](.github/workflows/deploy.yml)）：每次推送到 `main` 分支会自动执行 lint、构建并发布到 **GitHub Pages**。启用方式：仓库 **Settings → Pages → Source → 选择 GitHub Actions**。

### 📤 发布到 GitHub

```bash
git init
git add .
git commit -m "feat: initial SciPlot release"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/sciplot.git
git push -u origin main
```

推送后，将 `src/config.ts` 中的仓库地址改为你的 GitHub 链接，顶栏 GitHub 图标即可正确跳转。

### 📄 许可证

[MIT](LICENSE)
