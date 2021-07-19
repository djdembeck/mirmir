require 'json'
require 'net/http'

class Jaxsta
	attr_accessor :albumID

	def callAPI
		# This function will call the Jaxsta API and store it as @albumJson

		# Main credits URL per track
		albumURI = URI("https://api.jaxsta.io/catalog/release-variant/#{@albumID}")

		# Open connection, then send request
		req = Net::HTTP::Get.new albumURI
		response = Net::HTTP.start(albumURI.host, albumURI.port, use_ssl: true) do |http|
			http.request req
		end

		# Verify successful response from http
		if response.is_a?(Net::HTTPSuccess)
			@albumJson = JSON.parse(response.body)
		else
			puts "HTTP error"
			puts response.body
			return
		end

		return self
	end

	def generateTrackListing
		# From the initial JSON response,
		# this function will put together an array of track hashes

		# Prepare array to hold disc objects
		@releasesDiscs = []
		# Traverse through discs
		@albumJson['track_list'].each do |disc|
			# Prepare array to hold track objects
			tracksInDiscArr = []
			# Traverse through tracks
			disc['tracks'].each do |track|
				# Generate an object with data we want
				trackObject = {number: track['track'], title: track['title'], duration: track['duration']}
				tracksInDiscArr.append(trackObject)
			end
			# Set disc number, and append it's tracks
			trackListingByDisc = {disc: disc['disc'], tracks: tracksInDiscArr}
			@releasesDiscs.append(trackListingByDisc)
		end
		
		return self
	end

	def generateCreditListing
		# From the initial JSON response,
		# this function will parse data that we need into ruby hashes

		# Start an array to hold roles
		@creditRoles = []

		# Start array to hold tracks with their credits
		@releaseTrackCredits = []
		# Traverse into each role
		@albumJson['role_group_credits'].each do |grandparent|
			# Traverse into each roles' credits
			grandparent['role_credits'].each do |parent|
				@creditRoles.append({role: parent['role'], credits: []})
				roleCredits = []
				# Traverse through the person of each credit grouping
				parent['credit_list'].each do |child|
					discCreditArr = []
					# Only iterate through contributions if it exists
					if child['contribution']
						child['contribution'].each do |contrib|
							# Only keep the disc (as integer) and track data
							discCreditObject = {disc: contrib['disc'][0].to_i, tracks: contrib['track']}
							discCreditArr.append(discCreditObject)
						end
						# Finalized object for this contributor
						trackCreditObject = {name: child['name'], contribution: discCreditArr, role: parent['role']}
						@releaseTrackCredits.append(trackCreditObject)
					end
				end
			end
		end

		return self
	end
	
	def stitchCreditsWithTracks
		# This function will concatenate the track listing with the credits
		# in a way that is easily parseable on the frontend
		
		# Start an array with common contributors
		commonContributors = []
		# Traverse through track credits
		@releaseTrackCredits.each do |credit|
			credit[:contribution].each do |discContrib|
				if discContrib[:tracks].length > 1
					puts "#{credit[:name]} is credited as #{credit[:role]} #{discContrib[:tracks].length} times"
					findRole = @creditRoles.find {|x| x[:role] == credit[:role] }
					findRole[:credits].append({name: credit[:name], credits: discContrib})
				end
				discContrib[:tracks].each do |trackContrib|
					# Make array of contributors if it doesnt' exist
					if !@releasesDiscs[discContrib[:disc] - 1][:tracks][trackContrib - 1][:contributors]
						@releasesDiscs[discContrib[:disc] - 1][:tracks][trackContrib - 1][:contributors] = []
					else
						# Append a hash with name and role, to the relevant track in tracklisting
						@releasesDiscs[discContrib[:disc] - 1][:tracks][trackContrib - 1][:contributors].append({name: credit[:name], role: credit[:role]})
					end
				end
			end
		end
		
		p @creditRoles
		return self
	end
end

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
			@albumJson = JSON.parse(response.body)
			p @albumJson
		else
			puts "HTTP error"
			puts response.body
			return
		end

		trackIDs = []
		# Start loop into tracklisting
		@albumJson['track_list'].each do |disc|
			# puts "Disc: #{disc['disc']}"
			# Loop into disc tracks
			disc['tracks'].each do |track|
				trackIDs.append(track['recording_id'])
			end
		end

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
		return @albumJson, trackObjsArr
	end

	# If run from terminal
	if __FILE__== $PROGRAM_NAME
		puts "Enter an album ID: "
		albumID = gets.chomp
		j = Jaxsta.new
		j.albumID = albumID
		j.callAPI.generateTrackListing.generateCreditListing.stitchCreditsWithTracks
	end
end