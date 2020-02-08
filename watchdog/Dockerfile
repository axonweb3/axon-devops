FROM ubuntu:18.04

RUN apt -y update && \
    apt -y upgrade && \
    apt -y install curl dirmngr apt-transport-https lsb-release ca-certificates && \
    curl -sL https://deb.nodesource.com/setup_12.x | bash - && \
    apt -y install nodejs && \
    echo done

WORKDIR /src
COPY ./ ./

RUN cd /src && \
    rm -rf node_modules && \
    npm install && \
    echo done

CMD ["npm", "run", "start"]
