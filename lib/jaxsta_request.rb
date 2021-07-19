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
				trackObject = {number: track['track'], title: track['title'], duration: track['duration'], credits: []}
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

		# Start array to hold tracks with their credits
		@releaseTrackCredits = []
		# Traverse into each role
		@albumJson['role_group_credits'].each do |grandparent|
			# Traverse into each roles' credits
			grandparent['role_credits'].each do |parent|
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
						trackCreditObject = {name: child['name'], contribution: discCreditArr, role: parent['role'], entity_id: child['entity_id']}
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

		@creditRoles = []
		
		# Start an array with common contributors
		commonContributors = []
		# Traverse through track credits
		@releaseTrackCredits.each do |credit|
			credit[:contribution].each do |discContrib|
				if discContrib[:tracks].length > 1
					findRole = @creditRoles.find {|x| x[:role] == credit[:role] }
					# If the role group exists, append to it, else create it
					if findRole
						findRole[:credits].append({name: credit[:name], credits: discContrib})
					else
						@creditRoles.append({role: credit[:role], credits: [{name: credit[:name], credits: discContrib}]})
					end
				end
				discContrib[:tracks].each do |trackContrib|
					# Select index - 1 to find disc, :tracks hash, track number index - 1, contributor hash, role
					selectedTrack = @releasesDiscs[discContrib[:disc] - 1][:tracks][trackContrib - 1][:credits]
					# Search for role group to append contributor to
					findRoleGroup = selectedTrack.find {|x| x[:role] == credit[:role] }

					# Hashes to append
					creditHashToAppend = {name: credit[:name], entity_id: credit[:entity_id]}
					# Make array of contributors if it doesnt' exist
					if ! findRoleGroup
						selectedTrack.append({role: credit[:role], contributors: []})
						#TODO: don't like re-searching this
						findRoleGroup = selectedTrack.find {|x| x[:role] == credit[:role] }
						findRoleGroup[:contributors].append(creditHashToAppend)
					else
						# Append a hash with name and role, to the relevant track in tracklisting
						findRoleGroup[:contributors].append(creditHashToAppend)
					end
				end
			end
		end
		
		return self
	end
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