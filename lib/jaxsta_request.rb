require 'json'
require 'net/http'

module JaxstaRequest
	# Get all track ids from an album
	def self.getTracks(albumID)
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
			# puts "Disc: #{disc['disc']}"
			# Loop into disc tracks
			disc['tracks'].each do |track|
				trackIDs.append(track['recording_id'])
			end
		end
		@releaseTitle = response_json['title']

		processCredits(trackIDs)
	end

	# Get all credits per track
	def self.getCredits(trackID)
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
	def self.processCredits(trackIDs)
		# Loop through each track ID
		trackObjsArr = []
		trackIDs.each do |id|
			@fullCredits = getCredits(id)

			# Loop through all role credits per track
			@fullCredits['role_group_credits'].each do |roleGroup|

				# Loop through all roles per track
				@subRoleArr = []
				roleGroup['role_credits'].each do |roleSubGroup|
					# Loop through all people per role
					personArr = []
					roleSubGroup['credit_list'].each do |person|
						personArr.append(person)
					end
					roleObj = {group: roleSubGroup['role'], persons: personArr}
					@subRoleArr.append(roleObj)
				end
			end
			trackObj = {title: @fullCredits['title'], contribsum: @fullCredits['summary']['contributors'], roles: @subRoleArr}
			trackObjsArr.append(trackObj)
		end
		return @releaseTitle, trackObjsArr
	end

	# If run from terminal
	if __FILE__== $PROGRAM_NAME
		puts "Enter an album ID: "
		albumID = gets.chomp

		getTracks(albumID)
	end
end