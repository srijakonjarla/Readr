FROM node:20-alpine

WORKDIR /app

COPY package*.json ./

# Ensure clean install based on package.json
RUN rm -rf node_modules
RUN npm install --production

COPY . .

# Create uploads directory
RUN mkdir -p uploads

EXPOSE 5000

CMD ["node", "server/app.js"]