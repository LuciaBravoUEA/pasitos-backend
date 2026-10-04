FROM node:20-alpine

WORKDIR /app

# Copiar package files
COPY package*.json ./

# Instalar dependencias
RUN npm ci

# Copiar código
COPY . .

# Generar Prisma client
RUN npx prisma generate

# Build next.js
RUN npm run build

EXPOSE 3000

CMD ["npm", "start"]
