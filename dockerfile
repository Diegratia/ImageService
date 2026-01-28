FROM node:20-alpine

# ffmpeg dependency
RUN apk add --no-cache ffmpeg

WORKDIR /app

COPY package*.json ./
RUN npm install --production

COPY . .

RUN mkdir -p uploads/images uploads/videos uploads/documents

EXPOSE 5099

CMD ["node", "index.js"]
