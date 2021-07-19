# Mirmir
[![CodeFactor](https://www.codefactor.io/repository/github/djdembeck/mirmir/badge)](https://www.codefactor.io/repository/github/djdembeck/mirmir)

A tool written in Ruby on Rails, to seed MusicBrainz track relationships with data from Jaxsta track credits.

NOTE: Currently, this is only a data display tool, until I can determine the best course of action for seeding MB either through API, scraping or automation tools.

## Purpose
The goal here is to make rich track-level credits easy to add to MusicBrainz, which is the upstream metadata source of many online music services. What the final product of seeding this data looks like can be seen here:
https://musicbrainz.org/release/eecba6f1-67dc-45d6-942d-15e329d7886e

But doing a release like that, can take *hours*. As such, this project aims to simplify the process by:
- Clearly displaying relevant data, and nothing else
- Presenting a format in which the data is easy to copy for manual data entry.
- In the future, seeding this data into the appropriate fields, and only requiring the user to verify data accuracy.

## Running

### Requirements
- Ruby 3.0.1 or later

A great guide on setting up the requirements for setup, can be foundhere: https://gorails.com/setup/ubuntu/21.04#overview

### Setup
Getting up and running is pretty straightforward. From the project directory:
- `gem install bundler`
- `bundle install`
- `rails s -b 127.0.0.1`
- Open a browser to `127.0.0.1:3000`
## Notes

Tidal/Spotify methods are also written but not exposed (Bearer can be retrieved from developer tools->network->name:events->request headers)