require 'json'
require 'net/http'
require 'yaml'
require './auth.rb'

# Get all track ids from an album
def getTracks(albumID)
	# Main credits URL per track
	uri = URI("https://api.spotify.com/v1/albums/#{albumID}/tracks")

	# Run auth program
	loadAuth("spotify")

	# Set bearer auth token for request
	headers = {
		'Authorization' => "Bearer #{@auth_token}"
	}

	# Set bearer token into request object
	req = Net::HTTP::Get.new uri
	req['Authorization'] = "Bearer #{@auth_token}"

	# Open connection, then send request
	response = Net::HTTP.start(uri.host, uri.port, use_ssl: true) do |http|
		http.request req
	end

	if response.is_a?(Net::HTTPSuccess)
		response_json = JSON.parse(response.body)
	else
		puts "HTTP error"
		puts response.body
		return
	end

	# Return json object
	response_json = JSON.parse(response.body)

	trackIDs = []
	response_json['items'].each do |param|
		trackIDs.append(param['id'])
	end

	processCredits(trackIDs)
end

# Get all credits per track
def getCredits(trackID)
	# Track credits URL
	uri = URI("https://spclient.wg.spotify.com/track-credits-view/v0/experimental/#{trackID}/credits")

	# Set bearer auth token for request
	headers = {
		'Authorization' => "Bearer #{@auth_token}"
	}

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
def processCredits(trackIDs)
	# Loop through each track ID
	trackIDs.each do |id|
		# Print stars to easily differentiate tracks
		puts ('*' * 50)
		fullCredits = getCredits(id)
		puts fullCredits['trackTitle']

		# Loop through all credits per track
		fullCredits['roleCredits'].each do |roleCredit|
			puts "#{roleCredit['roleTitle']}: "

			# Loop through all credits per role
			roleCredit['artists'].each do |artist|
				puts artist['name']
			end
			puts ""
		end
	end
end

# If run from terminal
if __FILE__== $PROGRAM_NAME
	puts "Enter an album ID: "
	albumID = gets.chomp

	getTracks(albumID)
end