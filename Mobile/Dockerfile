# Tahap 1: Build Flutter Web
FROM debian:latest AS build-env

# Instal dependensi yang diperlukan
RUN apt-get update && apt-get install -y curl git wget unzip xz-utils libglu1-mesa

# Instal Flutter
RUN git clone https://github.com/flutter/flutter.git /usr/local/flutter
ENV PATH="/usr/local/flutter/bin:/usr/local/flutter/bin/cache/dart-sdk/bin:${PATH}"

# Jalankan flutter doctor dan aktifkan web
RUN flutter doctor -v
RUN flutter config --enable-web

# Salin kode aplikasi
WORKDIR /app
COPY . .

# Ambil dependensi dan build untuk web
RUN flutter pub get
RUN flutter build web --release

# Tahap 2: Sajikan dengan Nginx
FROM nginx:alpine
COPY --from=build-env /app/build/web /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
