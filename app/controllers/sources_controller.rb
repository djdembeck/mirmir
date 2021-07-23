require 'jaxsta_request'
class SourcesController < ApplicationController
    def new
    end

    def show
        albumID = params[:id]
        # Setup new Jaxsta object with ID
        j = Jaxsta.new
        j.albumID = albumID
        # Call the Jaxsta API and store it as @albumJson
        j.callAPI
        # Put together an array of track hashes
        j.generateTrackListing
        # Parse data that we need into ruby hashes
        j.generateCreditListing
        # Concatenate the track listing with the credits
        j.stitchCreditsWithTracks
        # Set frontend variables from object
        # Raw json response for debug
        @albumJson = j.instance_variable_get(:@albumJson)
        # Parsed response
        @creditsJson = j.instance_variable_get(:@releasesDiscs)
        # Common roles/contrib
        @creditRoles = j.instance_variable_get(:@creditRoles)
    end

    def index
        redirect_to new_source_path
    end

    def create
        # Redirect to show page after getting ID
        redirect_to source_path(params[:id])
    end
end
