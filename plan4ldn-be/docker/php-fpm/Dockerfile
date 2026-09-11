# Use the alpine PHP image as a base
FROM php:8.4-fpm-alpine

# Install system dependencies
RUN apk --no-cache add \
#    autoconf \   
    bash \
    build-base \
    libpng-dev \
    libjpeg-turbo-dev \
    libwebp-dev \
    libxpm-dev \
    freetype-dev \
    libzip-dev \
    zip \
    unzip \
    git \
    bash \
    fcgi \
    libmcrypt-dev \
    oniguruma-dev \
    supervisor \
    fcgi \
    gdal \
    gdal-tools \
    py3-gdal  

# Clear cache
RUN rm -rf /var/cache/apk/*


# Install PHP extensions
RUN docker-php-ext-configure gd --with-freetype --with-jpeg --with-webp \
    && docker-php-ext-install gd \
    && docker-php-ext-install pdo pdo_mysql mbstring zip exif pcntl bcmath opcache
 
# RUN pecl install redis

# 
COPY ./docker/php-fpm/php.ini "$PHP_INI_DIR/php.ini"

#RUN sed -i '/\[www\]/a pm.status_path = /status' /usr/local/etc/php-fpm.d/zz-docker.conf

# Install Composer
COPY --from=composer:latest /usr/bin/composer /usr/bin/composer

# Copy existing application directory contents
COPY . /var/www
COPY ./storage /var/www/storage-init

RUN chown -R www-data:www-data /var/www/storage-init
RUN chmod -R 775 /var/www/storage-init

RUN chown -R www-data:www-data /var/www 

# Copy the initialization script
COPY ./docker/php-fpm/start-container /usr/local/bin/start-container
COPY ./docker/php-fpm/supervisord.conf /etc/supervisor/conf.d/supervisord.conf
COPY ./docker/php-fpm/scheduler /usr/local/bin/scheduler
# COPY ./docker/php-fpm/php-fpm-healthcheck /usr/local/bin/
#  RUN chmod +x /usr/local/bin/php-fpm-healthcheck
RUN chmod +x /usr/local/bin/start-container
RUN chmod +x /usr/local/bin/scheduler


RUN mkdir /var/log/supervisor
RUN echo 'Supervisor LOG' > /var/log/supervisor/supervisord.log   



RUN ln -s /usr/local/bin/php /usr/bin/php
RUN ln -s /bin/bash /usr/bin/bash

WORKDIR /var/www

RUN composer install

# Change the default command to run the entrypoint script
ENTRYPOINT ["start-container"]
# Expose port 9000 and start php-fpm server
EXPOSE 9000

CMD ["php-fpm"]

