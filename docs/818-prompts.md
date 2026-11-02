# 818 插图提示词

README 里的图目前是仓库内的 SVG（`assets/banner.svg`、`assets/architecture.svg`、`assets/remote-request.svg`），优点是可编辑、任意分辨率清晰、GitHub 直接渲染。

如果你更想用 818 生成位图，建议**只让 818 生成无文字的背景/主视觉**，文字仍用 SVG/HTML 叠加。生图工具渲染中文很容易糊或出现错字。

## 通用风格

- 深色科技感：深海军蓝 `#070b14` 到 `#0e1630`
- 强调色：蓝 `#5b8cff`、紫 `#9b6bff`、青 `#26d0c9`
- 轻微网格/点阵、柔和光晕、圆角卡片、干净的留白
- 3D 渲染 / 高级 UI 插画质感，边缘干净
- 不要文字、不要水印、不要品牌 logo、不要人物

## 1. 顶部 Banner（推荐 1600×500，8:3）

中文：

> 深色科技感横幅主视觉，深海军蓝渐变背景，细微网格和柔和光晕；画面右侧是三个发光的圆角节点，用细线连成一个网络，中心有一个稍大的枢纽节点，蓝紫青三色渐变；左侧留出大面积空白用于叠加标题文字；高级 3D UI 插画质感，干净、克制、无文字、无水印、无 logo。

English:

> A premium dark-tech hero banner, deep navy gradient background, subtle grid and soft glows; on the right, three glowing rounded nodes connected by thin lines into a small mesh, with a slightly larger hub node at the center, blue-violet-teal gradient accents; large empty space on the left for an overlaid title; high-end 3D UI illustration, clean and restrained, no text, no watermark, no logo.

放置：保存为 `assets/banner.png`，把 README 顶部 `<img src="assets/banner.svg">` 改成 `assets/banner.png`。

## 2. 社交预览图（1280×640，2:1）

> 深色科技感社交卡片背景，深蓝渐变，右侧抽象网络拓扑：几个圆角节点和细连线，中心节点带柔和光晕，蓝紫青配色；左侧留白；极简、干净、无文字、无水印。

## 3. 架构示意图背景（可选，1600×1000）

架构图**不建议**交给生图工具：它很难精确表达“hub/spoke、outbound、store-and-forward”这些关系，改起来也麻烦。现在的 `assets/architecture.svg` 是可编辑的矢量图，推荐保留。

如果只是想要一张氛围背景：

> 深色科技感抽象背景，三个并列的圆角面板悬浮在深蓝网格上，面板之间用细线连接，蓝紫青渐变光晕；等距/俯视视角，干净、无文字、无水印。

## 4. 远程请求示意图背景（可选，1600×800）

同样建议保留 `assets/remote-request.svg` 的时序图；生图只做背景：

> 深色科技感背景，横向流动的光线从左侧穿过中间枢纽到右侧，几个圆角卡片和细线，蓝紫青渐变，轻微网格，无文字、无水印。

## 负面提示词

```text
text, letters, Chinese characters, watermark, logo, signature, UI labels,
low contrast, muddy colors, clutter, busy background, photorealistic people
```

## 使用建议

- 生成后先看左侧/上方是否有足够留白放标题。
- 中文标题不要交给 818；用 SVG/HTML 叠加。
- 位图控制在 500 KB 以内，避免 README 加载过慢。
- 保留 SVG 作为源文件；位图只是替换展示层。
