require 'json'
require 'net/http'
require 'yaml'
require './auth.rb'

# Get all credits from an album
def getCredits(albumID)
	# Main credits URL
	uri = URI("https://listen.tidal.com/v1/albums/#{albumID}/items/credits")
	
	# Default paramaters that TIDAL web uses
	params = {
		:replace => true,
		:includeContributors => true,
		:offset => 0,
		:limit => 100,
		:countryCode => "US",
		:locale => "en_US",
		:deviceType => "BROWSER"
	}

	# Run auth program
	loadAuth("tidal")

	# Set bearer auth token for request
	headers = {
		'Authorization' => "Bearer #{@auth_token}"
	}

	# Set params into the uri query object
	uri.query = URI.encode_www_form(params)

	# Set bearer token into request object
	req = Net::HTTP::Get.new uri
	req['Authorization'] = "Bearer #{@auth_token}"

	# Open connection, then send request
	response = Net::HTTP.start(uri.host, uri.port, use_ssl: true) do |http|
		http.request req
	end
	# Return json object

	return JSON.parse(response.body)
end

# Display credits per track
def processCredits(credits)
	# Loop through all tracks in an album
	credits['items'].each do |track|
		# Print stars to easily differentiate tracks
		puts ('*' * 50)
		puts ""
		puts track['item']['title']

		# Loop through all credits per track
		track['credits'].each do |credit|
			puts ("#{credit['type'].to_s}:")

			# Loop through all credits per role
			credit['contributors'].each do |contributor|
				puts "#{contributor['name']}: https://listen.tidal.com/artist/#{contributor['id']}"
			end
			puts ""
		end
	end
end

puts "Enter an album ID: "
albumID = gets.chomp

processCredits(getCredits(albumID))