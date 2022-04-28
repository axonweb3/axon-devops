deploy: 
	ansible-playbook deploy.yml --tags down,config,start 

clean: 
	ansible-playbook deploy.yml --tags down,clean 

start: 
	ansible-playbook deploy.yml --tags start

stop: 
	ansible-playbook deploy.yml --tags down

config: 
	ansible-playbook deploy.yml --tags config
