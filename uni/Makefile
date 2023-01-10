v2-deploy: 
	ansible-playbook deploy_v2.yml --tags stop,v2-contract,v2-interface,start

v2-start: 
	ansible-playbook deploy_v2.yml --tags start

v2-stop: 
	ansible-playbook deploy_v2.yml --tags stop

v3-deploy: 
	ansible-playbook -v deploy_v3.yml --tags v3-contract

