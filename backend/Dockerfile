FROM node:20-alpine

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY . .

RUN addgroup -S app && adduser -S app -G app \
  && chown -R app:app /app
USER app

ENV NODE_ENV=production
ENV PORT=5000

EXPOSE 5000

CMD ["node", "server.js"]
