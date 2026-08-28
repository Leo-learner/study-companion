#!/usr/bin/env bash
# 部署 study-companion（纯静态 SPA）到 studycompanion.dkz12345.com。
#
#   ./deploy.sh inspect              # 勘察：站点配置、当前发布版本
#   ./deploy.sh deploy               # 构建 → 上传为新 release → 切换 current 软链
#   ./deploy.sh rollback             # 切回上一个 release
#   ./deploy.sh releases             # 列出所有 release
#
# 沿用服务器既有约定：releases/<tag> + current 软链。
# 切软链即发布，无需改动 nginx；回滚就是把软链指回去，秒级完成。
set -euo pipefail

KEY="${DEPLOY_KEY:-$HOME/Desktop/ssh-key-removing-restricted/leo-web-key.pem}"
HOST="${DEPLOY_HOST:-leo@20.48.14.96}"
SITE_ROOT="${DEPLOY_SITE_ROOT:-/var/www/studycompanion.dkz12345.com}"
URL="${DEPLOY_URL:-https://studycompanion.dkz12345.com/}"
SSH_OPTS=(-o BatchMode=yes -o ConnectTimeout=15)

sshc() { ssh "${SSH_OPTS[@]}" -i "$KEY" "$HOST" "$@"; }

case "${1:-inspect}" in
  inspect)
    sshc "echo '== 当前发布 =='; ls -l '$SITE_ROOT/current'
echo '== 全部 release =='; ls -1t '$SITE_ROOT/releases' 2>/dev/null
echo '== 站点配置 =='; sudo grep -E 'server_name|root |try_files' /etc/nginx/sites-enabled/studycompanion.dkz12345.com | sed 's/^[ \t]*//'"
    ;;

  deploy)
    TAG="${2:-redesign-$(date +%Y%m%d-%H%M%S)-$(git rev-parse --short HEAD)}"
    TGZ="$(mktemp -t sc-dist).tgz"

    echo "→ 构建"
    npm run build >/dev/null

    # COPYFILE_DISABLE：不要把 macOS 的 ._* AppleDouble 垃圾文件打进包
    echo "→ 打包 $TAG"
    COPYFILE_DISABLE=1 tar --exclude '._*' --exclude '.DS_Store' -czf "$TGZ" -C dist .

    echo "→ 上传"
    scp "${SSH_OPTS[@]}" -i "$KEY" "$TGZ" "$HOST:/tmp/sc-dist.tgz"

    echo "→ 解包为新 release"
    sshc "set -e
mkdir -p '$SITE_ROOT/releases/$TAG'
tar -xzf /tmp/sc-dist.tgz -C '$SITE_ROOT/releases/$TAG'
find '$SITE_ROOT/releases/$TAG' -name '._*' -delete
rm -f /tmp/sc-dist.tgz
ls '$SITE_ROOT/releases/$TAG'"

    echo "→ 切换 current 软链"
    sshc "set -e
readlink '$SITE_ROOT/current' > '$SITE_ROOT/.previous' || true
ln -sfn '$SITE_ROOT/releases/$TAG' '$SITE_ROOT/current'
ls -l '$SITE_ROOT/current'"

    echo "→ 重载 nginx"
    sshc 'sudo nginx -t 2>&1 | tail -1 && sudo systemctl reload nginx && echo nginx-reloaded'

    echo "→ 校验线上"
    sleep 2
    code=$(curl -s -o /dev/null -w '%{http_code}' --max-time 20 "$URL")
    echo "  HTTP $code"
    curl -s --max-time 20 "$URL" | grep -o 'assets/[^"]*' | head -3
    rm -f "$TGZ"
    echo "✓ 已发布：$TAG"
    ;;

  rollback)
    sshc "set -e
prev=\$(cat '$SITE_ROOT/.previous' 2>/dev/null || true)
if [ -z \"\$prev\" ] || [ ! -d \"\$prev\" ]; then echo '没有可回滚的版本'; exit 1; fi
readlink '$SITE_ROOT/current' > '$SITE_ROOT/.previous'
ln -sfn \"\$prev\" '$SITE_ROOT/current'
ls -l '$SITE_ROOT/current'"
    sshc 'sudo systemctl reload nginx && echo nginx-reloaded'
    ;;

  releases)
    sshc "ls -1t '$SITE_ROOT/releases'; echo '--- 当前 ---'; readlink '$SITE_ROOT/current'"
    ;;

  *) echo "用法: $0 {inspect|deploy [tag]|rollback|releases}"; exit 1 ;;
esac
