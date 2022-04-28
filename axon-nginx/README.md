# Deploy Nginx
Requires docker、docker-compose

## Configuration of the deployment
### Step 1
```shell
$ cd axon-devops/axon-nginx
```
### Step 2
```shell
$ vim nginx/conf/nginx.conf 
```

Editor nginx.conf

Configure the keepalive_requests, sets the maximum number of requests that can be served through one keep-alive connection. After the maximum number of requests are made, the connection is closed.

Example: 
- benchmark requeset to nginx per minute is about 20000, QPS=20000/60s, so keepalive_requests should be more than 3400
  
```conf
#user  nobody;
worker_processes  1;

error_log  /var/log/nginx/error.log;
#error_log  logs/error.log  notice;
#error_log  logs/error.log  info;

#pid        logs/nginx.pid;


events {
    worker_connections  1024;
}


http {
    include       mime.types;
    default_type  application/octet-stream;


    log_format main '$remote_addr - $remote_user [$time_local] "$request" '
    '$status $body_bytes_sent "$http_referer" '
    '"$http_user_agent" "$http_x_forwarded_for"'
    '$upstream_addr $upstream_response_time $request_time ';

    access_log  /var/log/nginx/access.log  main;
    
    # upload file max size
    client_max_body_size 300m;
    sendfile        on;
    #tcp_nopush     on;
    #keepalive_timeout  0;
    keepalive_timeout  65;
    keepalive_requests 7000;
    #gzip  on;
    include /etc/nginx/conf.d/*.conf;
    
}                                              
```

### Step 3
```shell
$ vim nginx/conf.d/axon.conf 
```

Editor axon.conf

- Configure the http address for all axon node rpc accesses
- keepalive_requests: sets the maximum number of requests that can be served through one keep-alive connection. After the maximum number of requests are made, the connection is closed. 
- keepalive: Activates the cache for connections to upstream servers.
- keepalive_timeout: Sets a timeout during which an idle keepalive connection to an upstream server will stay open.

```conf
upstream  axon-server {     
    # Configure the http address for all axon node rpc accesses
    server xxx.xxx.xxx.xxx:8000;
    server xxx.xxx.xxx.xxx:8000;
    server xxx.xxx.xxx.xxx:8000;
    server xxx.xxx.xxx.xxx:8000;
    keepalive 15000;
    keepalive_requests 10000;
    keepalive_timeout 45s;
}

server {
    listen 8500;
    server_name    localhost;
    location / {
        proxy_set_header    Host            $host:8500;
        proxy_set_header    X-Real-IP       $remote_addr;
        proxy_set_header    X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_hide_header   X-Powered-By;
        proxy_pass http://axon-server;    
    }
}                                                      
```

### Step 4
```shell
$ vim config.yml 
```
Editor config.yml 

- deploy_path: deploy files path
- enable_access_log: true or false, 'true' will  generate access.log under niginx/logs.

```yml
deploy_path: "/home/ckb/axon-devops/axon-nginx"
enable_access_log: "false"                                 
```

## Deploy
### deploy
```shell
$ make deploy 
```


### clean logs 
```shell
$ make clean
```

### config 
```shell
$ make config
```
