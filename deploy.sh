#!/usr/bin/env bash
# 部署 study-companion（纯静态 SPA）到服务器的子路径。
#
#   ./deploy.sh inspect          # 只勘察：看 nginx 站点、已有目录，决定挂哪儿
#   ./deploy.sh deploy <site> <path>
#
# 例：./deploy.sh deploy dkz12345.com /study
#
# 产物用相对资源路径构建（vite base './'）+ HashRouter，
# 因此换子路径不需要重新构建，nginx 里换个 location 即可。
set -euo pipefail

KEY="${DEPLOY_KEY:-$HOME/Desktop/ssh-key-removing-restricted/leo-web-key.pem}"
HOST="${DEPLOY_HOST:-leo@20.48.14.96}"
REMOTE_ROOT="${DEPLOY_ROOT:-/opt/apps/study-companion}"
SSH_OPTS=(-o BatchMode=yes -o ConnectTimeout=15)

sshc() { ssh "${SSH_OPTS[@]}" -i "$KEY" "$HOST" "$@"; }

case "${1:-inspect}" in
  inspect)
    sshc 'echo "== hostname =="; hostname
echo "== nginx sites-enabled =="; ls /etc/nginx/sites-enabled/ 2>/dev/null
echo "== nginx server_name/root =="; grep -rhE "server_name|root |location " /etc/nginx/sites-enabled/ 2>/dev/null | sed "s/^[ \t]*//" | head -40
echo "== /opt/apps =="; ls /opt/apps 2>/dev/null
echo "== /var/www =="; ls /var/www 2>/dev/null
echo "== 磁盘 =="; df -h / | tail -1'
    ;;

  deploy)
    SITE="${2:?用法: deploy.sh deploy <nginx站点文件名> <子路径，如 /study>}"
    URLPATH="${3:?用法: deploy.sh deploy <nginx站点文件名> <子路径，如 /study>}"
    TGZ="$(mktemp -t sc-dist).tgz"

    echo "→ 构建"
    npm run build >/dev/null
    tar -czf "$TGZ" -C dist .

    echo "→ 上传到 $REMOTE_ROOT"
    scp "${SSH_OPTS[@]}" -i "$KEY" "$TGZ" "$HOST:/tmp/sc-dist.tgz"

    echo "→ 解包（先备份旧版本）"
    sshc "sudo mkdir -p '$REMOTE_ROOT'
if [ -d '$REMOTE_ROOT/current' ]; then sudo rm -rf '$REMOTE_ROOT/previous'; sudo mv '$REMOTE_ROOT/current' '$REMOTE_ROOT/previous'; fi
sudo mkdir -p '$REMOTE_ROOT/current'
sudo tar -xzf /tmp/sc-dist.tgz -C '$REMOTE_ROOT/current'
sudo chown -R www-data:www-data '$REMOTE_ROOT'
rm -f /tmp/sc-dist.tgz
ls -la '$REMOTE_ROOT/current' | head"

    echo "→ nginx location（若已存在则跳过，需手工确认）"
    sshc "if sudo grep -q 'location ${URLPATH}' '/etc/nginx/sites-enabled/${SITE}'; then
  echo '  已有 ${URLPATH} 配置，未改动'
else
  echo '  请手工在 /etc/nginx/sites-enabled/${SITE} 的 server 块内加入：'
  cat <<CONF
    location ${URLPATH}/ {
        alias ${REMOTE_ROOT}/current/;
        try_files \\\$uri \\\$uri/ ${URLPATH}/index.html;
    }
    location = ${URLPATH} { return 301 ${URLPATH}/; }
CONF
fi"

    echo "→ 校验并重载 nginx"
    sshc 'sudo nginx -t && sudo systemctl reload nginx && echo "nginx 已重载"'
    rm -f "$TGZ"
    echo "✓ 完成"
    ;;

  rollback)
    sshc "if [ -d '$REMOTE_ROOT/previous' ]; then
  sudo rm -rf '$REMOTE_ROOT/current'
  sudo mv '$REMOTE_ROOT/previous' '$REMOTE_ROOT/current'
  echo '已回滚到上一版本'
else echo '没有可回滚的版本'; fi"
    ;;

  *) echo "用法: $0 {inspect|deploy <site> <path>|rollback}"; exit 1 ;;
esac
