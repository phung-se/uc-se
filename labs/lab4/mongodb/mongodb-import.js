/**
 * Node.js program to import a CSV/TSV file into a MongoDB database
 * Original Author: Huu-Ha Nguyen
 * Revised by: Phu Phung
 * Refined by Gemini Code Assistant
 * Latest updated: July 2026
 * Usage: node mongodb-import.js --mongourl [url] --database [db] --collection [collection] --file [path] --format [csv/tsv]
 */
const { MongoClient, ServerApiVersion } = require('mongodb');
const { parse } = require('csv-parse'); 
const fs = require('fs');
const yargs = require('yargs');
const { hideBin } = require('yargs/helpers');

// MongoDB Connection Configuration
const mongoClientOptions = {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
};

/**
 * Main Data Import Function
 * Uses streams to process files of any size without memory issues.
 */
async function importData(mongoURL, database, collection, filePath, format) {
    const client = new MongoClient(mongoURL, mongoClientOptions);
    
    try {
        await client.connect();
        console.log('Successfully connected to MongoDB cluster!');
        
        const db = client.db(database);
        const coll = db.collection(collection);

        // Drop existing collection to start fresh
        try {
            await coll.drop();
            console.log(`Collection '${collection}' has been cleaned up.`);
        } catch (err) {
            if (err.codeName !== 'NamespaceNotFound') throw err;
        }

        console.log(`Importing records from <${filePath}> into '${collection}'...`);

        // Initialize the CSV/TSV parser stream
        const parser = fs.createReadStream(filePath).pipe(
            parse({
                columns: true,
                skip_empty_lines: true,
                delimiter: format === 'tsv' ? '\t' : ',',
                trim: true
            })
        );

        let chunk = [];
        const BATCH_SIZE = 1000; // Optimal batch size for MongoDB inserts
        let totalInserted = 0;

        // Process the stream line-by-line
        for await (const record of parser) {
            chunk.push(record);
            
            // When chunk is full, insert into DB and clear memory
            if (chunk.length >= BATCH_SIZE) {
                const result = await coll.insertMany(chunk);
                totalInserted += result.insertedCount;
                console.log(`...Progress: ${totalInserted} records inserted`);
                chunk = []; 
            }
        }

        // Insert any remaining records in the last chunk
        if (chunk.length > 0) {
            const result = await coll.insertMany(chunk);
            totalInserted += result.insertedCount;
        }

        console.log(`\n✅ Successfully imported ${totalInserted} total records!`);
    } catch (err) {
        console.error('\n❌ Error during MongoDB operation:', err.message);
        throw err;
    } finally {
        await client.close();
        console.log('MongoDB connection closed.');
    }
}

// Command Line Arguments Configuration (Modern Yargs Syntax)
const argv = yargs(hideBin(process.argv))
    .usage('Usage: node $0 --mongourl [url] --database [db] --collection [collection] --file [path] --format [csv/tsv]')
    .demandOption(['mongourl', 'collection', 'file', 'format'])
    .option('mongourl', {
        alias: 'm',
        describe: 'MongoDB connection URL',
        type: 'string'
    })
    .option('database', {
        alias: 'd',
        describe: 'Database name',
        type: 'string',
        default: 'test'
    })
    .option('collection', {
        alias: 'c',
        describe: 'Collection name',
        type: 'string'
    })
    .option('file', {
        alias: 'F',
        describe: 'Path to the data file',
        type: 'string'
    })
    .option('format', {
        alias: 'f',
        describe: 'File format',
        choices: ['csv', 'tsv']
    })
    .parse(); // Triggers the parsing logic

// Execution Block
(async () => {
    try {
        // Check file existence before starting
        if (!fs.existsSync(argv.file)) {
            console.error(`\nFile path is invalid. Please check if <${argv.file}> exists!`);
            process.exit(1);
        }

        console.log('--------------------------------------------------');
        console.log(`MongoDB Import Task`);
        console.log('--------------------------------------------------');

        await importData(
            argv.mongourl, 
            argv.database, 
            argv.collection, 
            argv.file, 
            argv.format
        );
        
    } catch (err) {
        process.exit(1);
    }
})();