const SpotifyWebApi = require('spotify-web-api-node');
const express = require('express');
require('dotenv').config();

var spotifyApi = new SpotifyWebApi({
  clientId: process.env.CLIENT_ID,
  clientSecret: process.env.CLIENT_SECRET,
  redirectUri: process.env.REDIRECT_URI,
});

const scopes = [
  'ugc-image-upload',
  'user-read-playback-state',
  'user-modify-playback-state',
  'user-read-currently-playing',
  'streaming',
  'app-remote-control',
  'user-read-email',
  'user-read-private',
  'playlist-read-collaborative',
  'playlist-modify-public',
  'playlist-read-private',
  'playlist-modify-private',
  'user-library-modify',
  'user-library-read',
  'user-top-read',
  'user-read-playback-position',
  'user-read-recently-played',
  'user-follow-read',
  'user-follow-modify'
];

const app = express();

app.get('/login', (req, res) => {
  res.redirect(spotifyApi.createAuthorizeURL(scopes));
});

app.get('/callback', (req, res) => {
  const error = req.query.error;
  const code = req.query.code;
  const state = req.query.state;

  if (error) {
    console.error('Callback Error:', error);
    res.send(`Callback Error: ${error}`);
    return;
  }

  spotifyApi
    .authorizationCodeGrant(code)
    .then(data => {
      const access_token = data.body['access_token'];
      const refresh_token = data.body['refresh_token'];
      const expires_in = data.body['expires_in'];

      spotifyApi.setAccessToken(access_token);
      spotifyApi.setRefreshToken(refresh_token);

      console.log('access_token:', access_token);
      console.log('refresh_token:', refresh_token);

      console.log(
        `Sucessfully retreived access token. Expires in ${expires_in} s.`
      );
      res.send('Success! You can now close the window.');

      setInterval(async () => {
        const data = await spotifyApi.refreshAccessToken();
        const access_token = data.body['access_token'];

        console.log('The access token has been refreshed!');
        console.log('access_token:', access_token);
        spotifyApi.setAccessToken(access_token);
      }, expires_in / 2 * 1000);
    })
    .catch(error => {
      console.error('Error getting Tokens:', error);
      res.send(`Error getting Tokens: ${error}`);
    });
});

app.listen(8888, () =>
  console.log(
    'HTTP Server up. Now go to http://localhost:8888/login in your browser.'
  )
);

app.get('/top-tracks', function(req, res) {
  // Get top tracks!
  spotifyApi.getMyTopTracks()
    .then(function(data) {
      console.log(data)
      console.log(Object.keys(data))
      res.send(data.body);
    }, function(err) {
      console.error(err);
    });
});

app.get('/feature', function(req, res) {
  /* Get Audio Analysis for a Track */
  spotifyApi.getAudioAnalysisForTrack('3Qm86XLflmIXVm1wcwkgDK')
    .then(function(data) {
    console.log(data.body);
  }, function(err) {
    done(err);
  });
});

//function from: https://stackoverflow.com/a/1053865/7044471
const frequent = (array) => {
  if(array.length == 0)
      return null;
  var modeMap = {};
  var maxEl = array[0], maxCount = 1;
  for(var i = 0; i < array.length; i++)
  {
      var el = array[i];
      if(modeMap[el] == null)
          modeMap[el] = 1;
      else
          modeMap[el]++;
      if(modeMap[el] > maxCount)
      {
          maxEl = el;
          maxCount = modeMap[el];
      }
  }
  return maxEl;
};

app.get('/trends', (req, res) => {
  spotifyApi.getMyRecentlyPlayedTracks({ limit: 10 })
  .then((data) => data.body.items.map((item) => item.track.id))
  .then((trackIds) => {
    spotifyApi.getAudioFeaturesForTracks(trackIds).then((data) => {
      const features = data?.body?.audio_features;
      console.log(features[0])
      let danceability = 0, key = [], loudness = 0, valence = 0, tempo = 0, mode = 0, energy = 0, speechiness = 0,
        acousticness = 0, instrumentalness = 0, liveness = 0;
        features.forEach((feature) => {
          danceability += feature.danceability;
          key.push(feature.key);
          loudness += feature.loudness;
          valence += feature.valence;
          tempo += feature.tempo;
          mode += feature.mode;
          energy += feature.energy;
          speechiness += feature.speechiness;
          acousticness += feature.acousticness;
          instrumentalness += feature.instrumentalness;
          liveness += feature.liveness;
        });
        const obj = {
          danceability: danceability / features.length,
          key: frequent(key),
          loudness: loudness / features.length,
          valence: valence / features.length,
          tempo: tempo / features.length,
          mode: Math.round(mode / features.length),
          energy: energy / features.length,
          speechiness: speechiness / features.length,
          acousticness: acousticness / features.length,
          instrumentalness: instrumentalness / features.length,
          liveness: liveness / features.length
        };
        console.log(obj)
        return obj;
    })
  })
});

app.get('/analysis', (req, res) => {
  spotifyApi.getMyRecentlyPlayedTracks({ limit: 50 })
  .then(data => data.body.items[Math.floor(Math.random() * 50)])
  .then(data => {
    spotifyApi.getAudioAnalysisForTrack(data.track.id)
    .then(function(data) {
      console.log(data.body);
      console.log(Object.keys(data.body));
      console.log(Object.keys(data.body.meta));
      const keys = Object.keys(data.body);
      keys.map(key => console.log(`${key}: ${Object.keys(data.body[key])}`));
    }, function(err) {
      done(err);
    });
  })
});
