require 'json'
require 'net/http'

# Get all track ids from an album
def getTracks(albumID)
	# Main credits URL per track
	albumURI = URI("https://api.jaxsta.io/catalog/release-variant/#{albumID}")

	# Open connection, then send request
	req = Net::HTTP::Get.new albumURI
	response = Net::HTTP.start(albumURI.host, albumURI.port, use_ssl: true) do |http|
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
	# Start loop into tracklisting
	response_json['track_list'].each do |disc|
		puts "Disc: #{disc['disc']}"
		# Loop into disc tracks
		disc['tracks'].each do |track|
			trackIDs.append(track['recording_id'])
		end
	end

	processCredits(trackIDs)
end

# Get all credits per track
def getCredits(trackID)
	# Track credits URL
	creditURI = URI("https://api.jaxsta.io/catalog/recording/#{trackID}")

	# Open connection, then send request
	req = Net::HTTP::Get.new creditURI
	response = Net::HTTP.start(creditURI.host, creditURI.port, use_ssl: true) do |http|
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
		# Show contributor summary count
		puts fullCredits['title']
		fullCredits['summary']['contributors'].each do |contribCount|
			puts "#{contribCount['role_group']}: #{contribCount['count']}"
		end
		puts ('*' * 50)

		# Loop through all role credits per track
		fullCredits['role_group_credits'].each do |roleGroup|
			puts ('*' * 10)
			puts "#{roleGroup['role_group']}: "
			puts ('*' * 10)

			# Loop through all roles per track
			roleGroup['role_credits'].each do |roleSubGroup|
				puts ""
				puts "#{roleSubGroup['role']}: "
				# Loop through all people per role
				roleSubGroup['credit_list'].each do |person|
					puts person['name']
				end
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