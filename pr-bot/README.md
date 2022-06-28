# Deploy pr-bot

This project is used to alert the review of pull requests during development 

Requires nodejs、yarn
## Configuration of the deployment

### Step 1
```shell
$ cd axon-devops/pr-bot
```

### Step 2

```shell
$ vim config.json 
```

Editor config.json

```conf
{
  "repos": [
    {
      "onwer": "nervosnetwork",
      "repo":"axon"
    }
  ],
  "id": "936501604767629344",
  "token": "",
  "time_interval_for_notification": "2"
}
                                               
```
#### repo
A case of a repo address
```http
https://github.com/nervosnetwork/axon-devops
```
nervosnetwork = "onwer": "nervosnetwork"

axon-devops = "repo":"axon"

--------------------------------

#### discord webhook

`id`: discord webhook's id

`token` discord webhook's token

`time_interval_for_notification` push interval in hours

--------------------------------


## Instructions for use
### start
```shell
$ yarn start
```

### stop
```shell
$ yarn stop
```
