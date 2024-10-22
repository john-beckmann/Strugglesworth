import express from 'express';
import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const hostname = process.env.HOSTNAME;
const port = process.env.PORT;

const app = express();

app.get('/', (req, res) => {
  res.send('Hello, World!');
});

// Start the server on port 3000
app.listen(port, hostname, () => {
  console.log(`Server running at http://${hostname}:${port}/`);
});