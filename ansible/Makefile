all:
	ansible-playbook muta.yml

test:
	ansible muta-dev -m ping

watch:
	watchexec -r -- 'ansible-playbook muta.yml'