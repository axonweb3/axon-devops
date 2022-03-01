monitor-deploy:
	ansible-playbook -i hosts deploy_monitor.yml --tags config,down,start 

monitor-clean:
	ansible-playbook -i hosts deploy_monitor.yml --tags down,clean

agent-deploy:
	ansible-playbook -i hosts deploy_monitor_agent.yml --tags config,down,start 

agent-clean:
	ansible-playbook -i hosts deploy_monitor_agent.yml --tags down,clean
