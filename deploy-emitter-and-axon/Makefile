axon-deploy: 
        ansible-playbook build.yml --tags build && ansible-playbook  deploy_axon.yml --tags deploy,shutdown,start

emitter-deploy: 
        ansible-playbook build.yml --tags build-emitter && ansible-playbook  deploy_emitter.yml --tags deploy,shutdown,start

axon-clean: 
        ansible-playbook  deploy_axon.yml --tags shutdown,clean 

axon-start: 
        ansible-playbook deploy_axon.yml --tags start

axon-stop: 
        ansible-playbook deploy_axon.yml --tags shutdown

axon-config: 
        ansible-playbook deploy_axon.yml --tags config

axon-build: 
        ansible-playbook build.yml --tags build

emitter-clean: 
        ansible-playbook deploy_emitter.yml --tags shutdown,clean 

emitter-start: 
        ansible-playbook deploy_emitter.yml --tags start

emitter-stop: 
        ansible-playbook deploy_emitter.yml --tags shutdown

emitter-config: 
        ansible-playbook deploy_emitter.yml --tags config

emitter-build: 
        ansible-playbook build.yml --tags build-emitter