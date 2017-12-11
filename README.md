# Calendar Service

Google cloud function for managing calendars

To run, execute `node app.js`.

A `.env` file should be placed in the root with the Google Cloud account details:

```
CLIENT_ID=<from-google-api-credentials-page>
CLIENT_SECRET=<from-google-api-credentials-page>
REDIRECT_URI=<path-to-this-server/oauth>
```
