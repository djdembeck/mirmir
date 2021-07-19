require 'jaxsta_request'
class SourcesController < ApplicationController
  def new
  end

  def show
    albumID = params[:id]
    j = Jaxsta.new
		j.albumID = albumID
		j.callAPI.generateTrackListing.generateCreditListing.stitchCreditsWithTracks
    # getTracks = JaxstaRequest.getTracks(albumID)
    @albumJson = j.instance_variable_get(:@albumJson)
    @creditsJson = j.instance_variable_get(:@releaseTrackCredits)
  end

  def index
  end

  def create
    redirect_to source_path(params[:id])
  end
end
