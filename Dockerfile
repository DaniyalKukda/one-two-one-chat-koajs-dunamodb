FROM node:latest
WORKDIR /app

EXPOSE 3000

COPY . .

ENV NODE_OPTION = "--max_old_space_size=4096"
ENV NODE_ENV = "production"
ENV PORT="3000"

RUN npm install
RUN npx tsc

CMD [ "node", "build/index.js" ]