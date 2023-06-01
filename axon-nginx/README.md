# Deploy Nginx
Requires docker、docker-compose

## Configuration of the deployment
### Step 1
```shell
cd axon-devops/axon-nginx
```
### Step 2
```shell
vim nginx/conf/nginx.conf 
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


    log_format json_log escape=json '{"realip":"$remote_addr","@timestamp":"$time_iso8601","host":"$http_host","request":"$request","req_body":"$request_body","status":"$status","size":$body_bytes_sent,"ua":"$http_user_agent","req_time":"$request_time","uri":"$uri","referer":"$http_referer","xff":"$http_x_forwarde
d_for","ups_status":"$upstream_status","ups_addr":"$upstream_addr","ups_time":"$upstream_response_time"}';
    access_log  /var/log/nginx/access.log  json_log;
    
    # upload file max size
    client_max_body_size 300m;
    client_body_buffer_size 50m;
    sendfile        on;
    #tcp_nopush     on;
    keepalive_timeout  65;
    keepalive_requests 7000;
    #gzip  on;
    include /etc/nginx/conf.d/*.conf;
    
}                                             
```

### Step 3
```shell
vim nginx/conf.d/axon.conf 
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
vim config.yml 
```
Editor config.yml 

- enable_access_log: true or false, 'true' will  generate access.log under niginx/logs.
- nginx_port: nginx proxy axon rpc port

```yml
enable_access_log: "true"
nginx_port: "8500"                                 
```

## Deploy
### start
```shell
make start 
```

### clean logs 
```shell
make clean
```

### config 
```shell
make config
```

### stop 
```shell
make stop
```
