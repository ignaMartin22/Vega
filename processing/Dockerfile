FROM node:22-bookworm-slim
WORKDIR /app
COPY package.json package-lock.json tsconfig.base.json ./
COPY shared/package.json ./shared/package.json
COPY processing/package.json ./processing/package.json
COPY frontend/package.json ./frontend/package.json
COPY relayer/package.json ./relayer/package.json
RUN npm ci --ignore-scripts --no-audit --no-fund
COPY shared ./shared
COPY processing/src ./processing/src
COPY processing/scripts ./processing/scripts
COPY processing/data ./processing/data
COPY sample-data/wetlands.geojson ./sample-data/wetlands.geojson
RUN mkdir /data && chown node:node /data
ENV HOST=0.0.0.0 PORT=8787 ANALYSIS_DATA_DIR=/data
USER node
EXPOSE 8787
VOLUME ["/data"]
HEALTHCHECK --interval=30s --timeout=5s CMD node -e "fetch('http://127.0.0.1:8787/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "node_modules/tsx/dist/cli.mjs", "processing/src/serve.ts"]
