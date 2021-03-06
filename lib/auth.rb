@auth_path = File.expand_path("auth.yml", "../config")

def loadAuth(type)
	# Get Bearer token from file
	# Check that auth file exists, create it if not
	if File.exist?(@auth_path)
		auth_file = YAML.load(File.read(@auth_path))
		# Check that bearer exists and has valid length
		if auth_file[type] and auth_file[type].length > 20
			puts "Got auth key"
		else
			generateAuth(type)
		end
	else
		generateAuth(type)
		auth_file = YAML.load(File.read(@auth_path))
	end

	# Set auth variable for calling file
	@auth_token = auth_file[type]
	return @auth_token
end

def generateAuth(type)
	# Check if auth file exists, or if we need to create it
	if File.exist?(@auth_path)
		bearer = YAML.load(File.read(@auth_path))
	else
		bearer = {}
	end

	# Persist promt to make sure user puts something valid
	bearer_input = ''
	until bearer_input.length > 20
		# Ask for user input
		puts "Enter #{type} bearer token: "
		bearer_input = gets.chomp.to_s
		# Set yaml key from type and save file
		bearer[type] = bearer_input
		File.open(@auth_path, "w") { |file| file.write(bearer.to_yaml) }
	end
end