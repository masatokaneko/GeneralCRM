# Dev Container用Dockerfile
# 役割: OSレベルの基本設定とfeaturesで提供されないツールのインストール
# - Node.js/Python/Gitはdevcontainer.jsonのfeaturesで管理
# - AWS CLI、uvなどの特殊なツールのみここでインストール

FROM mcr.microsoft.com/devcontainers/base:ubuntu

# ユーザーのUID/GIDを引数として受け取る（デフォルト値）
ARG USER_UID=1000
ARG USER_GID=1000

# 必要最小限のツールのみインストール（Git/Pythonはfeaturesで管理）
RUN apt-get update && export DEBIAN_FRONTEND=noninteractive \
    && apt-get -y install --no-install-recommends \
    curl \
    unzip \
    ca-certificates \
    && apt-get clean -y \
    && rm -rf /var/lib/apt/lists/*

# AWS CLI v2のインストール
RUN curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip" \
    && unzip awscliv2.zip \
    && ./aws/install \
    && rm -rf aws awscliv2.zip

# uvのインストール（高速なPythonパッケージマネージャー）
RUN curl -LsSf https://astral.sh/uv/install.sh | env INSTALLER_NO_MODIFY_PATH=1 sh && \
    mv /root/.local/bin/uv* /usr/local/bin/ && \
    chmod +x /usr/local/bin/uv*

# 作業ディレクトリを設定
WORKDIR /workspace

# vscodeユーザーのUID/GIDを更新し、デフォルトシェルをbashに設定
RUN groupmod -g ${USER_GID} vscode || true \
    && usermod -u ${USER_UID} -g ${USER_GID} -s /bin/bash vscode || true

# ホームディレクトリ配下の各種設定ディレクトリを一括作成
RUN mkdir -p /home/vscode/.aws \
    && mkdir -p /home/vscode/.npm-global \
    && mkdir -p /home/vscode/.gitconfig.d \
    && chown -R ${USER_UID}:${USER_GID} /home/vscode

# npmグローバルキャッシュディレクトリの環境変数設定
ENV NPM_CONFIG_CACHE=/home/vscode/.npm-global

# デフォルトユーザーをvscodeに設定
USER vscode
