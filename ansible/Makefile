all: init_server init_project start_chain
	@echo "done"

create_user:
	ansible-playbook create_user.yml

init_server:
	ansible-playbook init_server.yml

init_project:
	ansible-playbook init_project.yml

start_chain:
	ansible-playbook start_chain.yml

test:
	ansible muta-dev -m ping