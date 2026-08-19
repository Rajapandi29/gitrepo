FROM nginx:stable-alpine

RUN rm /etc/nginx/conf.d/default.conf

COPY index.html /var/www/html/index.html
COPY extra.css /var/www/html/extra.css
COPY style.css /var/www/html/style.css
COPY app.js /var/www/html/app.js
COPY .conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]