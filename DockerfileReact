FROM node:26-alpine3.24 

WORKDIR /app

COPY plan4ldn-fe . 
COPY .env .

RUN npm install --save 
RUN npm run build

EXPOSE 3000

CMD ["npm", "start"]
