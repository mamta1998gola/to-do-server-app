### For testing purpose add this middleware in index.js file
````javascript
app.use((req, res, next) => {
    console.log(`${req.method} ${req.url}`);
    console.log('Request headers:', req.headers);
    console.log('Request body:', req.body);
    res.on('finish', () => {
        console.log('Response status:', res.statusCode);
        console.log('Response headers:', res.getHeaders());
    });
    next();
});
````