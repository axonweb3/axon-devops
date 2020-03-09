var app = new Vue({
    el: '#main',
    data: {
        username: '',
        password: '',
        code: 0,
        data: '',
    },
    methods: {
        submit: function (event) {
            axios
                .post("/api/user", { "username": this.username, "password": this.password })
                .then(r => {
                    this.code = r.data.code;
                    this.data = r.data.data;
                    if (this.code === 200) {
                        location.reload(true);
                    }
                })
                .catch(e => { console.log(r) });
        }
    }
})
