FROM node:slim
LABEL org.opencontainers.image.source="https://github.com/the-noona-project/noona-portal"
LABEL authors="the-noona-project"

# Install necessary packages
RUN apt update && apt install -y curl && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /noona/portal/

# Copy package files and install dependencies
COPY package.json package-lock.json ./
RUN npm install

# Copy the entire project
COPY . .

# Start the bot
CMD ["node", "initmain.mjs"]
