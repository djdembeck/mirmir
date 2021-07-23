require 'rails_helper'
require 'jaxsta_request'

describe Jaxsta do
    before(:all) do
        @album = Jaxsta.new
        @album.albumID = "ce1cff5f-c18d-466c-ac7d-07f00b2826b9"
    end

    describe '.callAPI' do
        it { expect(@album.callAPI).to eq("200") }
    end
end