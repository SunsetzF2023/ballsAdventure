# Balls Adventure — 防守游戏

一个基于HTML5 Canvas的塔防类小游戏，采用模块化JavaScript架构开发。

## 游戏特色

- **天数推进**：按Day（关卡）推进，Day 5/10/15...会刷Boss
- **传送门刷怪**：怪物从上方传送门出现并向下推进
- **城墙 + 弹弓**：我方城墙在下方，用弹弓发射角色卡进入场地
- **卡牌耗法术（Mana）**：多张卡（角色卡 + 法术卡），随时间回复法术
- **物理碰撞**：场地为矩形，撞四边反弹；角色逐渐减速并停下；停下后按角色类型释放技能
- **打爆传送门过关**：角色撞到传送门会扣传送门血，清空则通关
- **局外成长系统**：金币收集、抽卡系统、存档管理

## 项目结构

```
ballsAdventure/
├── js/                     # JavaScript模块
│   ├── main.js            # 游戏主入口
│   ├── config.js          # 游戏配置
│   ├── utils.js           # 工具函数
│   ├── gameState.js       # 游戏状态管理
│   ├── renderer.js        # 渲染系统
│   ├── entities.js        # 游戏实体类
│   ├── gameLogic.js       # 游戏逻辑
│   └── ui.js              # UI管理
├── assets/                 # 游戏资源
│   ├── images/            # 图片资源
│   ├── sounds/            # 音效资源
│   └── fonts/             # 字体资源
├── .github/
│   └── workflows/
│       └── deploy.yml     # GitHub Actions 部署配置
├── backup/                # 原始文件备份
├── index.html             # 主页面
├── style.css              # 样式文件
└── README.md              # 项目说明
```

## 技术栈

- **前端**：HTML5 Canvas + ES6 Modules + 原生JavaScript
- **样式**：CSS3 + CSS变量
- **部署**：GitHub Pages
- **CI/CD**：GitHub Actions

## 运行方式

### 本地运行

1. 克隆仓库：
```bash
git clone https://github.com/SunsetzF2023/ballsAdventure.git
cd ballsAdventure
```

2. 使用本地服务器运行（推荐）：
```bash
# 使用Python
python -m http.server 8000

# 或使用Node.js
npx serve .

# 或使用Live Server扩展（VSCode）
```

3. 在浏览器中访问 `http://localhost:8000`

### 直接运行

直接双击打开 `index.html` 文件（使用现代浏览器如Chrome/Firefox）

## 在线游玩

游戏部署在GitHub Pages，可以直接访问：
https://sunsetzf2023.github.io/ballsAdventure/

## 操作说明

- **选角色卡** → 在画面底部弹弓圈附近**按住拖拽** → **松手发射**
- **选法术卡**
  - "点击场地释放"的法术：在矩形场地内点击
  - "立即释放"的法术：直接点卡牌即可
- **ESC键**：打开/关闭建设界面
- **B键**：打开建设界面

## 开发说明

### 模块架构

项目采用ES6模块化架构，将游戏逻辑拆分为多个独立模块：

- `config.js` - 游戏配置和常量
- `utils.js` - 通用工具函数
- `gameState.js` - 游戏状态管理和存档系统
- `renderer.js` - 渲染系统
- `entities.js` - 游戏实体类（角色、怪物）
- `gameLogic.js` - 核心游戏逻辑
- `ui.js` - UI交互管理
- `main.js` - 游戏主入口和循环

### 添加新功能

1. **新卡牌**：在`config.js`中的`CARDS`数组添加
2. **新怪物**：在`entities.js`中扩展Monster类
3. **新特效**：在`renderer.js`中添加渲染方法
4. **新UI**：在`ui.js`中添加交互逻辑

### 部署更新

推送到main分支会自动触发GitHub Actions部署：
```bash
git add .
git commit -m "更新内容"
git push origin main
```

## 备注

这是重构版本，从单文件HTML改为模块化架构，便于维护和扩展。原有的游戏逻辑和玩法保持不变，只是代码结构更加清晰。

后续可以继续添加：
- 更多卡牌与技能效果
- 更丰富的怪物种类与AI
- 音效和背景音乐
- 更多的视觉特效
- 成就系统
- 排行榜功能
