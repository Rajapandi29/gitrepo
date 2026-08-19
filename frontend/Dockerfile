FROM nginx:stable-alpine

RUN rm /etc/nginx/conf.d/default.conf

COPY index.html /var/www/html/index.html
COPY styles.css /var/www/html/styles.css
COPY app.js /var/www/html/app.js
COPY .conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
