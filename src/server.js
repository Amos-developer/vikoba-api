import express from 'express';

const PORT = process.env.PORT || 3000;
const app = express();
app.use(express.json());

app.get("/", (req, res) =>{
    res.json({
        message: "Vikoba API is running"
    });
});

app.listen(PORT,()=>{
    console.log(`Server is running on port ${PORT}`);
});