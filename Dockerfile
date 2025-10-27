# Use Node 20 base image
FROM node:20

# Install ffmpeg
RUN apt-get update && apt-get install -y ffmpeg

# Set working directory
WORKDIR /app

# Copy package files first for caching
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy the rest of the project
COPY . .

# Build the NestJS app
RUN npm run build

# Expose port (use same as your .env PORT or 3001)
EXPOSE 3001

# Start the app
CMD ["npm", "run", "start:prod"]
