FROM mhart/alpine-node:7.6
MAINTAINER raul.requero@vizzuality.com

ENV NAME gfw-area
ENV USER gfw-area

RUN apk update && apk upgrade && \
    apk add --no-cache --update bash git openssh python alpine-sdk

RUN addgroup $USER && adduser -s /bin/bash -D -G $USER $USER

RUN npm install -g grunt-cli bunyan pm2

RUN mkdir -p /opt/$NAME
COPY package.json /opt/$NAME/package.json
RUN cd /opt/$NAME && npm install

COPY entrypoint.sh /opt/$NAME/entrypoint.sh
COPY config /opt/$NAME/config

WORKDIR /opt/$NAME

COPY ./app /opt/$NAME/app
RUN chown $USER:$USER /opt/$NAME

# Tell Docker we are going to use this ports
EXPOSE 4100
USER $USER

ENTRYPOINT ["./entrypoint.sh"]
