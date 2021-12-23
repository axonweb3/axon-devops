deploy: 
	ansible-playbook deploy.yml --tags build,shutdown,start 

clean: 
	ansible-playbook deploy.yml --tags shutdown,clean 

start: 
	ansible-playbook deploy.yml --tags start

stop: 
	ansible-playbook deploy.yml --tags shutdown

config: 
	ansible-playbook deploy.yml --tags config
