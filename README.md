# Australian Acoustic Observatory Tour Microsite

A Hugo microsite for exploring Australian Acoustic Observatory recording sites
and verifying species calls.

## Run Locally

Install Hugo Extended, then create an ignored `.env.local` file containing the
Google Maps environment variables required by the map:

```text
GOOGLE_MAPS_API_KEY=your-google-maps-api-key
GOOGLE_MAPS_MAP_ID=your-google-maps-map-id
```

Start the development server from the project root:

```sh
./hugo-local.sh server
```

Open <https://localhost:1313> in a browser. The wrapper loads `.env.local` and
adds the development-server options used by this site.
