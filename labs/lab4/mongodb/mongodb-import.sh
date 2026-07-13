npm install mongodb csv-parse yargs
node mongodb-import.js --mongourl "your-mongodb-url" \
--database uscities-microservices --collection uscities --file uscities.csv --format csv
