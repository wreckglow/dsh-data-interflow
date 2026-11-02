# 发布到 GitHub（wreckglow/dsh-data-interflow）

目标仓库：<https://github.com/wreckglow/dsh-data-interflow>

这份文档记录从本地提交、推送到 GitHub、提交到插件目录，以及在另一台 DSH 上安装验证的步骤。

## 0. 先确认没有敏感信息

推公开仓库前，确认这些内容没有被提交：

- 真实 `token` / `mqttSecret` / broker 密码
- `state.json`、`events.jsonl`（运行时数据）
- 任何 `.env`、私钥、证书

本仓库的 `cordis.patch.yml` 和 README 里都是 `change-me-shared-secret` 这类占位符。`.gitignore` 已经忽略 `node_modules/`、`state.json`、`events.jsonl`、`.env` 和日志。

`package.json` 里的 `"private": true` **只阻止 npm publish**，不影响 GitHub 仓库的公开/私有，也不影响从 GitHub 安装。

## 1. 配置 git 身份

```bash
git config --global user.name "wreckglow"
git config --global user.email "wreckglow@users.noreply.github.com"
```

如果不想用全局配置，把 `--global` 换成 `--local`（在仓库目录里执行）。

## 2. 创建本地提交

仓库已经初始化并 `git add` 过；只需要：

```bash
cd D:\aaabianchen\dsh-data-interflow
git commit -m "feat: DSH Interflow plugin"
```

如果之前没有初始化：

```bash
git init -b main
git add -A
git commit -m "feat: DSH Interflow plugin"
```

## 3. 关联 GitHub 仓库并推送

仓库已在 GitHub 创建（空仓库）：

```bash
git remote add origin https://github.com/wreckglow/dsh-data-interflow.git
git branch -M main
git push -u origin main
```

如果已经加过 remote：

```bash
git remote set-url origin https://github.com/wreckglow/dsh-data-interflow.git
```

如果 `git push` 要求输入密码：GitHub 不接受账户密码，要用 **Personal Access Token**（classic，勾选 `repo`）作为密码，或者改用 SSH：

```bash
git remote set-url origin git@github.com:wreckglow/dsh-data-interflow.git
```

没有安装 GitHub CLI（`gh`）也没关系，网页创建 + 上面的命令就够了。

## 4. 打一个版本标签

```bash
git tag v1.0.0
git push origin v1.0.0
```

以后从 GitHub 安装可以固定版本：`github:wreckglow/dsh-data-interflow#v1.0.0`。

## 5. 加 GitHub topic

仓库首页 → 右侧 **About** 齿轮 → **Topics**，添加：

```text
dsh-plugin
deepseek-harness
dsh
mqtt
interop
```

`dsh-plugin` 是目录站自动发现的主要标记。

## 6. 提交到 dsh-plugin.org

- 教程：<https://dsh-plugin.org/tutorials/publish-plugin-to-hub>（不要加 `/zh/`）
- 提交页：<https://dsh-plugin.org/submit>
- 审核清单：<https://dsh-plugin.org/tutorials/publish-plugin-pr-checklist>

填仓库地址 `https://github.com/wreckglow/dsh-data-interflow`，描述用：

> 让多个 DSH 实例互相发消息、交接任务、远程执行并回传结果。

我们这边已经满足：`package.json` 有 `dsh.bundle.patch`、patch 文件存在、README/icon/locale/assets 齐全、没有真实密钥。

## 7. 从 GitHub 安装到另一个 DSH

```text
plugin_manager install_bundle  target: github:wreckglow/dsh-data-interflow
```

公开仓库不需要目标机器的 GitHub 凭据。如果目标机器没有 git，或 `github:` 拉取失败：

```text
plugin_manager install_bundle  target: https://codeload.github.com/wreckglow/dsh-data-interflow/tar.gz/HEAD
```

再不行就本地克隆：

```bash
git clone https://github.com/wreckglow/dsh-data-interflow.git
```

```text
plugin_manager install_bundle  target: <克隆下来的绝对路径>
```

本地目录安装是 `link:`，`mqtt` 依赖不会自动装；从 GitHub 安装时 pnpm 会装依赖。若用克隆目录测试 MQTT，先在目录里执行：

```bash
pnpm install --prod --ignore-scripts
```

## 8. 验证安装是否真的能用

1. 刷新页面，左侧栏应出现「互通」。
2. 调 `interflow_peers`，应返回本机的 `role`、`transport`、地址。
3. 打开面板，确认「节点」页和 MQTT 配置卡片存在。
4. 用两个实例发一条消息，另一边在「消息流」里收到。
5. 如果要用远程执行，在执行方加 `executeRequests: true`，先发一个“只回复 OK”的请求。

## 9. 更新版本

```bash
git add -A
git commit -m "fix: ..."
git push
git tag v1.0.1
git push origin v1.0.1
```

另一台实例上重新 `install_bundle`（必要时先 `remove_bundle`）或 `git pull` 后重装。

## 10. 许可证

当前 `package.json` 是 `"private": true`，仓库里没有 `LICENSE`。如果只是自己用，可以保持现状；如果想让别人也能合法使用/修改，建议加一个 MIT 许可证，并在 `package.json` 增加 `"license": "MIT"`。这一步需要你自己决定，不要默认替别人选。
