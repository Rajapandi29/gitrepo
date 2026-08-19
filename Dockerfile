FROM node:18-alpine

WORKDIR /app

RUN npm install 

COPY package*.json /.

COPY . .

EXPOSE 3000

CMD ["npm", "-g", "start"]
