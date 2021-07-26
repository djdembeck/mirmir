require 'rails_helper'
require 'jaxsta_request'

describe Jaxsta do
    before(:all) do
        # Create object with a known ID
        @album = Jaxsta.new
        @album.albumID = "ce1cff5f-c18d-466c-ac7d-07f00b2826b9"
    end

    # Make these available to all tests
    let(:albumID) { @album.instance_variable_get(:@albumID) }
    let(:albumJson) { @album.instance_variable_get(:@albumJson) }
    let(:releasesDiscs) { @album.instance_variable_get(:@releasesDiscs) }

    describe '.callAPI' do
        # Check that ID was set correctly
        it { expect(albumID).to eq("ce1cff5f-c18d-466c-ac7d-07f00b2826b9") }
        # Check HTTP response code is OK
        it { expect(@album.callAPI).to eq("200") }

        # Check that albumJson exists
        it { expect(albumJson).to be }
        # Check that the title value is what we want
        it { expect(albumJson['title']).to eq("A Muse In Her Feelings") }
        # Check release date
        it { expect(albumJson['release_date']).to eq("2020-04-17") }

        let(:summary) { albumJson['summary'] }
        # Check UPC
        it { expect(summary['upc']).to eq("093624894810") }
        # Check release type
        it { expect(summary['release_type']).to eq("Album") }
        # Check number of contributor groups
        it { expect(summary['contributors'].length).to eq(8) }
        # Check release medium
        it { expect(summary['release_variant_medium']).to eq("Digital") }

        # Check that release has 1 disc
        it { expect(albumJson['track_list'].length).to eq(1) }
        # Chec that disc is structured as we expect
        it { expect(albumJson['track_list'][0]['disc']).to eq("1") }

        let(:track_list) { albumJson['track_list'][0]['tracks'] }
        # Check that release has 16 tracks
        it { expect(track_list.length).to eq(16) }
        # Check that first track structured as we expect
        it { expect(track_list[0]['duration']).to eq("03:35") }
        # Subtitle should be empty
        it { expect(track_list[0]['subtitle']).to be_nil }
        # Check for expected track title
        it { expect(track_list[0]['title']).to eq("No Good") }
        # Check expected track number
        it { expect(track_list[0]['track']).to eq("1") }

        let(:role_group) { albumJson['role_group_credits'] }
        # Check role groups to be 8
        it { expect(role_group.length).to eq(8) }
        # Check first role group
        # Check that role name is correct
        it { expect(role_group[1]['role_group']).to eq("Featured Artist") }
        # Check contributor details
        let(:credit_list) { role_group[1]['role_credits'][0]['credit_list'][1] }
        it { expect(credit_list['name']).to eq("Future") }
        # Check featured on which tracks
        let(:contribution) { credit_list['contribution'][0] }
        it { expect(contribution['disc'][0]).to eq("1") }
        it { expect(contribution['track'][0]).to eq(6) }
        # Check GUID of contributor
        it { expect(credit_list['entity_id']).to eq("f5989706-2fd4-4e65-a947-5a2f328cef8f") }
    end

    describe '.generateTrackListing' do
        before(:all) do
            @album.callAPI
            @album.generateTrackListing
        end
        # Check that releasesDiscs exists
        it { expect(releasesDiscs).to be }
        # Check data from track 1
        let(:track_1) { releasesDiscs[0][:tracks][0] }
        it { expect(track_1[:credits]).to eq([]) }
        it { expect(track_1[:duration]).to eq("03:35") }
        it { expect(track_1[:number]).to eq("1") }
        it { expect(track_1[:title]).to eq("No Good") }
    end

    describe '.generateCreditListing' do
        before(:all) do
            @album.callAPI
            @album.generateCreditListing
        end

        # Setup testing variable
        let(:releaseTrackCredits) { @album.instance_variable_get(:@releaseTrackCredits) }

        # Check that releaseTrackCredits exists
        it { expect(releaseTrackCredits).to be }

        # Check how many credits we get back
        it { expect(releaseTrackCredits.length).to eq(167) }

        # Check data from a specific credit
        let(:credit) { releaseTrackCredits[69] }
        it { expect(credit[:contribution][0][:disc]).to eq(1) }
        it { expect(credit[:contribution][0][:tracks].length).to eq(14) }
        it { expect(credit[:entity_id]).to eq("61f0b5c3-1d03-4c43-baf4-db1748a99779") }
        it { expect(credit[:name]).to eq("Nineteen85") }
        it { expect(credit[:role]).to eq("Producer") }
    end
end