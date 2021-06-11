import express from 'express';

const app = express();

app.get('/', (req, res) => {
    res.send('Well done mate!');
})

app.listen(3000, () => {
    console.log('The application is listening on port 3000!');
})