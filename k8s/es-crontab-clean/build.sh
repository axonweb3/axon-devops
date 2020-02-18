go build .
docker build -t mutadev/es-crontab-clean:0.1.0 .
docker push mutadev/es-crontab-clean:0.1.0
