FROM node:22-alpine
WORKDIR /app

# Install deps at build time.
# Docker seeds the named volume from this image layer on first run,
# so vite is available even before the source volume is mounted.
COPY react-app/package*.json ./
RUN npm install

EXPOSE 5173

CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0", "--port", "5173"]
