require 'rails_helper'
require 'jaxsta_request'

describe Jaxsta do
    context 'single disc release' do
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
            # Check that disc is structured as we expect
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

        describe '.stitchCreditsWithTracks' do
            before(:all) do
                @album.callAPI
                @album.generateTrackListing
                @album.generateCreditListing
                @album.stitchCreditsWithTracks
            end

            # Setup testing variable
            let(:creditRoles) { @album.instance_variable_get(:@creditRoles) }

            # Check that creditRoles has 14 role groups
            it { expect(creditRoles.length).to eq(14) }
            it { expect(creditRoles[0][:role]).to eq("Writer") }
            it { expect(creditRoles[0][:credits].length).to eq(9) }
        end

        describe '.attachContributorsToTracks' do
            before(:all) do
                @album.callAPI
                @album.generateTrackListing
                @album.generateCreditListing
                @album.stitchCreditsWithTracks
            end

            # Setup testing variables
            let(:disc) { releasesDiscs[0] }
            let(:tracks) { disc[:tracks] }

            # Check disc number
            it { expect(disc[:disc]).to eq("1") }
            # Check that there are 16 tracks
            it { expect(tracks.length).to eq(16) }
            # Check credit length
            it { expect(tracks[0][:credits].length).to eq(12) }
            # Check first contributor data
            it { expect(tracks[0][:credits][0][:contributors][0][:entity_id]).to eq("5e52ae0e-17ee-40ec-8a26-bf9dec6c04ff") }
            it { expect(tracks[0][:credits][0][:contributors][0][:name]).to eq("D. Daley") }
            # Check track metadata
            it { expect(tracks[0][:duration]).to eq("03:35") }
            it { expect(tracks[0][:number]).to eq("1") }
            it { expect(tracks[0][:title]).to eq("No Good") }
        end
    end

    context 'multi-disc release' do
        before(:all) do
            # Create object with a known ID
            @album = Jaxsta.new
            @album.albumID = "3d27c60d-6282-5b0a-a4c7-613735102e4e"
        end

        # Make these available to all tests
        let(:albumID) { @album.instance_variable_get(:@albumID) }
        let(:albumJson) { @album.instance_variable_get(:@albumJson) }
        let(:releasesDiscs) { @album.instance_variable_get(:@releasesDiscs) }

        describe '.callAPI' do
            # Check that ID was set correctly
            it { expect(albumID).to eq("3d27c60d-6282-5b0a-a4c7-613735102e4e") }
            # Check HTTP response code is OK
            it { expect(@album.callAPI).to eq("200") }

            # Check that albumJson exists
            it { expect(albumJson).to be }
            # Check that the title value is what we want
            it { expect(albumJson['title']).to eq("F*CK LOVE (SAVAGE)") }
            # Check release date
            it { expect(albumJson['release_date']).to eq("2020-11-06") }

            let(:summary) { albumJson['summary'] }
            # Check UPC
            it { expect(summary['upc']).to eq("886448880035") }
            # Check release type
            it { expect(summary['release_type']).to eq("Album") }
            # Check number of contributor groups
            it { expect(summary['contributors'].length).to eq(9) }
            # Check release medium
            it { expect(summary['release_variant_medium']).to eq("Digital") }

            # Check that release has 2 discs
            it { expect(albumJson['track_list'].length).to eq(2) }
            # Check that disc is structured as we expect
            it { expect(albumJson['track_list'][0]['disc']).to eq("1") }
            it { expect(albumJson['track_list'][1]['disc']).to eq("2") }

            let(:track_list_d1) { albumJson['track_list'][0]['tracks'] }
            let(:track_list_d2) { albumJson['track_list'][1]['tracks'] }
            # Disc 1 checks
            # Check that disc 1 has 7 tracks
            it { expect(track_list_d1.length).to eq(7) }
            # Check that first track structured as we expect
            it { expect(track_list_d1[0]['duration']).to eq("02:13") }
            # Subtitle should be empty
            it { expect(track_list_d1[0]['subtitle']).to be_nil }
            # Check for expected track title
            it { expect(track_list_d1[0]['title']).to eq("PIKACHU") }
            # Check expected track number
            it { expect(track_list_d1[0]['track']).to eq("1") }

            # Disc 2 checks
            # Check that disc 2 has 7 tracks
            it { expect(track_list_d2.length).to eq(15) }
            # Check that first track structured as we expect
            it { expect(track_list_d2[1]['duration']).to eq("02:54") }
            # Subtitle should be empty
            it { expect(track_list_d2[1]['subtitle']).to be_nil }
            # Check for expected track title
            it { expect(track_list_d2[1]['title']).to eq("MAYBE") }
            # Check expected track number
            it { expect(track_list_d2[1]['track']).to eq("2") }

            let(:role_group) { albumJson['role_group_credits'] }
            # Check role groups to be 8
            it { expect(role_group.length).to eq(9) }
            # Check first role group
            # Check that role name is correct
            it { expect(role_group[1]['role_group']).to eq("Featured Artist") }
            # Check contributor details
            let(:credit_list) { role_group[1]['role_credits'][0]['credit_list'][1] }
            it { expect(credit_list['name']).to eq("Internet Money") }
            # Check featured on which tracks
            let(:contribution) { credit_list['contribution'][0] }
            it { expect(contribution['disc'][0]).to eq("1") }
            it { expect(contribution['track'][0]).to eq(3) }
            # Check GUID of contributor
            it { expect(credit_list['entity_id']).to eq("e28a4928-8a49-5ccb-9568-fbb51f91b4b1") }
        end
    end
end