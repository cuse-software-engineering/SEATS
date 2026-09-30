# One image per service, built from the repo root so that proto/ is inside the image; TypeScript is compiled here.
#   docker build --build-arg SERVICE=services/booking -t seats-booking .
FROM node:20-alpine
WORKDIR /app
ARG SERVICE
ENV SERVICE=$SERVICE
COPY package.json tsconfig.base.json ./
COPY proto/package.json proto/
COPY gateway/package.json gateway/
COPY services/concert-round/package.json services/concert-round/
COPY services/table-availability/package.json services/table-availability/
COPY services/booking/package.json services/booking/
COPY services/payment/package.json services/payment/
COPY services/notification/package.json services/notification/
COPY services/staff-account/package.json services/staff-account/
RUN npm install
COPY proto ./proto
COPY gateway ./gateway
COPY services ./services
RUN npm run build
CMD ["sh", "-c", "node $SERVICE/dist/server.js"]
