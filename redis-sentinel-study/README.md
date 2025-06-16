# Redis Sentinel in Docker

## Run
```bash
docker compose up -d redis-master redis-replica-1 redis-replica-2    
```

IP 확보를 위해 `redis-master`, `redis-replica-1`, `redis-replica-2` 를 먼저 실행합니다.

```shell
docker inspect -f '{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}' redis-master  
```

`redis-master` 의 IP를 확인합니다.

그런 후 `sentinel.conf` 의 `master host` 를 변경합니다.

```conf
...
sentinel monitor mymaster {MASTER_IP} 6379 2
...
```

그 후, `sentinel-1`, `sentinel-2`, `sentinel-3` 컨테이너를 생성합니다.

## Stop Master
```bash
docker stop redis-master
```

## Check Master
```bash
docker exec -it sentinel-1 redis-cli -p 26379
redis-cli > SENTINEL get-master-addr-by-name mymaster
...
```