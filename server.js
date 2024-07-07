const app = require("./app");
const { connectDatabase } = require("./config/database");
const cloudinary = require("cloudinary");
require("dotenv").config();

connectDatabase();

/*cloudinary.v2.config({
    cloud_name: process.env.CLOUDINARY_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
})*/

cloudinary.v2.config({
    cloud_name: "dj3cekdos",
    api_key: "392824624129147",
    api_secret: "bSF1_Dmc-sOrLl32wqme4btdumI",
});

app.listen(process.env.PORT, () => {
    console.log(`Server is running on port ${process.env.PORT}`);
})