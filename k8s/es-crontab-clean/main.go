package main

import (
	"bufio"
	"flag"
	"log"
	"net/http"
	"strings"
	"time"
)

var (
	cEsURL = flag.String("es", "http://127.0.0.1:9200", "")
	cN     = flag.Int("n", 7, "")
)

func main() {
	flag.Parse()
	res, err := http.Get(*cEsURL + "/_cat/indices")
	if err != nil {
		log.Panicln(err)
	}
	defer res.Body.Close()

	scanner := bufio.NewScanner(res.Body)
	for scanner.Scan() {
		cnt := scanner.Text()
		log.Println("Find indices", cnt)
		lst := strings.Split(cnt, " ")
		idx := lst[2]
		if strings.HasPrefix(idx, "logstash-") {
			date, err := time.Parse("2006.01.02", idx[9:len(idx)])
			if err != nil {
				log.Panicln(err)
			}
			log.Println("Date is", date)
			if time.Now().Sub(date).Hours() > float64(*cN)*24 {
				log.Println("Try to delete it")
				func() {
					req, err := http.NewRequest("DELETE", *cEsURL+"/"+idx, http.NoBody)
					if err != nil {
						log.Panicln(err)
					}
					res, err := http.DefaultClient.Do(req)
					if err != nil {
						log.Panicln(err)
					}
					defer res.Body.Close()
					log.Println("Result", res.Status)
				}()
			}
		}
	}
}
