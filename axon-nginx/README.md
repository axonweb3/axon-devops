# Deploy Nginx
Requires docker、docker-compose

## Configuration of the deployment
### Step 1
```shell
$ cd axon-devops/axon-nginx
```

### Step 2
```shell
$ vim nginx/conf.d/axon.conf 
```

Editor axon.conf

Configure the http address for all axon node rpc accesses

```conf
upstream  axon-server {     
    # Configure the http address for all axon node rpc accesses
    server xxx.xxx.xxx.xxx:8000;
    server xxx.xxx.xxx.xxx:8000;
    server xxx.xxx.xxx.xxx:8000;
    server xxx.xxx.xxx.xxx:8000;
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
## Start and stop
### start
```shell
$ docker-compose up -d
```

### stop
```shell
$ docker-compose down
```
