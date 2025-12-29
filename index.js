const app = require('./src/app');

const port = process.env.PORT || 3456;
app.listen(port, () => {
    console.log(`🚀 server running at http://localhost:${port}`);
});
