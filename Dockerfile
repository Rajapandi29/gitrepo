FROM node:18-alpine

WORKDIR /app

RUN npm install -g npm@latest 

COPY package*.json /.

COPY . .

EXPOSE 3000

CMD ["npm", "-g", "start"]
