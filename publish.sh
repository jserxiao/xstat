#!/bin/bash

# 发布脚本：自动递增版本号并发布到 npm
# 使用方法: ./publish.sh [patch|minor|major]

set -e

# 默认版本递增类型
VERSION_TYPE=${1:-patch}

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}🚀 开始发布流程...${NC}"

# 构建项目
echo -e "${GREEN}🔨 构建项目...${NC}"
npm run build

# 获取当前版本
CURRENT_VERSION=$(node -p "require('./package.json').version")
echo -e "${YELLOW}📌 当前版本: v${CURRENT_VERSION}${NC}"

# 递增版本号
echo -e "${GREEN}📦 递增版本号 (${VERSION_TYPE})...${NC}"
npm version $VERSION_TYPE --no-git-tag-version
NEW_VERSION=$(node -p "require('./package.json').version")
echo -e "${GREEN}✨ 新版本: v${NEW_VERSION}${NC}"

# 提交版本更改
echo -e "${GREEN}📝 提交版本更改...${NC}"
git add package.json
git commit -m "chore: release v${NEW_VERSION}"

# 创建 Git 标签
echo -e "${GREEN}🏷️  创建 Git 标签 v${NEW_VERSION}...${NC}"
git tag "v${NEW_VERSION}"

# 发布到 npm
echo -e "${GREEN}📤 发布到 npm...${NC}"
npm publish

echo -e "${GREEN}✅ 发布完成! v${NEW_VERSION} 已成功发布${NC}"
