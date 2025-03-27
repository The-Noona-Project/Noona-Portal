FROM node:slim
LABEL org.opencontainers.image.source="https://github.com/the-noona-project/noona-portal"
LABEL authors="the-noona-project"

# Set working directory
WORKDIR /noona/

# Copy package files and install dependencies
COPY package.json package-lock.json ./
RUN npm install

# Copy the entire project
COPY . .

# Start the bot
CMD ["node", "initmain.mjs"]
