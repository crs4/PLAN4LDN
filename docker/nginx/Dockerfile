ARG BASE_IMAGE_VERSION
#FROM geonode/nginx:1.31.2-latest
#### nginx vulnerability -> needed version 1.31.3 not present in geonode
FROM nginx:${BASE_IMAGE_VERSION}

RUN apk update && apk add --no-cache procps inotify-tools openssl

# copy local src inside container
ADD ./geonode.conf.envsubst /etc/nginx/sites-enabled/
ADD ./nginx.conf.envsubst /etc/nginx/nginx.conf
ADD ./nginx.conf.envsubst /etc/nginx/
ADD ./nginx.https.available.conf.envsubst /etc/nginx/

 ADD ./docker-autoreload.sh ./docker-entrypoint.sh /
 RUN chmod +x /docker-autoreload.sh /docker-entrypoint.sh
# RUN ls -la /
# RUN export PATH=$PATH:/usr/sbin

ENTRYPOINT ["/docker-entrypoint.sh"]

CMD ["/usr/sbin/nginx", "-g", "daemon off;"]

