FROM denoland/deno:alpine

WORKDIR /app

# Copy all source files first (Deno needs the full project structure)
COPY . .

# Cache dependencies and entry point
RUN deno cache server/main.ts

# Expose the default Harmony port
EXPOSE 3000

# Run the production server
CMD ["deno", "task", "server"]
