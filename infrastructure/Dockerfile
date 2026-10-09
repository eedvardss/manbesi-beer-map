# syntax=mirror.gcr.io/docker/dockerfile:1
# Build context: the repository root (see compose.yaml); Dockerfile.dockerignore
# admits only application/. Bases are pinned by tag and
# digest; bump both together (Renovate/Dependabot can track the digests).
# mirror.gcr.io is Google's Docker Hub mirror: avoids anonymous Docker Hub rate limits on shared runners.
ARG NODE_BUILD_IMAGE=mirror.gcr.io/library/node:22.23.3-trixie-slim@sha256:154ba2f4d6fec323d28e4f4bb86bba4677f1223391a1979cf521304e03a98dfa
# Distroless: Node 22 on Debian 13 with no shell, package manager, npm or perl.
ARG NODE_RUNTIME_IMAGE=gcr.io/distroless/nodejs22-debian13:nonroot@sha256:ec2313763dd43931543bd03830466e0c409ce73a487e8d46f10db72d3b816c1c

FROM ${NODE_BUILD_IMAGE} AS build
WORKDIR /app
ENV NPM_CONFIG_UPDATE_NOTIFIER=false NPM_CONFIG_FUND=false NPM_CONFIG_AUDIT=false
COPY application/package.json application/package-lock.json ./
RUN --mount=type=cache,target=/root/.npm,sharing=locked npm ci
COPY application/ ./
# The Docker-target build bundles the server; vinext records the packages it
# left external (pg, react, react-dom, ipaddr.js) in vinext-externals.json.
# emitStandaloneOutput copies only those plus vinext's own runtime chain into
# dist/standalone/node_modules, so build tools and client-only packages never
# reach the runtime image. It runs after precompression so .br/.gz are copied.
RUN npm run build:docker \
 && node --input-type=module -e "import { emitStandaloneOutput } from './node_modules/vinext/dist/build/standalone.js'; emitStandaloneOutput({ root: process.cwd(), outDir: 'dist' });" \
 && mkdir -p /out/scripts \
 && cp -R dist/standalone/node_modules dist/standalone/public /out/ \
 # sharp (+ ~37 MB of libvips under @img) is only an optional dependency of
 # @vercel/og for next/og PNG rendering, which this app does not use.
 && rm -rf /out/node_modules/sharp /out/node_modules/@img \
 && cp -R dist/standalone/dist /out/dist \
 && cp -R dist/db /out/dist/db \
 && cp scripts/start-server.mjs scripts/setup-database.mjs /out/scripts/ \
 && cp dist/standalone/package.json /out/

FROM ${NODE_RUNTIME_IMAGE} AS runtime
LABEL org.opencontainers.image.title="beer-map" \
      org.opencontainers.image.description="Rīgas alus web app (vinext Node server)" \
      org.opencontainers.image.source="https://github.com/eedvardss/manbesi-beer-map"
WORKDIR /app
ENV NODE_ENV=production PORT=3000
# Files stay root-owned and read-only for the app user; the server writes nothing.
COPY --from=build /out/ ./
USER 65532:65532
EXPOSE 3000
# Exec form: distroless has no shell. node is not on PATH, so use its full path.
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD ["/nodejs/bin/node", "-e", "fetch('http://127.0.0.1:'+(process.env.PORT||3000)+'/api/health').then(r=>process.exit(r.ok?0:1),()=>process.exit(1))"]
# The base ENTRYPOINT is /nodejs/bin/node, so CMD is the script to run.
CMD ["scripts/start-server.mjs"]
