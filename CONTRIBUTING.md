# 贡献指南

感谢你对「智策」的兴趣！欢迎提交 Issue 和 Pull Request。

## 开发流程

1. Fork 本仓库
2. 创建特性分支：`git checkout -b feat/your-feature`
3. 提交改动：`git commit -m 'feat: add your feature'`
4. 推送到分支：`git push origin feat/your-feature`
5. 提交 Pull Request

## 提交规范

提交信息格式：`<类型>: <描述>`

类型包括：
- `feat`: 新功能
- `fix`: 修复 bug
- `docs`: 文档改动
- `style`: 代码格式（不影响功能）
- `refactor`: 重构
- `test`: 测试相关
- `chore`: 构建/工具相关

## 开发环境

```bash
npm install
cp .env.example .env  # 然后填入你的配置
npm run dev
```

## 代码规范

- 运行 `npm run lint` 确保代码通过 ESLint
- 运行 `npm run type:check` 确保类型检查通过
- 运行 `npm run test` 确保测试通过
- 使用 Prettier 格式化代码（项目已配置 .prettierrc）

## 报告 Bug

提交 Issue 时请包含：
- 复现步骤
- 预期行为 vs 实际行为
- 浏览器/系统版本
- 截图或录屏（如有）
