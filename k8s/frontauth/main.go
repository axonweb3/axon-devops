package main

import (
	"crypto/tls"
	"encoding/json"
	"flag"
	"io"
	"log"
	"net/http"
	"net/http/httputil"
	"net/url"

	"github.com/mohanson/securecookie"
)

type Output struct {
	Code uint32 `json:"code"`
	Data string `json:"data"`
}

func (o Output) Pack() string {
	b, _ := json.Marshal(o)
	return string(b)
}

type HandleMain struct {
}

func (h *HandleMain) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	switch r.URL.RequestURI() {
	case "/index":
		if v, err := securecookie.GetSecureCookie(r, *flPing); err == nil && v == *flPong {
			http.ServeFile(w, r, "./res/static/index.html")
			return
		} else {
			http.ServeFile(w, r, "./res/static/login.html")
			return
		}
	case "/index.js":
		http.ServeFile(w, r, "./res/static/index.js")
		return
	case "/login.js":
		http.ServeFile(w, r, "./res/static/login.js")
		return
	case "/main.css":
		http.ServeFile(w, r, "./res/static/main.css")
		return
	case "/api/user":
		switch r.Method {
		case "POST":
			var data = &struct {
				Username string `json:"username"`
				Password string `json:"password"`
			}{}
			dec := json.NewDecoder(r.Body)
			if err := dec.Decode(data); err != nil {
				w.WriteHeader(http.StatusBadRequest)
				w.Write([]byte(err.Error()))
				return
			}
			if data.Username != *flUsername || data.Password != *flPassword {
				w.Write([]byte(Output{Code: 400, Data: "Invalid username or password"}.Pack()))
				return
			}
			securecookie.SetSecureCookie(w, *flPing, *flPong)
			w.Write([]byte(Output{Code: 200, Data: "Login success"}.Pack()))
			return
		default:
			w.WriteHeader(http.StatusMethodNotAllowed)
			return
		}
	case "/proxy/dashboard":
		securecookie.SetSecureCookie(w, "app", "dashboard")
		http.Redirect(w, r, "/", http.StatusTemporaryRedirect)
		return
	case "/proxy/kibana":
		securecookie.SetSecureCookie(w, "app", "kibana")
		http.Redirect(w, r, "/api/v1/namespaces/kube-system/services/kibana-logging/proxy/app/kibana", http.StatusTemporaryRedirect)
		return
	case "/proxy/grafana":
		securecookie.SetSecureCookie(w, "app", "grafana")
		http.Redirect(w, r, "/", http.StatusTemporaryRedirect)
		return
	default:
		if v, err := securecookie.GetSecureCookie(r, *flPing); err != nil || v != *flPong {
			http.Redirect(w, r, "/index", http.StatusTemporaryRedirect)
			return
		}
		app, err := securecookie.GetSecureCookie(r, "app")
		if err != nil {
			w.WriteHeader(http.StatusBadRequest)
			w.Write([]byte(err.Error()))
			return
		}
		switch app {
		case "dashboard":
			remote, err := url.Parse(*flDashboardAddress)
			if err != nil {
				log.Panicln(err)
			}
			proxy := httputil.NewSingleHostReverseProxy(remote)
			r.Header.Add("Authorization", "Bearer "+*flKubeToken)
			proxy.ServeHTTP(w, r)
			return
		case "kibana":
			var u string
			if r.URL.Fragment != "" {
				u = *flKibanaAddress + r.URL.Fragment
			} else {
				u = *flKibanaAddress + r.URL.RequestURI()
			}
			log.Println(r.URL, "=>", u)
			q, err := http.NewRequest(r.Method, u, r.Body)
			if err != nil {
				return
			}
			q.Header = r.Header
			q.Header.Add("Authorization", "Bearer "+*flKubeToken)
			p, err := http.DefaultClient.Do(q)
			if err != nil {
				return
			}
			defer p.Body.Close()
			for k, v := range p.Header {
				if k == "Content-Security-Policy" {
					continue
				}
				for _, e := range v {
					w.Header().Add(k, e)
				}
			}
			w.WriteHeader(p.StatusCode)
			io.Copy(w, p.Body)
			return
		case "grafana":
			remote, err := url.Parse(*flGrafana)
			if err != nil {
				log.Panicln(err)
			}
			proxy := httputil.NewSingleHostReverseProxy(remote)
			proxy.ServeHTTP(w, r)
			return
		default:
			w.WriteHeader(http.StatusBadRequest)
			return
		}
	}
}

var (
	flListen           = flag.String("l", "127.0.0.1:8080", "listen address")
	flDashboardAddress = flag.String("dashboard", "http://47.56.233.149:4001", "address of dashboard")
	flKibanaAddress    = flag.String("kibana", "https://47.56.233.149:6443", "address of kibana")
	flGrafana          = flag.String("grafana", "http://10.108.91.160:3000", "address of grafana")
	flKubeToken        = flag.String("token", "", "Token of kubernates client")
	flUsername         = flag.String("user", "user", "user")
	flPassword         = flag.String("pass", "pass", "pass")
	flPing             = flag.String("ping", "ping", "k of secure cookie")
	flPong             = flag.String("pong", "pong", "v of secure cookie")
)

func main() {
	flag.Parse()
	securecookie.Config.SecureKey = "ASdjlka8#@7fdlk(2w9ifdgs@aodfgh5wdf"
	securecookie.Config.CacheDays = 360
	http.DefaultTransport.(*http.Transport).TLSClientConfig = &tls.Config{InsecureSkipVerify: true}
	log.Println("Listen and server on", *flListen)
	if err := http.ListenAndServe(*flListen, &HandleMain{}); err != nil {
		log.Panicln(err)
	}
}
