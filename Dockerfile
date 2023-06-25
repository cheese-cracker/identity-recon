# Get Node Image
FROM node:alpine

# Set the working directory inside the container
WORKDIR /app

# Copy the project files to the working directory
COPY . .

# Install project dependencies
RUN npm install --omit=dev

# Expose the port
EXPOSE 8080
ENV PORT=8080

# Start the Node.js application
CMD ["node", "app.js"]
