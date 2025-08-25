#!/bin/bash
# Run Act with newgrp docker
echo "🔧 Running Act with newgrp docker..."
newgrp docker -c "act $*"
