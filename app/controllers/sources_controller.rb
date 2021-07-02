class SourcesController < ApplicationController
  def new
  end

  def show
    albumID = params[:id]
    getTracks = JaxstaRequest.getTracks(albumID)
    @releaseTitle = getTracks[0]
    @creditsJson = getTracks[1]
  end

  def index
  end

  def create
    redirect_to source_path(params[:id])
  end
end
