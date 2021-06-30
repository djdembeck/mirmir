require 'net/http'
require 'json'

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

	# Get Bearer token from file
	auth_token = File.read(".token.txt")

	# Set bearer auth token for request
	headers = {
		'Authorization' => "Bearer #{auth_token}"
	}
	
	# Set params into the uri query object
	uri.query = URI.encode_www_form(params)
	
	# Set bearer token into request object
	req = Net::HTTP::Get.new uri
	req['Authorization'] = "Bearer #{auth_token}"

	# Open connection, then send request
	response = Net::HTTP.start(uri.host, uri.port, use_ssl: true) do |http|
		http.request req
	end
	# Return json prettier object
	return JSON.parse(response.body)
end

def processCredits(credits)
	credits['items'].each do |track|
		puts track['item']['title']
		track['credits'].each do |credit|
			puts ("#{credit['type'].to_s}:")
			credit['contributors'].each do |contributor|
				puts "#{contributor['name']}: https://listen.tidal.com/artist/#{contributor['id']}"
			end
			puts ""
		end
		puts ""
	end
end

puts "Enter an album ID: "
albumID = gets.chomp

processCredits(getCredits(Enter))