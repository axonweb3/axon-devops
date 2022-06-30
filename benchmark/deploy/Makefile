benchmark-start: 
	ansible-playbook deploy.yml --tags stop-benchmark,config,start-benchmark

benchmark-monitor-deploy: 
	ansible-playbook deploy.yml --tags down,monitor-config,start-benchmark-monitor

clean: 
	ansible-playbook deploy.yml --tags down,clean

