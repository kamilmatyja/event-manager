const express = require('express');
const cors = require('cors');
const config = require('./config');
const apiRoutes = require('./routes');
const errorHandler = require('./middleware/errorHandler');
const swaggerUi = require('swagger-ui-express');
const swaggerSpec = require('./config/swaggerConfig');
const db = require('./db/knex');

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({extended: true}));

app.get('/', (req, res) => {
    res.send('Event App Backend is running!');
});

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

app.use('/api/v1', apiRoutes);

app.use(errorHandler);

async function runMigrations() {
    console.log('Attempting to run database migrations...');
    try {
        await db.migrate.latest();
        console.log('Database migrations completed successfully.');
    } catch (error) {
        console.error('-----------------------------------------');
        console.error(' FATAL: Error running database migrations:');
        console.error(error);
        console.error('-----------------------------------------');
        process.exit(1);
    }
}

if (process.env.NODE_ENV !== 'test') {
    async function startApp() {
        await runMigrations();
        app.listen(config.port, () => {
            console.log(`-----------------------------------------`);
            console.log(` Server listening on port ${config.port}`);
            console.log(`Swagger UI available at http://localhost:${config.port}/api-docs`);
            console.log(`-----------------------------------------`);
        });
    }

    startApp().catch(error => {
        console.error('-----------------------------------------');
        console.error(' FATAL: Failed to start server:');
        console.error(error);
        console.error('-----------------------------------------');
        process.exit(1);
    });
}

module.exports = app;