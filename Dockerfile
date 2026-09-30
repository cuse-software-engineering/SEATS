# One image per service, built from the repo root so that proto/ is inside the image.
#   docker build --build-arg SERVICE=services/booking -t seats-booking .
FROM node:20-alpine
WORKDIR /app
ARG SERVICE
ENV SERVICE=$SERVICE
COPY package.json ./
COPY gateway/package.json gateway/
COPY services/concert-round/package.json services/concert-round/
COPY services/table-availability/package.json services/table-availability/
COPY services/booking/package.json services/booking/
RUN npm install --omit=dev
COPY proto ./proto
COPY gateway ./gateway
COPY services ./services
CMD ["sh", "-c", "node $SERVICE/src/server.js"]
