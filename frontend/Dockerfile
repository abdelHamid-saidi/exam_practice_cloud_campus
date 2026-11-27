FROM node:20-alpine AS build

WORKDIR /app

COPY package.json package-lock.json ./
# npm install : le lockfile du dépôt n'est pas strictement aligné avec package.json
RUN npm install

COPY . .

# URL figée au build (Create React App). Par défaut : chemin relatif
# proxifié par Nginx vers le service backend.
ARG REACT_APP_API_URL=/api
ENV REACT_APP_API_URL=$REACT_APP_API_URL

RUN npm run build

FROM nginx:1.27-alpine

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/build /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
